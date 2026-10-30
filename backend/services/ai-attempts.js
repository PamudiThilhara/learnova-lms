import { AiAttempt, AiQuiz } from '../models/ai-quiz.js';
import { HttpError } from '../middleware/errors.js';

export function gradeAnswers(questions, answers) {
  const correct = questions.filter((q, i) => answers[i] === q.answer).length;
  const unanswered = questions.filter((_, i) => answers[i] === null || answers[i] === undefined).length;
  return { correct, incorrect: questions.length - correct - unanswered, unanswered, total: questions.length, percentage: Math.round(correct / questions.length * 100) };
}
export async function finalizeAttempt(id, userId) {
  // Freeze the saved answers atomically before grading. Concurrent saves or submissions
  // cannot change this snapshot. A restart can safely finish a frozen grading attempt.
  if (!userId) throw new HttpError(404, 'Quiz attempt not found.');
  const owner = { _id: id, userId };
  let attempt = await AiAttempt.findOne(owner);
  if (!attempt) throw new HttpError(404, 'Quiz attempt not found.');
  if (attempt.status === 'submitted') return attempt;
  if (attempt.status === 'active') {
    // Use the same database clock as the late-answer check, at the instant the
    // answers freeze, rather than a timestamp captured before database work.
    attempt = await AiAttempt.findOneAndUpdate({ ...owner, status: 'active' }, [{ $set: { status: 'grading', submittedAt: { $min: ['$$NOW', '$deadline'] }, timedOut: { $gte: ['$$NOW', '$deadline'] } } }], { returnDocument: 'after', updatePipeline: true }) ?? await AiAttempt.findOne(owner);
  }
  if (!attempt) throw new HttpError(404, 'Quiz attempt not found.');
  if (attempt.status === 'submitted') return attempt;
  const quiz = await AiQuiz.findOne({ _id: attempt.quizId, userId: attempt.userId }).select('+questions');
  if (!quiz) throw new HttpError(404, 'Quiz not found.');
  const result = gradeAnswers(quiz.questions, attempt.answers);
  const updated = await AiAttempt.findOneAndUpdate({ ...owner, status: 'grading' }, { $set: { ...result, status: 'submitted', timeTakenSeconds: Math.max(0, Math.floor((attempt.submittedAt - attempt.startedAt) / 1000)) } }, { returnDocument: 'after' });
  return updated ?? AiAttempt.findOne(owner);
}
export async function settleAttempt(attempt) {
  return attempt.status === 'grading' || (attempt.status === 'active' && attempt.deadline <= new Date()) ? finalizeAttempt(attempt._id, attempt.userId) : attempt;
}
export async function expireAttempts() {
  const due = await AiAttempt.find({ $or: [{ status: 'active', deadline: { $lte: new Date() } }, { status: 'grading' }] }).select('_id userId').limit(100);
  const results = await Promise.allSettled(due.map(attempt => finalizeAttempt(attempt._id, attempt.userId)));
  const failed = results.find(result => result.status === 'rejected' && result.reason?.status !== 404);
  if (failed) throw failed.reason;
}
export function startAttemptExpiry() {
  let running = false;
  const sweep = async () => {
    if (running) return; running = true;
    try { await expireAttempts(); } catch { console.error('AI quiz deadline processing is temporarily unavailable.'); }
    finally { running = false; }
  };
  void sweep();
  const timer = setInterval(sweep, 5000); timer.unref();
  return () => clearInterval(timer);
}
