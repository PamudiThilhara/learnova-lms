import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';

const { Schema } = mongoose;
const options = { timestamps: true, versionKey: false, autoCreate: false, autoIndex: false };
const id = () => ({ type: String, default: randomUUID });
const owner = { type: String, ref: 'User', required: true, index: true };
const documentSchema = new Schema({
  _id: id(), userId: owner, fileName: { type: String, required: true, maxlength: 180 },
  sha256: { type: String, required: true }, byteSize: Number, pages: Number, characters: Number,
  text: { type: String, required: true, select: false, maxlength: 300000 },
  generationLock: { type: String, select: false }, generationLockUntil: Date,
}, options);
documentSchema.index({ userId: 1, sha256: 1 }, { unique: true });
const question = new Schema({ question: String, options: [String], answer: Number, explanation: String, sourceQuote: String }, { _id: false });
const quizSchema = new Schema({
  _id: id(), userId: owner, documentId: { type: String, ref: 'AiDocument', required: true, index: true },
  title: String, questionCount: Number, difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'] },
  durationMinutes: Number, model: String, questions: { type: [question], required: true, select: false },
}, options);
const attemptSchema = new Schema({
  _id: id(), userId: owner, quizId: { type: String, ref: 'AiQuiz', required: true, index: true },
  requestId: { type: String, required: true }, status: { type: String, enum: ['active', 'grading', 'submitted'], default: 'active' },
  startedAt: { type: Date, required: true }, deadline: { type: Date, required: true }, submittedAt: Date,
  answers: { type: [Number], required: true }, correct: Number, incorrect: Number, unanswered: Number,
  total: Number, percentage: Number, timeTakenSeconds: Number, timedOut: Boolean,
}, options);
attemptSchema.index({ userId: 1, requestId: 1 }, { unique: true });
attemptSchema.index({ userId: 1, quizId: 1 }, { unique: true, partialFilterExpression: { status: 'active' } });
attemptSchema.index({ status: 1, deadline: 1 });
export const AiDocument = mongoose.model('AiDocument', documentSchema);
export const AiQuiz = mongoose.model('AiQuiz', quizSchema);
export const AiAttempt = mongoose.model('AiAttempt', attemptSchema);
export const aiModels = [AiDocument, AiQuiz, AiAttempt];
