import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app.js';
import { readConfig } from '../config/env.js';
import { connectDatabase } from '../config/database.js';
import { AiDocument, AiQuiz, AiAttempt } from '../models/ai-quiz.js';
import { extractPdf, pdfWorkerEnvironment } from '../services/pdf-text.js';
import { generateQuestions, validateGeneratedQuiz, assertSufficientContent, quizConfiguration } from '../services/ai-question-generator.js';
import { expireAttempts, finalizeAttempt } from '../services/ai-attempts.js';
import { lecturePdf, lectureText } from './helpers/lecture-pdf.js';
import { fixtureQuestions } from './helpers/ai-questions.js';

let mongo, app, student, other, instructor, documentId, quizId, attemptId;
const settings = { questionCount: 5, difficulty: 'Medium', durationMinutes: 5 };
// This provider double is used ONLY in tests. Production always calls Gemini.
const send = (agent, method, path) => agent[method]('/api/ai-quizzes' + path).set('X-Learnova-Request', '1');
before(async () => {
  mongo = await MongoMemoryServer.create(); await connectDatabase(mongo.getUri());
  const config = readConfig({ NODE_ENV: 'test', MONGODB_URI: mongo.getUri(), JWT_SECRET: randomBytes(48).toString('hex') });
  app = createApp(config, { aiEnv: {}, quizGenerator: async ({ questionCount }) => ({ questions: fixtureQuestions(questionCount), model: 'test-provider-only' }) });
  for (const [role, email, assign] of [['student', 'ai-student@test.example', a => student = a], ['student', 'ai-other@test.example', a => other = a], ['instructor', 'ai-instructor@test.example', a => instructor = a]]) {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').set('X-Learnova-Request', '1').send({ name: 'AI Test User', email, password: 'Isolated-test-password-42', role, terms: true }).expect(201); assign(agent);
  }
}, { timeout: 180000 });
after(async () => { await mongoose.disconnect(); if (mongo) await mongo.stop(); });

test('real PDF text extraction and scanned, invalid, or unsupported PDF rejection', async () => {
  const parsed = await extractPdf(lecturePdf());
  assert.equal(parsed.pages, 1); assert.match(parsed.text, /Authentication\s+verifies identity/);
  await assert.rejects(extractPdf(lecturePdf('')), /Scanned PDFs need OCR/);
  await assert.rejects(extractPdf(Buffer.from('not a pdf')), /valid PDF/);
  await assert.rejects(extractPdf(Buffer.from('%PDF-damaged')), /could not be read/);
});
test('AI routes require authentication and student role', async () => {
  await send(request(app), 'get', '/documents').expect(401);
  await send(instructor, 'get', '/documents').expect(403);
  const status = await send(student, 'get', '/status').expect(200);
  assert.equal(status.body.configured, false);
});
test('PDF upload saves private text and returns only owner metadata; duplicates reuse the document', async () => {
  await send(student, 'post', '/documents').attach('file', Buffer.from('bad'), 'lecture.txt').expect(422);
  const uploaded = await send(student, 'post', '/documents').attach('file', lecturePdf(), { filename: 'lecture.pdf', contentType: 'application/pdf' }).expect(201);
  documentId = uploaded.body.document.id;
  assert(!JSON.stringify(uploaded.body).includes('Authentication verifies'));
  assert.equal(uploaded.body.document.pages, 1);
  const again = await send(student, 'post', '/documents').attach('file', lecturePdf(), 'lecture.pdf').expect(201);
  assert.equal(again.body.document.id, documentId);
  assert.equal(await AiDocument.countDocuments(), 1);
  assert.equal((await AiDocument.findById(documentId)).text, undefined);
  await send(other, 'get', `/documents/${documentId}`).expect(404);
  await send(other, 'post', `/documents/${documentId}/generate`).send(settings).expect(404);
});
test('generation validates configuration, preserves existing assessments, and conceals answer keys', async () => {
  await send(student, 'post', `/documents/${documentId}/generate`).send({ ...settings, questionCount: 6 }).expect(422);
  await send(student, 'post', `/documents/${documentId}/generate`).send({ ...settings, difficulty: 'Impossible' }).expect(422);
  const result = await send(student, 'post', `/documents/${documentId}/generate`).send(settings).expect(201);
  quizId = result.body.quiz.id;
  assert(!('questions' in result.body.quiz));
  assert.equal((await AiQuiz.findById(quizId)).questions, undefined);
  assert.equal(await mongoose.connection.db.collection('quizattempts').countDocuments(), 0);
  await send(other, 'get', `/quizzes/${quizId}`).expect(404);
});
test('concurrent start requests share one active attempt; backend starts and owns the clock', async () => {
  const requestId = randomUUID();
  const results = await Promise.all([send(student, 'post', `/quizzes/${quizId}/attempts`).send({ requestId }), send(student, 'post', `/quizzes/${quizId}/attempts`).send({ requestId })]);
  assert(results.every(r => r.status === 201));
  assert.equal(results[0].body.attempt.id, results[1].body.attempt.id);
  attemptId = results[0].body.attempt.id;
  assert.equal(Date.parse(results[0].body.attempt.deadline) - Date.parse(results[0].body.attempt.startedAt), 300000);
  for (const q of results[0].body.questions) { assert(!('answer' in q)); assert(!('explanation' in q)); assert(!('sourceQuote' in q)); }
  assert.equal(await AiAttempt.countDocuments(), 1);
  await send(other, 'get', `/attempts/${attemptId}`).expect(404);
  await send(other, 'patch', `/attempts/${attemptId}/answers`).send({ questionIndex: 0, answer: 0 }).expect(404);
  await send(other, 'post', `/attempts/${attemptId}/submit`).send({}).expect(404);
});
test('answer navigation and refresh preserve saved answers and original deadline', async () => {
  const before = await send(student, 'get', `/attempts/${attemptId}`).expect(200);
  await send(student, 'patch', `/attempts/${attemptId}/answers`).send({ questionIndex: 0, answer: 0 }).expect(200);
  await send(student, 'patch', `/attempts/${attemptId}/answers`).send({ questionIndex: 1, answer: 2 }).expect(200);
  await send(student, 'patch', `/attempts/${attemptId}/answers`).send({ questionIndex: 5, answer: 0 }).expect(422);
  await send(student, 'patch', `/attempts/${attemptId}/answers`).send({ questionIndex: 0, answer: 4 }).expect(422);
  const refreshed = await send(student, 'get', `/attempts/${attemptId}`).expect(200);
  assert.deepEqual(refreshed.body.attempt.answers, [0, 2, null, null, null]);
  assert.equal(refreshed.body.attempt.deadline, before.body.attempt.deadline);
  const resumed = await send(student, 'post', `/quizzes/${quizId}/attempts`).send({ requestId: randomUUID() }).expect(201);
  assert.equal(resumed.body.attempt.id, attemptId);
  assert(!JSON.stringify(refreshed.body.questions).includes('explanation'));
});
test('submission is atomic and idempotent; only server scores and submitted reviews are exposed', async () => {
  await send(student, 'post', `/attempts/${attemptId}/submit`).send({ percentage: 100 }).expect(422);
  const results = await Promise.all([send(student, 'post', `/attempts/${attemptId}/submit`).send({}), send(student, 'post', `/attempts/${attemptId}/submit`).send({})]);
  for (const r of results) { assert.equal(r.status, 200); assert.equal(r.body.attempt.percentage, 20); assert.equal(r.body.attempt.correct, 1); assert.equal(r.body.attempt.incorrect, 1); assert.equal(r.body.attempt.unanswered, 3); assert.equal(r.body.attempt.status, 'submitted'); assert.equal(r.body.questions[0].answer, 0); }
  assert.equal(results[0].body.attempt.submittedAt, results[1].body.attempt.submittedAt);
  await send(student, 'patch', `/attempts/${attemptId}/answers`).send({ questionIndex: 2, answer: 0 }).expect(409);
  const history = await send(student, 'get', '/history').expect(200);
  assert.equal(history.body.total, 1); assert.equal(history.body.attempts[0].percentage, 20);
  assert.equal((await send(other, 'get', '/history')).body.total, 0);
});
test('expired attempts reject late answers, submit automatically, and survive backend restarts', async () => {
  const started = await send(student, 'post', `/quizzes/${quizId}/attempts`).send({ requestId: randomUUID() }).expect(201);
  const attempt = started.body.attempt;
  await send(student, 'patch', `/attempts/${attempt.id}/answers`).send({ questionIndex: 0, answer: 0 }).expect(200);
  const deadline = new Date(Date.now() - 1000);
  await AiAttempt.updateOne({ _id: attempt.id }, { $set: { startedAt: new Date(deadline - 300000), deadline } });
  await send(student, 'patch', `/attempts/${attempt.id}/answers`).send({ questionIndex: 1, answer: 0 }).expect(409);
  const result = await send(student, 'get', `/attempts/${attempt.id}`).expect(200);
  assert.equal(result.body.attempt.timedOut, true); assert.equal(result.body.attempt.percentage, 20); assert.equal(result.body.attempt.timeTakenSeconds, 300);
  assert.equal(result.body.attempt.submittedAt, deadline.toISOString());
  const extra = await send(student, 'post', `/quizzes/${quizId}/attempts`).send({ requestId: randomUUID() }).expect(201);
  await AiAttempt.updateOne({ _id: extra.body.attempt.id }, { $set: { deadline: new Date(Date.now() - 1) } });
  await expireAttempts(); assert.equal((await AiAttempt.findById(extra.body.attempt.id)).status, 'submitted');
  // Simulate an interruption between atomic answer freeze and result persistence.
  const interrupted = await send(student, 'post', `/quizzes/${quizId}/attempts`).send({ requestId: randomUUID() }).expect(201);
  await AiAttempt.updateOne({ _id: interrupted.body.attempt.id }, { $set: { status: 'grading', submittedAt: new Date(), timedOut: false } });
  await expireAttempts(); assert.equal((await AiAttempt.findById(interrupted.body.attempt.id)).status, 'submitted');
});
test('invalid AI output is rejected, including unsupported source quotes and duplicate choices', () => {
  assert.equal(validateGeneratedQuiz({ questions: fixtureQuestions(5) }, 5, lectureText).length, 5);
  for (const change of [q => q.options[1] = q.options[0], q => q.answer = 9, q => q.sourceQuote = 'A quote not present anywhere in the supplied lecture.', q => q.explanation = '']) {
    const questions = fixtureQuestions(5); change(questions[0]);
    assert.throws(() => validateGeneratedQuiz({ questions }, 5, lectureText));
  }
  const duplicate = fixtureQuestions(5); duplicate[1].question = duplicate[0].question;
  assert.throws(() => validateGeneratedQuiz({ questions: duplicate }, 5, lectureText));
});
test('Gemini adapter uses backend-only key and JSON schema; failures never echo provider content', async () => {
  let called = false;
  await assert.rejects(generateQuestions({ text: lectureText, questionCount: 5, difficulty: 'Easy', env: {}, fetchImpl: () => { called = true; } }), /not configured/);
  assert.equal(called, false);
  const result = await generateQuestions({ text: lectureText, questionCount: 5, difficulty: 'Easy', env: { GEMINI_API_KEY: 'test-only-key' }, fetchImpl: async (url, request) => {
    assert(!url.includes('test-only-key')); assert.equal(request.headers['x-goog-api-key'], 'test-only-key');
    const body = JSON.parse(request.body); assert.equal(body.generationConfig.responseMimeType, 'application/json');
    assert.equal(body.generationConfig.responseJsonSchema.properties.questions.minItems, 0);
    assert.equal(body.generationConfig.responseJsonSchema.properties.questions.maxItems, 5);
    assert(body.generationConfig.responseJsonSchema.required.includes('insufficientContent'));
    return { ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ questions: fixtureQuestions(5) }) }] } }] }) };
  } }); assert.equal(result.questions.length, 5);
  await assert.rejects(generateQuestions({ text: lectureText, questionCount: 5, difficulty: 'Easy', env: { GEMINI_API_KEY: 'test-only-key' }, fetchImpl: async () => ({ ok: false, status: 403, json: async () => { throw new Error('Private provider body must not be read'); } }) }), /credentials or model access/);
});

test('all advertised configurations validate while unsupported settings fail', () => {
  for (const questionCount of [5, 10, 20, 30]) for (const difficulty of ['Easy', 'Medium', 'Hard']) for (const durationMinutes of [5, 10, 15, 30]) {
    assert.deepEqual(quizConfiguration.parse({ questionCount, difficulty, durationMinutes }), { questionCount, difficulty, durationMinutes });
  }
  for (const input of [{ ...settings, questionCount: 7 }, { ...settings, durationMinutes: 60 }, { ...settings, difficulty: 'Expert' }, { ...settings, userId: 'someone-else' }]) assert.throws(() => quizConfiguration.parse(input));
});

test('PDF subprocess environment excludes credentials and arbitrary runtime injection', () => {
  const env = pdfWorkerEnvironment({ SystemRoot: 'C:\\Windows', PATH: 'test-path', TEMP: 'test-temp', GEMINI_API_KEY: 'test-only-value', MONGODB_URI: 'test-only-value', JWT_SECRET: 'test-only-value', SMTP_PASS: 'test-only-value', NODE_OPTIONS: '--require not-allowed' });
  assert.deepEqual(env, { SystemRoot: 'C:\\Windows', PATH: 'test-path', TEMP: 'test-temp' });
});

test('sparse and repeated notes fail before any provider request', async () => {
  assert.throws(() => assertSufficientContent('One fact about authentication.', 5), /does not contain enough information/);
  assert.throws(() => assertSufficientContent('authentication credentials '.repeat(200), 5), /does not contain enough information/);
  let called = false;
  await assert.rejects(generateQuestions({ text: lectureText, questionCount: 30, difficulty: 'Hard', env: { GEMINI_API_KEY: 'test-only-key' }, fetchImpl: async () => { called = true; } }), error => error.status === 422 && /Choose fewer questions/.test(error.message));
  assert.equal(called, false);
});

test('provider may report insufficient information instead of fabricating questions', async () => {
  await assert.rejects(generateQuestions({ text: lectureText, questionCount: 5, difficulty: 'Hard', env: { GEMINI_API_KEY: 'test-only-key' }, fetchImpl: async () => ({ ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ insufficientContent: true, questions: [] }) }] } }] }) }) }), error => error.status === 422 && /enough information/.test(error.message));
});

test('renumbered questions and visually equivalent choices cannot pass output validation', () => {
  let questions = fixtureQuestions(5);
  questions[0].question = 'Question 1: What does authentication verify?';
  questions[1].question = '2. What does authentication verify?';
  assert.throws(() => validateGeneratedQuiz({ questions }, 5, lectureText), /could not be verified/);
  questions = fixtureQuestions(5);
  questions[0].options[1] = '  Iden\u200btity  ';
  assert.throws(() => validateGeneratedQuiz({ questions }, 5, lectureText), /invalid quiz/);
  questions = fixtureQuestions(5);
  questions[0].options[0] = 'Server time'; questions[0].options[1] = 'SERVER   TIME';
  assert.throws(() => validateGeneratedQuiz({ questions }, 5, lectureText), /invalid quiz/);
});

test('generation rejection releases its lock and keeps all existing documents and quizzes', async () => {
  const before = await AiQuiz.countDocuments();
  const uploaded = await send(student, 'post', '/documents').attach('file', lecturePdf('authentication credentials '.repeat(20)), 'sparse.pdf').expect(201);
  const id = uploaded.body.document.id;
  const response = await send(student, 'post', `/documents/${id}/generate`).send(settings).expect(422);
  assert.match(response.body.message, /does not contain enough information/);
  const document = await AiDocument.findById(id).select('+generationLock +text');
  assert.equal(document.generationLock, undefined); assert.equal(document.generationLockUntil, undefined);
  assert(document.text); assert.equal(await AiQuiz.countDocuments(), before);
  assert(await AiDocument.exists({ _id: documentId }));
});

test('actual PDF content and 10 MB limits are enforced independently of filename', async () => {
  await send(student, 'post', '/documents').attach('file', Buffer.from('plain text disguised as PDF'), { filename: 'spoof.pdf', contentType: 'application/pdf' }).expect(422);
  await send(student, 'post', '/documents').attach('file', Buffer.alloc(10 * 1024 * 1024 + 1), { filename: 'large.pdf', contentType: 'application/pdf' }).expect(422);
  await send(student, 'post', '/documents').attach('file', lecturePdf(''), 'scanned.pdf').expect(422);
});

test('database clock controls submission time and clients cannot override timing or marks', async () => {
  await send(student, 'post', `/quizzes/${quizId}/attempts`).send({ requestId: randomUUID(), deadline: '2099-01-01' }).expect(422);
  const { body } = await send(student, 'post', `/quizzes/${quizId}/attempts`).send({ requestId: randomUUID() }).expect(201);
  const id = body.attempt.id;
  await send(student, 'patch', `/attempts/${id}/answers`).send({ questionIndex: 0, answer: 0, deadline: '2099-01-01' }).expect(422);
  await send(student, 'post', `/attempts/${id}/submit`).send({ timedOut: false, marks: 5 }).expect(422);
  const owner = await AiAttempt.findById(id);
  await assert.rejects(finalizeAttempt(id), error => error.status === 404);
  const result = await finalizeAttempt(id, owner.userId, new Date(0));
  assert(result.submittedAt >= result.startedAt); assert(result.submittedAt <= result.deadline);
  assert.equal(result.timedOut, false);
  const review = await send(student, 'get', `/attempts/${id}`).expect(200);
  assert.equal(review.body.attempt.marks, 0); assert.equal(review.body.attempt.maxMarks, 5);
});

test('old attempt histories retain quiz metadata beyond the latest hundred generated quizzes', async () => {
  const quiz = await AiQuiz.findById(quizId);
  await AiQuiz.insertMany(Array.from({ length: 101 }, (_, i) => ({ userId: quiz.userId, documentId, title: `Newer test quiz ${i}`, questionCount: 5, difficulty: 'Easy', durationMinutes: 5, model: 'test-only', questions: fixtureQuestions(5), createdAt: new Date(Date.now() + 1000 + i) })));
  const history = await send(student, 'get', '/history').expect(200);
  assert(history.body.attempts.some(a => a.quizId === quizId));
  assert(history.body.quizzes.some(q => q.id === quizId && q.title === quiz.title));
  assert(history.body.quizzes.every(q => !('questions' in q)));
  const others = await send(other, 'get', '/history').expect(200);
  assert.equal(others.body.quizzes.length, 0);
});

test('one missing source quiz does not prevent other expired attempts from being scored', async () => {
  const quiz = await AiQuiz.findById(quizId);
  const deadline = new Date(Date.now() - 1000);
  await AiAttempt.create({ userId: quiz.userId, quizId: randomUUID(), requestId: randomUUID(), startedAt: new Date(deadline - 300000), deadline, answers: Array(5).fill(null) });
  const valid = await AiAttempt.create({ userId: quiz.userId, quizId, requestId: randomUUID(), startedAt: new Date(deadline - 300000), deadline, answers: [0, null, null, null, null] });
  await expireAttempts();
  const result = await AiAttempt.findById(valid._id);
  assert.equal(result.status, 'submitted'); assert.equal(result.percentage, 20); assert.equal(result.timedOut, true);
  const history = await send(student, 'get', '/history').expect(200);
  assert(history.body.attempts.some(attempt => attempt.id === valid._id && attempt.percentage === 20));
});
