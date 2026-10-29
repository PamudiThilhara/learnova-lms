import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';

const { Schema } = mongoose;
const options = { timestamps: true, versionKey: false, autoCreate: false, autoIndex: false };
const id = () => ({ type: String, default: randomUUID });
const ref = model => ({ type: String, ref: model, required: true, index: true });
const text = (max = 200) => ({ type: String, trim: true, required: true, maxlength: max });
const userSchema = new Schema({
  _id: id(), name: text(), email: { ...text(254), lowercase: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['student', 'instructor', 'admin'], default: 'student' },
  status: { type: String, enum: ['Active', 'Blocked'], default: 'Active' },
  phone: { type: String, default: '' }, bio: { type: String, maxlength: 3000, default: '' },
  avatar: { type: String, default: '' }, joined: { type: Date, default: Date.now },
  resetHash: { type: String, select: false }, resetExpires: { type: Date, select: false },
}, options);
const lesson = new Schema({ id: text(100), title: text(), duration: text(100), content: text(50000), exercise: { type: String, maxlength: 10000, default: '' } }, { _id: false });
const question = new Schema({ question: text(2000), options: { type: [String], validate: v => v.length === 4 && v.every(s => s.trim().length > 0) }, answer: { type: Number, min: 0, max: 3, required: true }, explanation: text(5000) }, { _id: false });
const courseSchema = new Schema({
  _id: id(), title: text(), description: text(20000), image: text(750000), instructorId: ref('User'),
  category: { type: String, enum: ['Programming', 'Design', 'Marketing', 'Business', 'Data Science', 'Personal Development'], required: true, index: true },
  level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], required: true },
  rating: { type: Number, default: 0, min: 0, max: 5 }, duration: text(100), price: { type: Number, min: 0, required: true },
  outcomes: { type: [String], validate: v => v.length > 0 },
  lessons: { type: [lesson], validate: v => v.length > 0 && new Set(v.map(l => l.id)).size === v.length },
  quiz: { type: [question], default: [] },
  assignment: { title: String, instructions: String, due: String },
}, options);
courseSchema.index({ title: 'text', description: 'text' });
const enrollmentSchema = new Schema({ _id: id(), userId: ref('User'), courseId: ref('Course'), completed: { type: [String], default: [] }, completedAt: Date }, options);
enrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });
const attemptSchema = new Schema({ _id: id(), userId: ref('User'), courseId: ref('Course'), score: { type: Number, min: 0, max: 100 }, correct: Number, total: Number, answers: [Number], date: { type: Date, default: Date.now } }, options);
attemptSchema.index({ userId: 1, courseId: 1 }, { unique: true });
const submissionSchema = new Schema({
  _id: id(), userId: ref('User'), courseId: ref('Course'), text: text(50000), fileName: { type: String, default: '' },
  fileData: { type: Buffer, select: false }, fileType: { type: String, select: false },
  date: { type: Date, default: Date.now }, status: { type: String, enum: ['Submitted', 'Graded'], default: 'Submitted' },
  marks: { type: Number, min: 0, max: 100 }, feedback: { type: String, maxlength: 10000 },
}, options);
submissionSchema.index({ userId: 1, courseId: 1 }, { unique: true });
const sessionSchema = new Schema({ _id: id(), userId: ref('User'), expiresAt: { type: Date, required: true } }, options);
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const User = mongoose.model('User', userSchema);
export const Course = mongoose.model('Course', courseSchema);
export const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
export const QuizAttempt = mongoose.model('QuizAttempt', attemptSchema);
export const Submission = mongoose.model('Submission', submissionSchema);
export const Session = mongoose.model('Session', sessionSchema);
export const Setting = mongoose.model('Setting', new Schema({ _id: { type: String, default: 'platform' }, notifications: { type: Boolean, default: true }, weeklyDigest: { type: Boolean, default: true } }, options));
export const Activity = mongoose.model('Activity', new Schema({ _id: id(), actorId: ref('User'), courseId: { type: String, ref: 'Course' }, message: text(500) }, options));
export const ContactMessage = mongoose.model('ContactMessage', new Schema({ _id: id(), name: text(), email: text(254), subject: text(300), message: text(20000) }, options));
export const models = [User, Course, Enrollment, QuizAttempt, Submission, Session, Setting, Activity, ContactMessage];
