import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app.js';
import { readConfig } from '../config/env.js';
import { connectDatabase } from '../config/database.js';
import { models, User, Course, Enrollment, Submission, ContactMessage, Session } from '../models/index.js';

let mongo, app, student, other, instructor, stranger, admin;
let studentId, otherId, instructorId, courseId, resetToken;
const password = 'Test-only-password-42';
const message = 'My project applies the course concepts with a practical implementation and reflection.';
const payload = { title: 'Integration course', description: 'A practical course for verifying the complete learning workflow.', category: 'Programming', level: 'Beginner', image: '/images/python.jpg', duration: '2 weeks', price: 0, outcomes: ['Build a project'], lessons: [{ id: 'one', title: 'Introduction', duration: '20 min', content: 'Learn the fundamentals.', exercise: '' }, { id: 'two', title: 'Practice', duration: '20 min', content: 'Apply the concepts.', exercise: '' }], quiz: [{ question: 'What is a variable?', options: ['A named value', 'A color', 'A file', 'A font'], answer: 0, explanation: 'Variables name values.' }], assignment: { title: 'Practical project', instructions: 'Build a practical project and describe what you learned.', due: '2026-12-31' } };
const send = (agent, method, path) => agent[method]('/api' + path).set('X-Learnova-Request', '1');
async function register(role, name, address) {
  const agent = request.agent(app);
  const response = await send(agent, 'post', '/auth/register').send({ name, email: address, password, role, terms: true }).expect(201);
  return [agent, response.body.user.id];
}
before(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri()); await Promise.all(models.map(m => m.init()));
  const config = readConfig({ NODE_ENV: 'test', MONGODB_URI: mongo.getUri(), JWT_SECRET: randomBytes(48).toString('hex') });
  app = createApp(config, { env: { SMTP_HOST: 'test.local', SMTP_FROM: 'test@learnova.test' }, mailer: { async sendMail(mail) { resetToken = /reset=([a-f0-9]+)/.exec(mail.text)?.[1]; } } });
  [student, studentId] = await register('student', 'Test Student', 'student@learnova.test');
  [other, otherId] = await register('student', 'Other Student', 'other@learnova.test');
  [instructor, instructorId] = await register('instructor', 'Test Instructor', 'instructor@learnova.test');
  [stranger] = await register('instructor', 'Other Instructor', 'stranger@learnova.test');
  await User.create({ name: 'Test Admin', email: 'admin@learnova.test', role: 'admin', passwordHash: await bcrypt.hash(password, 4) });
  admin = request.agent(app); await send(admin, 'post', '/auth/login').send({ email: 'admin@learnova.test', password }).expect(200);
}, { timeout: 180000 });
after(async () => { await mongoose.disconnect(); if (mongo) await mongo.stop(); });

test('health checks the real MongoDB connection', async () => { const r = await request(app).get('/api/health').expect(200); assert.equal(r.body.database, 'connected'); });

test('health fails when a connected driver cannot ping MongoDB', async () => {
  const db = mongoose.connection.db;
  const command = db.command;
  try {
    db.command = async () => { throw new Error('Synthetic database outage'); };
    const response = await request(app).get('/api/health').expect(503);
    assert.deepEqual(response.body, { status: 'unavailable', database: 'disconnected' });
  } finally { db.command = command; }
});
test('server.js starts with environment configuration and reports MongoDB readiness', async () => {
  const probe = createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  const child = spawn(process.execPath, ['server.js'], { cwd: fileURLToPath(new URL('..', import.meta.url)), windowsHide: true, env: { ...process.env, NODE_ENV: 'test', PORT: String(port), MONGODB_URI: mongo.getUri(), JWT_SECRET: randomBytes(48).toString('hex') }, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Server did not become ready')), 15000);
      child.once('error', error => { clearTimeout(timeout); reject(error); });
      child.once('exit', code => { clearTimeout(timeout); reject(new Error('Server exited: ' + code)); });
      child.stdout.on('data', data => { if (data.toString().includes('MongoDB connected')) { clearTimeout(timeout); resolve(); } });
    });
    const r = await fetch(`http://127.0.0.1:${port}/api/health`); assert.equal(r.status, 200); assert.equal((await r.json()).database, 'connected');
  } finally { child.kill(); await new Promise(resolve => child.once('exit', resolve)); }
});
test('passwords are hashed; duplicate and privileged registration are rejected', async () => {
  const user = await User.findById(studentId).select('+passwordHash'); assert.notEqual(user.passwordHash, password); assert(await bcrypt.compare(password, user.passwordHash));
  await send(request(app), 'post', '/auth/register').send({ name: 'Duplicate', email: 'STUDENT@learnova.test', password, role: 'student', terms: true }).expect(409);
  await send(request(app), 'post', '/auth/register').send({ name: 'Escalation', email: 'hack@learnova.test', password, role: 'admin', terms: true }).expect(422);
  await send(request(app), 'post', '/auth/login').send({ email: 'student@learnova.test', password: 'wrong-password' }).expect(401);
});
test('CSRF, origin checks, injection validation and role boundaries', async () => {
  await request(app).post('/api/auth/login').send({ email: 'a@b.test', password }).expect(403);
  await send(student, 'post', '/courses').set('Origin', 'https://evil.test').send(payload).expect(403);
  await send(student, 'post', '/courses').send(payload).expect(403);
  await send(request(app), 'post', '/auth/login').send({ email: { $ne: null }, password }).expect(422);
  await request(app).get('/api/auth/me').expect(401);
  const r = await request(app).get('/api/state').expect(200); assert.deepEqual(r.body.users, []); assert.deepEqual(r.body.learning, {});
});
test('an empty public catalog succeeds with the configured CORS origin', async () => {
  const origin = app.locals.config.origins[0];
  const response = await request(app).get('/api/courses').set('Origin', origin).expect(200);
  assert.deepEqual(response.body, { courses: [] });
  assert.equal(response.headers['access-control-allow-origin'], origin);
  assert.equal(response.headers['access-control-allow-credentials'], 'true');
  const state = await request(app).get('/api/state').expect(200);
  assert.deepEqual(state.body.courses, []);
});

test('course creation, search, updates, ownership and answer redaction', async () => {
  const r = await send(instructor, 'post', '/courses').send({ ...payload, instructorId: 'fake-user', rating: 5 }).expect(201); courseId = r.body.course.id;
  assert.equal((await Course.findById(courseId)).instructorId, instructorId);
  await send(stranger, 'put', `/courses/${courseId}`).send(payload).expect(403);
  await send(stranger, 'delete', `/courses/${courseId}`).expect(403);
  const publicCourse = await request(app).get(`/api/courses/${courseId}`).expect(200); assert.equal(publicCourse.body.course.quiz[0].answer, -1); assert.equal(publicCourse.body.course.quiz[0].explanation, '');
  const own = await instructor.get(`/api/courses/${courseId}`).expect(200); assert.equal(own.body.course.quiz[0].answer, 0);
  const list = await request(app).get('/api/courses?q=integration&category=Programming').expect(200); assert.equal(list.body.courses.length, 1);
  // Creating a course publishes it immediately in the existing LMS; no draft flag is required.
  const catalog = await request(app).get('/api/state').expect(200);
  assert.equal(catalog.body.courses.find(c => c.id === courseId)?.title, payload.title);
  assert.equal(list.body.courses[0].instructor, 'Test Instructor');
  assert.equal(list.body.courses[0].students, 0);
  assert.equal(list.body.courses[0].rating, 0);
  assert(list.body.courses[0].createdAt);
  const level = await request(app).get('/api/courses?level=Advanced').expect(200);
  assert.deepEqual(level.body.courses, []);
  const category = await request(app).get('/api/courses?category=Design').expect(200);
  assert.deepEqual(category.body.courses, []);
  const combined = await request(app).get('/api/courses?q=INTEGRATION&category=Programming&level=Beginner').expect(200);
  assert.equal(combined.body.courses[0].id, courseId);
  await send(instructor, 'put', `/courses/${courseId}`).send({ ...payload, title: 'Updated course' }).expect(200);
});
test('enrollment is idempotent and server validates lesson IDs and enrollment', async () => {
  await send(other, 'put', `/courses/${courseId}/lessons/one/completion`).expect(403);
  await send(student, 'post', `/courses/${courseId}/enrollments`).expect(201); await send(student, 'post', `/courses/${courseId}/enrollments`).expect(201);
  assert.equal(await Enrollment.countDocuments({ userId: studentId, courseId }), 1);
  await send(student, 'put', `/courses/${courseId}/lessons/missing/completion`).expect(404);
  await Promise.all(['one', 'two', 'one'].map(id => send(student, 'put', `/courses/${courseId}/lessons/${id}/completion`).expect(200)));
  const e = await Enrollment.findOne({ userId: studentId, courseId }); assert.equal(e.completed.length, 2); assert(e.completedAt);
});
test('new courses can be edited before an instructor has added quiz questions', async () => {
  const { quiz, assignment, ...draft } = payload;
  const created = await send(instructor, 'post', '/courses').send(draft).expect(201);
  const id = created.body.course.id;
  assert.deepEqual(created.body.course.quiz, []); assert(created.body.course.assignment.due);
  await send(instructor, 'put', `/courses/${id}`).send({ ...created.body.course, title: 'Edited draft' }).expect(200);
  await send(instructor, 'delete', `/courses/${id}`).expect(204);
});
test('quiz scores are computed by the server and certificate requires all conditions', async () => {
  await student.get(`/api/courses/${courseId}/certificate`).expect(403);
  let r = await send(student, 'post', `/courses/${courseId}/quiz-attempts`).send({ answers: [1], score: 100 }).expect(200); assert.equal(r.body.attempt.score, 0);
  r = await send(student, 'post', `/courses/${courseId}/quiz-attempts`).send({ answers: [0], score: 0 }).expect(200); assert.equal(r.body.attempt.score, 100); assert.equal(r.body.review[0].answer, 0);
  await send(student, 'post', `/courses/${courseId}/quiz-attempts`).send({ answers: [0, 0] }).expect(422);
  await student.get(`/api/courses/${courseId}/certificate`).expect(403);
});
test('assignment bytes persist and attachment download and grading enforce ownership', async () => {
  await send(student, 'put', `/courses/${courseId}/submission`).field('text', message).attach('file', Buffer.from('project evidence'), 'project.txt').expect(200);
  const stored = await Submission.findOne({ userId: studentId, courseId }).select('+fileData'); assert.equal(stored.fileData.toString(), 'project evidence');
  await other.get(`/api/courses/${courseId}/submissions/${studentId}/attachment`).expect(403);
  await stranger.get(`/api/courses/${courseId}/submissions/${studentId}/attachment`).expect(403);
  const file = await instructor.get(`/api/courses/${courseId}/submissions/${studentId}/attachment`).expect(200); assert.equal(file.body.toString(), 'project evidence');
  await send(student, 'patch', `/courses/${courseId}/submissions/${studentId}/grade`).send({ marks: 100, feedback: 'Forged' }).expect(403);
  await send(stranger, 'patch', `/courses/${courseId}/submissions/${studentId}/grade`).send({ marks: 100, feedback: 'Forbidden' }).expect(403);
  await send(instructor, 'patch', `/courses/${courseId}/submissions/${studentId}/grade`).send({ marks: 101, feedback: 'Invalid' }).expect(422);
  await send(instructor, 'patch', `/courses/${courseId}/submissions/${studentId}/grade`).send({ marks: 92, feedback: 'Good work' }).expect(200);
  await student.get(`/api/courses/${courseId}/certificate`).expect(200);
  await send(student, 'put', `/courses/${courseId}/submission`).field('text', message).attach('file', Buffer.from('invalid image'), 'image.png').expect(422);
});
test('role-scoped state excludes other students and unrelated instructor records', async () => {
  const s = (await student.get('/api/state').expect(200)).body; assert.deepEqual(s.users.map(u => u.id), [studentId]); assert(!s.learning[otherId]); assert(!JSON.stringify(s).includes('passwordHash')); assert(!JSON.stringify(s).includes('fileData'));
  const i = (await instructor.get('/api/state').expect(200)).body; assert(i.users.some(u => u.id === studentId)); assert.equal(i.learning[studentId].submissions[courseId].marks, 92);
  const x = (await stranger.get('/api/state').expect(200)).body; assert(!x.learning[studentId]); assert(!x.users.some(u => u.id === studentId));
});
test('editing lesson lists reconciles completion dates and preserves unique IDs', async () => {
  const added = { id: 'three', title: 'New lesson', duration: '15 min', content: 'More practice', exercise: '' };
  await send(instructor, 'put', `/courses/${courseId}`).send({ ...payload, lessons: [...payload.lessons, added] }).expect(200);
  assert.equal((await Enrollment.findOne({ userId: studentId, courseId })).completedAt, undefined);
  await send(instructor, 'put', `/courses/${courseId}`).send(payload).expect(200);
  assert((await Enrollment.findOne({ userId: studentId, courseId })).completedAt);
  await send(instructor, 'put', `/courses/${courseId}`).send({ ...payload, lessons: [payload.lessons[0], payload.lessons[0]] }).expect(422);
});
test('profile updates ignore forged roles; duplicate emails are rejected', async () => {
  await send(student, 'patch', '/auth/me').send({ name: 'Updated Student', email: 'student@learnova.test', phone: '', bio: 'A learner', avatar: '', role: 'admin' }).expect(200);
  assert.equal((await User.findById(studentId)).role, 'student');
  await send(student, 'patch', '/auth/me').send({ name: 'Updated', email: 'other@learnova.test', phone: '', bio: '', avatar: '' }).expect(409);
});
test('settings, contact form and administrator access', async () => {
  await send(student, 'put', '/admin/settings').send({ notifications: false, weeklyDigest: false }).expect(403);
  await send(admin, 'put', '/admin/settings').send({ notifications: false, weeklyDigest: true }).expect(200);
  assert.equal((await admin.get('/api/state')).body.settings.notifications, false);
  await send(request(app), 'post', '/contact-messages').send({ name: 'Visitor', email: 'visitor@learnova.test', subject: 'Course question', message }).expect(201);
  assert.equal(await ContactMessage.countDocuments(), 1);
  await student.get('/api/admin/contact-messages').expect(403); await admin.get('/api/admin/contact-messages').expect(200);
  await send(admin, 'post', '/admin/sample-data').expect(403);
});
test('blocking invalidates sessions and unblocking does not revive them', async () => {
  await send(admin, 'patch', `/admin/users/${otherId}/status`).expect(200); await other.get('/api/auth/me').expect(401);
  await send(admin, 'patch', `/admin/users/${otherId}/status`).expect(200); await other.get('/api/auth/me').expect(401);
  assert.equal(await Session.countDocuments({ userId: otherId }), 0);
});
test('reset emails use expiring single-use tokens and invalidate existing sessions', async () => {
  await send(request(app), 'post', '/auth/forgot-password').send({ email: 'student@learnova.test' }).expect(200); assert(resetToken);
  const token = resetToken;
  await send(request(app), 'post', '/auth/reset-password').send({ token, password: 'Changed-password-42' }).expect(200);
  await student.get('/api/auth/me').expect(401);
  await send(request(app), 'post', '/auth/reset-password').send({ token, password }).expect(400);
  const session = request.agent(app); const response = await send(session, 'post', '/auth/login').send({ email: 'student@learnova.test', password: 'Changed-password-42', remember: true }).expect(200);
  assert(response.headers['set-cookie'][0].includes('HttpOnly')); assert(response.headers['set-cookie'][0].includes('Max-Age='));
  const cookie = response.headers['set-cookie'][0].split(';')[0];
  await send(session, 'post', '/auth/logout').expect(204); await request(app).get('/api/auth/me').set('Cookie', cookie).expect(401);
});
test('deleting courses and users cleans related records and preserves course owners', async () => {
  await send(admin, 'delete', `/admin/users/${instructorId}`).expect(409);
  await send(instructor, 'delete', `/courses/${courseId}`).expect(204);
  assert.equal(await Enrollment.countDocuments({ courseId }), 0); assert.equal(await Submission.countDocuments({ courseId }), 0);
  await request(app).get(`/api/courses/${courseId}`).expect(404);
  await send(admin, 'delete', `/admin/users/${otherId}`).expect(204); assert.equal(await User.countDocuments({ _id: otherId }), 0);
});
