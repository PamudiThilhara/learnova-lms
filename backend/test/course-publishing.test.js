import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDatabase } from '../config/database.js';
import { readConfig } from '../config/env.js';
import { createApp } from '../app.js';
import { Course, User, Enrollment, models } from '../models/index.js';

let mongo, app, instructor, stranger, student, admin, instructorId;
const password = 'Publishing-test-only-42';
const payload = {
  title: 'Publishing workflow verification', description: 'Content created only inside an isolated test database.',
  category: 'Design', level: 'Advanced', image: '/images/03_courses.png', duration: '3 weeks', price: 0,
  outcomes: ['Verify course publication'],
  lessons: [{ id: 'one', title: 'Introduction', duration: '20 min', content: 'Explain the learning goals.', exercise: '' }],
};
const send = (agent, method, path) => agent[method]('/api' + path).set('X-Learnova-Request', '1');
async function register(role, name) {
  const agent = request.agent(app);
  const response = await send(agent, 'post', '/auth/register').send({ name, email: name + '@learnova.test', password, role, terms: true }).expect(201);
  return { agent, id: response.body.user.id };
}
async function create(status = 'draft') {
  return (await send(instructor, 'post', '/courses').send({ ...payload, status }).expect(201)).body.course;
}
before(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri()); await Promise.all(models.map(model => model.init()));
  app = createApp(readConfig({ NODE_ENV: 'test', MONGODB_URI: mongo.getUri(), JWT_SECRET: randomBytes(48).toString('hex') }));
  ({ agent: instructor, id: instructorId } = await register('instructor', 'owner'));
  ({ agent: stranger } = await register('instructor', 'stranger'));
  ({ agent: student } = await register('student', 'student'));
  await User.create({ name: 'Admin', email: 'admin@learnova.test', role: 'admin', passwordHash: await bcrypt.hash(password, 4) });
  admin = request.agent(app);
  await send(admin, 'post', '/auth/login').send({ email: 'admin@learnova.test', password }).expect(200);
}, { timeout: 180000 });
after(async () => { await mongoose.disconnect(); if (mongo) await mongo.stop(); });

test('course creation requires an authenticated instructor and validates form fields', async () => {
  await send(request(app), 'post', '/courses').send(payload).expect(401);
  await send(student, 'post', '/courses').send(payload).expect(403);
  for (const invalid of [{ status: 'public' }, { category: 'Unknown' }, { level: 'beginner' }, { title: 'ab' }, { description: 'short' }, { price: -1 }, { price: '0' }, { outcomes: [] }, { lessons: [] }]) {
    await send(instructor, 'post', '/courses').send({ ...payload, status: 'draft', ...invalid }).expect(422);
  }
  assert.equal(await Course.countDocuments(), 0);
});

test('drafts persist privately and cannot be read, changed or enrolled in by other users', async () => {
  const course = (await send(instructor, 'post', '/courses').send({ ...payload, status: 'draft', instructorId: 'forged-owner' }).expect(201)).body.course;
  assert.equal(course.instructorId, instructorId);
  assert.equal((await Course.findById(course.id)).status, 'draft');
  assert.equal((await instructor.get('/api/state')).body.courses.find(c => c.id === course.id).status, 'draft');
  await instructor.get('/api/courses/' + course.id).expect(200);
  await admin.get('/api/courses/' + course.id).expect(200);
  for (const agent of [request(app), student, stranger]) {
    const state = await agent.get('/api/state').expect(200);
    assert(!state.body.courses.some(c => c.id === course.id));
    const list = await agent.get('/api/courses').expect(200);
    assert(!list.body.courses.some(c => c.id === course.id));
    await agent.get('/api/courses/' + course.id).expect(404);
  }
  await send(stranger, 'put', '/courses/' + course.id).send({ ...payload, status: 'published' }).expect(404);
  await send(student, 'put', '/courses/' + course.id).send(payload).expect(403);
  await send(student, 'post', '/courses/' + course.id + '/enrollments').expect(404);
  assert.equal(await Enrollment.countDocuments({ courseId: course.id }), 0);
});

test('saving a draft or its assessments preserves draft status and uploaded thumbnails', async () => {
  const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=';
  const course = await create();
  await send(instructor, 'put', '/courses/' + course.id).send({ ...payload, title: 'Edited draft', image, quiz: [] }).expect(200);
  const reloaded = (await instructor.get('/api/courses/' + course.id).expect(200)).body.course;
  assert.equal(reloaded.title, 'Edited draft'); assert.equal(reloaded.image, image); assert.equal(reloaded.status, 'draft');
  assert(!(await request(app).get('/api/courses')).body.courses.some(c => c.id === course.id));
});

test('a maximum-length course title does not generate an assignment that prevents later saves', async () => {
  const course = (await send(instructor, 'post', '/courses').send({ ...payload, title: 'A'.repeat(200), status: 'draft' }).expect(201)).body.course;
  assert.equal(course.assignment.title.length, 200);
  await send(instructor, 'put', '/courses/' + course.id).send({ ...course, status: 'published' }).expect(200);
  assert.equal((await request(app).get('/api/courses/' + course.id)).body.course.status, 'published');
});

test('publishing makes a saved course public with working search, category and level filters', async () => {
  const course = await create();
  await send(instructor, 'put', '/courses/' + course.id).send({ ...payload, status: 'published' }).expect(200);
  assert.equal((await Course.findById(course.id)).status, 'published');
  for (const agent of [request(app), student, stranger]) {
    const state = await agent.get('/api/state').expect(200);
    assert(state.body.courses.some(c => c.id === course.id));
    const list = await agent.get('/api/courses?q=Publishing&category=Design&level=Advanced').expect(200);
    assert(list.body.courses.some(c => c.id === course.id));
    await agent.get('/api/courses/' + course.id).expect(200);
  }
  for (const filter of ['category=Programming', 'level=Beginner', 'q=not-present-in-title-or-description']) {
    assert(!(await request(app).get('/api/courses?' + filter)).body.courses.some(c => c.id === course.id));
  }
  await send(student, 'post', '/courses/' + course.id + '/enrollments').expect(201);
  assert.equal(await Enrollment.countDocuments({ courseId: course.id }), 1);
  await send(instructor, 'put', '/courses/' + course.id).send({ ...payload, title: 'Updated published course' }).expect(200);
  assert.equal((await request(app).get('/api/courses/' + course.id)).body.course.title, 'Updated published course');
  await send(instructor, 'put', '/courses/' + course.id).send({ ...payload, status: 'draft' }).expect(409);
  assert.equal((await Course.findById(course.id)).status, 'published');
});

test('administrators can publish a draft without changing its instructor ownership', async () => {
  const course = await create();
  await send(admin, 'put', '/courses/' + course.id).send({ ...payload, status: 'published', instructorId: 'forged' }).expect(200);
  assert.equal((await Course.findById(course.id)).instructorId, instructorId);
});

test('legacy courses stay public without migrations and older create requests keep their behavior', async () => {
  const id = randomUUID();
  await Course.collection.insertOne({ ...payload, _id: id, instructorId, rating: 0, quiz: [] });
  const list = await request(app).get('/api/courses').expect(200);
  assert(list.body.courses.some(c => c.id === id));
  await request(app).get('/api/courses/' + id).expect(200);
  assert.equal((await Course.collection.findOne({ _id: id })).status, undefined);
  const course = (await send(instructor, 'post', '/courses').send(payload).expect(201)).body.course;
  assert.equal(course.status, 'published');
});
