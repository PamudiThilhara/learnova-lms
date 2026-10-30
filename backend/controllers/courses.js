import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Course, Enrollment, Submission, QuizAttempt, Activity } from '../models/index.js';
import { courseInput } from '../validators/index.js';
import { getCourse, requireOwner } from '../services/access.js';
import { HttpError } from '../middleware/errors.js';
import { publicRecord, visibleCourses, recordActivity } from '../services/state.js';

export async function list(req, res) {
  const query = z.object({ q: z.string().max(200).optional(), category: z.string().max(100).optional(), level: z.string().max(50).optional() }).parse(req.query);
  let courses = await visibleCourses(req.user);
  if (query.q) courses = courses.filter(c => `${c.title} ${c.description} ${c.instructor}`.toLowerCase().includes(query.q.toLowerCase()));
  if (query.category) courses = courses.filter(c => c.category === query.category);
  if (query.level) courses = courses.filter(c => c.level === query.level);
  res.json({ courses });
}
export async function get(req, res) { await getCourse(req.params.id, req.user); res.json({ course: (await visibleCourses(req.user, { _id: req.params.id }))[0] }); }
export async function create(req, res) {
  const data = courseInput.parse(req.body);
  const course = await Course.create({ ...data, assignment: data.assignment ?? { title: `${data.title}: Practical Project`.slice(0, 200), instructions: `Create a practical project applying the concepts from ${data.title}. Explain your approach and reflect on what you learned.`, due: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10) }, _id: randomUUID(), instructorId: req.user._id });
  await recordActivity(req.user._id, `${course.title} was ${course.status === 'draft' ? 'saved as a draft' : 'created and published'}`, course._id);
  res.status(201).json({ course: publicRecord(course) });
}
export async function update(req, res) {
  const course = await getCourse(req.params.id, req.user); requireOwner(req.user, course);
  const data = courseInput.parse(req.body);
  if (course.status !== 'draft' && data.status === 'draft') throw new HttpError(409, 'Published courses must stay available to enrolled students. Save your changes without changing the publication status.');
  // Older clients know nothing about videos. Omission preserves the saved reference;
  // an explicit null removes it without deleting the lesson or learning progress.
  data.lessons = data.lessons.map(lesson => {
    const saved = course.lessons.find(item => item.id === lesson.id);
    return !Object.hasOwn(lesson, 'video') && saved?.video ? { ...lesson, video: saved.video.toObject() } : lesson;
  });
  const publishing = course.status === 'draft' && data.status === 'published';
  Object.assign(course, data); await course.save();
  // Removed lessons cannot remain as completed records.
  await Enrollment.updateMany({ courseId: course._id }, { $pull: { completed: { $nin: course.lessons.map(l => l.id) } } });
  const lessonIds = course.lessons.map(l => l.id);
  await Enrollment.updateMany({ courseId: course._id, completed: { $not: { $all: lessonIds } } }, { $unset: { completedAt: 1 } });
  await Enrollment.updateMany({ courseId: course._id, completed: { $all: lessonIds }, completedAt: { $exists: false } }, { $set: { completedAt: new Date() } });
  await recordActivity(req.user._id, `${course.title} was ${publishing ? 'published' : 'updated'}`, course._id);
  res.json({ course: publicRecord(course) });
}
export async function remove(req, res) {
  const course = await getCourse(req.params.id, req.user); requireOwner(req.user, course);
  await Course.deleteOne({ _id: course._id });
  await Promise.all([Enrollment, Submission, QuizAttempt, Activity].map(model => model.deleteMany({ courseId: course._id })));
  await recordActivity(req.user._id, 'A course was removed');
  res.status(204).end();
}
