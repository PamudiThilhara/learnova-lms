import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app.js';
import { connectDatabase } from '../config/database.js';
import { readConfig } from '../config/env.js';
import { models, Course, User, Enrollment } from '../models/index.js';
import { youtubeReference, youtubePlayback } from '../services/lesson-video.js';

const id = 'M7lc1UVf-VE', replacement = 'aqz-KE-bpKQ';
const video = { provider: 'youtube', videoId: id };
const payload = {
  title: 'Video lesson verification', description: 'A course stored only in an isolated test database.',
  category: 'Programming', level: 'Beginner', image: '/images/03_courses.png', duration: '2 weeks', price: 0,
  outcomes: ['Watch and apply the lesson'],
  lessons: [{ id: 'one', title: 'A video lesson', duration: '20 min', content: 'Lesson notes stay available.', exercise: 'Apply the ideas.' }],
};
let mongo, app, instructor, stranger, student, other, admin, courseId, studentId;
const password = 'Video-tests-only-42';
const send = (agent, method, path) => agent[method]('/api' + path).set('X-Learnova-Request', '1');
async function register(role, name) {
  const agent = request.agent(app);
  const response = await send(agent, 'post', '/auth/register').send({ name, email: name + '@learnova.test', password, role, terms: true }).expect(201);
  return { agent, id: response.body.user.id };
}
const playbackPath = () => `/api/courses/${courseId}/lessons/one/video`;
before(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri()); await Promise.all(models.map(model => model.init()));
  app = createApp(readConfig({ NODE_ENV: 'test', MONGODB_URI: mongo.getUri(), JWT_SECRET: randomBytes(48).toString('hex') }));
  ({ agent: instructor } = await register('instructor', 'owner'));
  ({ agent: stranger } = await register('instructor', 'stranger'));
  ({ agent: student, id: studentId } = await register('student', 'student'));
  ({ agent: other } = await register('student', 'other'));
  await User.create({ name: 'Admin', email: 'admin@learnova.test', role: 'admin', passwordHash: await bcrypt.hash(password, 4) });
  admin = request.agent(app); await send(admin, 'post', '/auth/login').send({ email: 'admin@learnova.test', password }).expect(200);
}, { timeout: 180000 });
after(async () => { await mongoose.disconnect(); if (mongo) await mongo.stop(); });

test('supported YouTube URLs parse safely and unsupported URLs are rejected', () => {
  for (const url of [
    `https://www.youtube.com/watch?v=${id}&list=ignored`, `https://youtu.be/${id}?t=20`,
    `https://m.youtube.com/shorts/${id}`, `https://youtube.com/live/${id}`,
    `https://www.youtube.com/embed/${id}`, `https://www.youtube-nocookie.com/embed/${id}`,
  ]) { assert.deepEqual(youtubeReference(url), video); }
  for (const url of [
    '', id, '<iframe src="https://youtube.com"></iframe>', 'javascript:alert(1)', 'data:video/mp4;base64,AAAA',
    `http://youtube.com/watch?v=${id}`, `https://youtube.com.evil.test/watch?v=${id}`,
    `https://notyoutube.com/watch?v=${id}`, `https://youtu.be.evil.test/${id}`,
    `https://user:password@youtube.com/watch?v=${id}`, `https://youtube.com:8443/watch?v=${id}`,
    `https://youtube.com/watch?v=${id}&v=${replacement}`, 'https://youtube.com/watch?v=short',
    'https://127.0.0.1/private.mp4', 'https://example.com/movie.webm', 'https://youtube.com/playlist?list=abc',
  ]) { assert.equal(youtubeReference(url), null, url); }
  assert.equal(youtubePlayback({ provider: 'youtube', videoId: '../unsafe' }), null);
  assert.equal(youtubePlayback(video).embedUrl, `https://www.youtube-nocookie.com/embed/${id}?rel=0`);
});

test('adding a video stores only a validated reference and keeps public responses free of playback URLs', async () => {
  const response = await send(instructor, 'post', '/courses').send({ ...payload, lessons: [{ ...payload.lessons[0], video: { provider: 'youtube', url: `https://youtu.be/${id}?tracking=discarded` } }] }).expect(201);
  courseId = response.body.course.id;
  assert.deepEqual((await Course.findById(courseId)).lessons[0].video.toObject(), video);
  for (const agent of [request(app), student, stranger]) {
    const course = (await agent.get('/api/courses/' + courseId).expect(200)).body.course;
    assert.equal(course.lessons[0].hasVideo, true); assert.equal(course.lessons[0].video, undefined);
    const state = await agent.get('/api/state').expect(200); assert(!JSON.stringify(state.body).includes(id));
  }
  assert.deepEqual((await instructor.get('/api/courses/' + courseId)).body.course.lessons[0].video, video);
});

test('only enrolled students, the owner or admins can obtain lesson playback', async () => {
  await request(app).get(playbackPath()).expect(401);
  await student.get(playbackPath()).expect(403); await stranger.get(playbackPath()).expect(403);
  await instructor.get(playbackPath()).expect(200); await admin.get(playbackPath()).expect(200);
  await send(student, 'post', `/courses/${courseId}/enrollments`).expect(201);
  const response = await student.get(playbackPath()).expect(200);
  assert.deepEqual(response.body.video, youtubePlayback(video));
  assert.equal(response.headers['cache-control'], 'no-store');
  await other.get(playbackPath()).expect(403);
  await student.get(`/api/courses/${courseId}/lessons/missing/video`).expect(404);
});

test('foreign instructors and students cannot add, replace or remove another course video', async () => {
  for (const ref of [video, { provider: 'youtube', videoId: replacement }, null]) {
    for (const agent of [student, stranger]) await send(agent, 'put', `/courses/${courseId}`).send({ ...payload, lessons: [{ ...payload.lessons[0], video: ref }] }).expect(403);
  }
  assert.deepEqual((await Course.findById(courseId)).lessons[0].video.toObject(), video);
});

test('video replacement, omission by an older client, and explicit removal preserve lessons and progress', async () => {
  await send(student, 'put', `/courses/${courseId}/lessons/one/completion`).expect(200);
  const before = (await Enrollment.findOne({ userId: studentId, courseId })).toObject();
  await send(instructor, 'put', `/courses/${courseId}`).send({ ...payload, lessons: [{ ...payload.lessons[0], video: { provider: 'youtube', videoId: replacement } }] }).expect(200);
  assert.equal((await student.get(playbackPath())).body.video.watchUrl, `https://www.youtube.com/watch?v=${replacement}`);
  await send(instructor, 'put', `/courses/${courseId}`).send({ ...payload, title: 'Edited with an older client' }).expect(200);
  assert.equal((await Course.findById(courseId)).lessons[0].video.videoId, replacement);
  await send(instructor, 'put', `/courses/${courseId}`).send({ ...payload, lessons: [{ ...payload.lessons[0], video: null }] }).expect(200);
  await student.get(playbackPath()).expect(404);
  const after = await Enrollment.findOne({ userId: studentId, courseId });
  assert.deepEqual(after.completed, before.completed); assert.equal(after.completedAt.toISOString(), before.completedAt.toISOString());
  const course = await Course.findById(courseId); assert.equal(course.lessons.length, 1); assert.equal(course.lessons[0].content, payload.lessons[0].content);
  assert(!course.lessons[0].video);
});

test('malformed references, raw video content and uploads fail validation without storing video bytes', async () => {
  for (const ref of [{ provider: 'youtube', videoId: 'invalid' }, { provider: 'upload', url: 'https://example.com/private.mp4' }, { provider: 'youtube', videoId: id, data: 'fake video bytes' }, { provider: 'youtube', url: 'file:///movie.mp4' }]) {
    await send(instructor, 'put', `/courses/${courseId}`).send({ ...payload, lessons: [{ ...payload.lessons[0], video: ref }] }).expect(422);
  }
  assert(!JSON.stringify((await Course.findById(courseId)).toObject()).includes('fake video bytes'));
});

test('legacy lessons remain editable and draft playback is restricted to the course owner and admins', async () => {
  const draft = (await send(instructor, 'post', '/courses').send({ ...payload, status: 'draft' }).expect(201)).body.course;
  assert(!draft.lessons[0].video);
  await send(instructor, 'put', `/courses/${draft.id}`).send({ ...payload, status: 'draft', lessons: [{ ...payload.lessons[0], video }] }).expect(200);
  await instructor.get(`/api/courses/${draft.id}/lessons/one/video`).expect(200);
  await admin.get(`/api/courses/${draft.id}/lessons/one/video`).expect(200);
  await student.get(`/api/courses/${draft.id}/lessons/one/video`).expect(404);
});
