import { Router } from 'express';
import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { roles } from '../services/auth.js';
import { HttpError } from '../middleware/errors.js';
import { AiDocument, AiQuiz, AiAttempt } from '../models/ai-quiz.js';
import { extractPdf } from '../services/pdf-text.js';
import { generateQuestions, quizConfiguration, validateGeneratedQuiz, assertSufficientContent } from '../services/ai-question-generator.js';
import { finalizeAttempt, settleAttempt } from '../services/ai-attempts.js';

const id = z.string().uuid();
const publicDocument = d => ({ id: d._id, fileName: d.fileName, pages: d.pages, characters: d.characters, byteSize: d.byteSize, createdAt: d.createdAt });
const publicQuiz = q => ({ id: q._id, documentId: q.documentId, title: q.title, questionCount: q.questionCount, difficulty: q.difficulty, durationMinutes: q.durationMinutes, createdAt: q.createdAt });
const publicAttempt = a => ({ id: a._id, quizId: a.quizId, status: a.status, startedAt: a.startedAt, deadline: a.deadline, submittedAt: a.submittedAt, answers: a.answers, correct: a.correct, incorrect: a.incorrect, unanswered: a.unanswered, total: a.total, marks: a.correct, maxMarks: a.total, percentage: a.percentage, timeTakenSeconds: a.timeTakenSeconds, timedOut: a.timedOut });
async function ownedQuiz(quizId, userId, privateQuestions = false) {
  const query = AiQuiz.findOne({ _id: id.parse(quizId), userId });
  const quiz = await (privateQuestions ? query.select('+questions') : query);
  if (!quiz) throw new HttpError(404, 'Quiz not found.'); return quiz;
}
async function attemptResponse(attempt) {
  const quiz = await ownedQuiz(attempt.quizId, attempt.userId, true);
  return { attempt: publicAttempt(attempt), quiz: publicQuiz(quiz), serverNow: new Date().toISOString(), questions: quiz.questions.map(q => attempt.status === 'submitted' ? { question: q.question, options: [...q.options], answer: q.answer, explanation: q.explanation, sourceQuote: q.sourceQuote } : { question: q.question, options: [...q.options] }) };
}
export function aiQuizRouter(config) {
  const router = Router();
  router.use(roles('student'));
  const limit = (count, windowMs) => rateLimit({ windowMs, limit: config.NODE_ENV === 'test' ? 500 : count, keyGenerator: req => req.user._id, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Please wait before uploading or generating another quiz.' } });
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 0 }, fileFilter(req, file, cb) { cb(null, /\.pdf$/i.test(file.originalname) && ['application/pdf', 'application/octet-stream'].includes(file.mimetype)); } });
  router.get('/status', (req, res) => res.json({ configured: Boolean(req.app.locals.aiEnv.GEMINI_API_KEY), maxFileMb: 10, maxPages: 100 }));
  router.get('/documents', async (req, res) => res.json({ documents: (await AiDocument.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100)).map(publicDocument) }));
  router.get('/documents/:id', async (req, res) => {
    const document = await AiDocument.findOne({ _id: id.parse(req.params.id), userId: req.user._id });
    if (!document) throw new HttpError(404, 'Document not found.');
    res.json({ document: publicDocument(document) });
  });
  router.post('/documents', limit(20, 3600000), upload.single('file'), async (req, res) => {
    if (!req.file) throw new HttpError(422, 'Choose a PDF file up to 10 MB.');
    const { text, pages } = await extractPdf(req.file.buffer);
    const fileName = req.file.originalname.replace(/[\\/]/g, '_').replace(/[\x00-\x1f\x7f]/g, '').slice(0, 180) || 'Lecture notes.pdf';
    const sha256 = createHash('sha256').update(req.file.buffer).digest('hex');
    let document;
    try { document = await AiDocument.findOneAndUpdate({ userId: req.user._id, sha256 }, { $setOnInsert: { userId: req.user._id, sha256, text, pages, fileName, characters: text.length, byteSize: req.file.size } }, { upsert: true, returnDocument: 'after', runValidators: true }); }
    catch (error) { if (error.code !== 11000) throw error; document = await AiDocument.findOne({ userId: req.user._id, sha256 }); }
    res.status(201).json({ document: publicDocument(document) });
  });
  router.post('/documents/:id/generate', limit(5, 15 * 60000), async (req, res) => {
    const settings = quizConfiguration.parse(req.body);
    const documentId = id.parse(req.params.id);
    if (!req.app.locals.aiEnv.GEMINI_API_KEY && !req.app.locals.quizGenerator) throw new HttpError(503, 'AI quiz generation is not configured. Ask the administrator to configure GEMINI_API_KEY on the backend.');
    const token = randomUUID();
    const document = await AiDocument.findOneAndUpdate({ _id: documentId, userId: req.user._id, $or: [{ generationLockUntil: { $exists: false } }, { generationLockUntil: { $lt: new Date() } }] }, { $set: { generationLock: token, generationLockUntil: new Date(Date.now() + 120000) } }, { returnDocument: 'after' }).select('+text');
    if (!document) {
      if (!await AiDocument.exists({ _id: documentId, userId: req.user._id })) throw new HttpError(404, 'Document not found.');
      throw new HttpError(409, 'A quiz is already being generated from this document. Check your history shortly.');
    }
    try {
      assertSufficientContent(document.text, settings.questionCount);
      const generated = await (req.app.locals.quizGenerator ?? generateQuestions)({ text: document.text, ...settings, env: req.app.locals.aiEnv });
      const questions = validateGeneratedQuiz({ questions: generated.questions }, settings.questionCount, document.text);
      const quiz = await AiQuiz.create({ ...settings, userId: req.user._id, documentId, title: document.fileName.replace(/\.pdf$/i, ''), questions, model: generated.model });
      res.status(201).json({ quiz: publicQuiz(quiz) });
    } finally {
      await AiDocument.updateOne({ _id: documentId, generationLock: token }, { $unset: { generationLock: 1, generationLockUntil: 1 } });
    }
  });
  router.get('/history', async (req, res) => {
    const page = z.coerce.number().int().min(1).max(1000).default(1).parse(req.query.page);
    const userId = req.user._id;
    const unfinished = await AiAttempt.find({ userId, status: { $ne: 'submitted' } }).limit(100);
    for (const attempt of unfinished) {
      try { await settleAttempt(attempt); }
      catch (error) { if (error.status !== 404) throw error; }
    }
    const [attempts, recentQuizzes, total] = await Promise.all([AiAttempt.find({ userId }).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 20).limit(20), AiQuiz.find({ userId }).sort({ createdAt: -1, _id: -1 }).limit(100), AiAttempt.countDocuments({ userId })]);
    const known = new Set(recentQuizzes.map(quiz => quiz._id));
    const olderIds = [...new Set(attempts.map(attempt => attempt.quizId))].filter(quizId => !known.has(quizId));
    const olderQuizzes = olderIds.length ? await AiQuiz.find({ userId, _id: { $in: olderIds } }) : [];
    const quizzes = [...recentQuizzes, ...olderQuizzes];
    res.json({ attempts: attempts.map(publicAttempt), quizzes: quizzes.map(publicQuiz), page, total });
  });
  router.get('/quizzes/:id', async (req, res) => res.json({ quiz: publicQuiz(await ownedQuiz(req.params.id, req.user._id)) }));
  router.post('/quizzes/:id/attempts', async (req, res) => {
    const { requestId } = z.object({ requestId: id }).strict().parse(req.body);
    const quiz = await ownedQuiz(req.params.id, req.user._id);
    const userId = req.user._id;
    let attempt = await AiAttempt.findOne({ userId, requestId });
    if (attempt && attempt.quizId !== quiz._id) throw new HttpError(409, 'This start request belongs to another quiz.');
    if (!attempt) {
      const existing = await AiAttempt.findOne({ userId, quizId: quiz._id, status: 'active' });
      if (existing) { const settled = await settleAttempt(existing); if (settled.status === 'active') attempt = settled; }
    }
    if (!attempt) {
      const startedAt = new Date();
      try { attempt = await AiAttempt.create({ userId, quizId: quiz._id, requestId, startedAt, deadline: new Date(startedAt.getTime() + quiz.durationMinutes * 60000), answers: Array(quiz.questionCount).fill(null) }); }
      catch (error) { if (error.code !== 11000) throw error; attempt = await AiAttempt.findOne({ userId, $or: [{ requestId }, { quizId: quiz._id, status: 'active' }] }); if (!attempt || attempt.quizId !== quiz._id) throw new HttpError(409, 'A quiz is already starting. Please refresh.'); }
    }
    res.status(201).json(await attemptResponse(await settleAttempt(attempt)));
  });
  router.get('/attempts/:id', async (req, res) => {
    const attempt = await AiAttempt.findOne({ _id: id.parse(req.params.id), userId: req.user._id });
    if (!attempt) throw new HttpError(404, 'Quiz attempt not found.');
    res.json(await attemptResponse(await settleAttempt(attempt)));
  });
  router.patch('/attempts/:id/answers', async (req, res) => {
    const attemptId = id.parse(req.params.id);
    const { questionIndex, answer } = z.object({ questionIndex: z.number().int().min(0).max(29), answer: z.number().int().min(0).max(3).nullable() }).strict().parse(req.body);
    let attempt = await AiAttempt.findOne({ _id: attemptId, userId: req.user._id });
    if (!attempt) throw new HttpError(404, 'Quiz attempt not found.');
    if (questionIndex >= attempt.answers.length) throw new HttpError(422, 'Question not found.');
    attempt = await AiAttempt.findOneAndUpdate({ _id: attemptId, userId: req.user._id, status: 'active', $expr: { $gt: ['$deadline', '$$NOW'] } }, { $set: { [`answers.${questionIndex}`]: answer } }, { returnDocument: 'after' });
    if (!attempt) {
      const current = await AiAttempt.findOne({ _id: attemptId, userId: req.user._id });
      if (current) await settleAttempt(current);
      throw new HttpError(409, 'This attempt has ended. Open your results; late answers are not accepted.');
    }
    res.json({ answers: attempt.answers, serverNow: new Date().toISOString() });
  });
  router.post('/attempts/:id/submit', async (req, res) => {
    z.object({}).strict().parse(req.body ?? {});
    res.json(await attemptResponse(await finalizeAttempt(id.parse(req.params.id), req.user._id)));
  });
  return router;
}
