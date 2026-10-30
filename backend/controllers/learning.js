import { z } from 'zod';
import { Enrollment, QuizAttempt, Submission } from '../models/index.js';
import { getCourse, requireEnrollment, requireOwner } from '../services/access.js';
import { publicRecord, recordActivity } from '../services/state.js';
import { HttpError } from '../middleware/errors.js';
import { identifier, answers, reflection, grade } from '../validators/index.js';

export async function enroll(req, res) {
  const course = await getCourse(req.params.id, req.user);
  const enrollment = await Enrollment.findOneAndUpdate({ userId: req.user._id, courseId: course._id }, { $setOnInsert: { completed: [] } }, { upsert: true, returnDocument: 'after', runValidators: true });
  await recordActivity(req.user._id, `${req.user.name} enrolled in ${course.title}`, course._id);
  res.status(201).json({ enrollment: publicRecord(enrollment) });
}
export async function complete(req, res) {
  const course = await getCourse(req.params.id, req.user);
  const lessonId = identifier.parse(req.params.lessonId);
  if (!course.lessons.some(l => l.id === lessonId)) throw new HttpError(404, 'Lesson not found.');
  await requireEnrollment(req.user, course._id);
  const enrollment = await Enrollment.findOneAndUpdate({ userId: req.user._id, courseId: course._id }, { $addToSet: { completed: lessonId } }, { returnDocument: 'after' });
  if (course.lessons.every(l => enrollment.completed.includes(l.id)) && !enrollment.completedAt) {
    await Enrollment.updateOne({ _id: enrollment._id, completedAt: { $exists: false } }, { $set: { completedAt: new Date() } });
  }
  await recordActivity(req.user._id, `A lesson in ${course.title} was completed`, course._id);
  res.json({ enrollment: publicRecord(await Enrollment.findById(enrollment._id)) });
}
export async function quiz(req, res) {
  const course = await getCourse(req.params.id, req.user); await requireEnrollment(req.user, course._id);
  const data = answers.parse(req.body);
  if (!course.quiz.length || data.answers.length !== course.quiz.length) throw new HttpError(422, 'Answer every quiz question.');
  const correct = course.quiz.filter((q, i) => q.answer === data.answers[i]).length;
  const attempt = await QuizAttempt.findOneAndUpdate({ userId: req.user._id, courseId: course._id }, { $set: { correct, score: Math.round(correct / course.quiz.length * 100), total: course.quiz.length, answers: data.answers, date: new Date() } }, { upsert: true, returnDocument: 'after', runValidators: true });
  await recordActivity(req.user._id, `A quiz was completed with ${attempt.score}%`, course._id);
  res.json({ attempt: publicRecord(attempt), review: course.quiz });
}
function validateFile(file) {
  if (!file) return;
  const extension = file.originalname.split('.').pop().toLowerCase();
  const b = file.buffer;
  const valid = extension === 'pdf' ? b.subarray(0, 5).toString() === '%PDF-' : ['zip', 'docx'].includes(extension) ? b[0] === 0x50 && b[1] === 0x4b : extension === 'png' ? b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) : ['jpg', 'jpeg'].includes(extension) ? b[0] === 255 && b[1] === 216 && b[2] === 255 : extension === 'txt' ? !b.includes(0) : false;
  if (!valid) throw new HttpError(422, 'The attachment contents do not match a supported file type.');
}
export async function submit(req, res) {
  const course = await getCourse(req.params.id, req.user); await requireEnrollment(req.user, course._id);
  const text = reflection.parse(req.body.text);
  validateFile(req.file);
  const old = await Submission.findOne({ userId: req.user._id, courseId: course._id });
  const file = req.file;
  const removeFile = z.enum(['true', 'false']).default('false').parse(req.body.removeFile) === 'true';
  const update = { text, date: new Date(), status: 'Submitted', fileName: file ? file.originalname.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 200) : removeFile ? '' : old?.fileName ?? '' };
  if (file) { update.fileData = file.buffer; update.fileType = file.mimetype; }
  const unset = { marks: 1, feedback: 1, ...(removeFile && !file ? { fileData: 1, fileType: 1 } : {}) };
  const submission = await Submission.findOneAndUpdate({ userId: req.user._id, courseId: course._id }, { $set: update, $unset: unset }, { upsert: true, returnDocument: 'after', runValidators: true });
  await recordActivity(req.user._id, 'An assignment was submitted', course._id);
  res.json({ submission: publicRecord(submission) });
}
export async function gradeSubmission(req, res) {
  const course = await getCourse(req.params.id, req.user); requireOwner(req.user, course);
  const userId = identifier.parse(req.params.userId); const data = grade.parse(req.body);
  const submission = await Submission.findOneAndUpdate({ userId, courseId: course._id }, { $set: { ...data, status: 'Graded' } }, { returnDocument: 'after', runValidators: true });
  if (!submission) throw new HttpError(404, 'Submission not found.');
  await recordActivity(req.user._id, 'An assignment was graded', course._id);
  res.json({ submission: publicRecord(submission) });
}
export async function attachment(req, res) {
  const course = await getCourse(req.params.id, req.user); const userId = identifier.parse(req.params.userId);
  if (req.user._id !== userId) requireOwner(req.user, course);
  const submission = await Submission.findOne({ userId, courseId: course._id }).select('+fileData +fileType');
  if (!submission?.fileData) throw new HttpError(404, 'Attachment not found.');
  res.attachment(submission.fileName);
  res.set('Content-Type', 'application/octet-stream');
  res.send(Buffer.from(submission.fileData));
}
export async function certificate(req, res) {
  const course = await getCourse(req.params.id, req.user); const enrollment = await requireEnrollment(req.user, course._id);
  const [attempt, submission] = await Promise.all([QuizAttempt.findOne({ userId: req.user._id, courseId: course._id }), Submission.findOne({ userId: req.user._id, courseId: course._id })]);
  if (!course.lessons.every(l => enrollment.completed.includes(l.id)) || !attempt || attempt.score < 70 || !submission) throw new HttpError(403, 'Complete every lesson, pass the quiz, and submit the assignment first.');
  res.json({ certificate: { id: `LN-${course._id}-${req.user._id}`, student: req.user.name, course: course.title, completedAt: enrollment.completedAt, score: attempt.score } });
}
