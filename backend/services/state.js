import { User, Course, Enrollment, QuizAttempt, Submission, Setting, Activity } from '../models/index.js';

export const publicUser = user => {
  const { _id, name, email, role, status, phone, bio, avatar, joined } = user;
  return { id: _id, name, email, role, status, phone, bio, avatar, joined };
};
export const publicRecord = record => {
  const { _id, __v, ...rest } = record.toObject ? record.toObject() : record;
  return { ...rest, id: _id };
};
export async function visibleCourses(user, filter = {}) {
  const courses = await Course.find(filter).lean();
  const instructors = await User.find({ _id: { $in: courses.map(c => c.instructorId) } }).select('name').lean();
  const counts = await Enrollment.aggregate([{ $group: { _id: '$courseId', total: { $sum: 1 } } }]);
  return courses.map(c => {
    const own = user && (user.role === 'admin' || user._id === c.instructorId);
    return { ...publicRecord(c), instructor: instructors.find(u => u._id === c.instructorId)?.name ?? 'Instructor', students: counts.find(n => n._id === c._id)?.total ?? 0,
      quiz: (c.quiz ?? []).map(q => own ? q : { question: q.question, options: q.options, answer: -1, explanation: '' }) };
  });
}
export async function stateFor(user) {
  const courses = await visibleCourses(user);
  const [studentCount, instructorCount] = await Promise.all([User.countDocuments({ role: 'student' }), User.countDocuments({ role: 'instructor' })]);
  const result = { courses, users: [], learning: {}, activity: [], settings: { notifications: true, weeklyDigest: true }, stats: { students: studentCount, instructors: instructorCount }, activeId: user?._id ?? null };
  if (!user) return result;
  const ownCourses = courses.filter(c => c.instructorId === user._id).map(c => c.id);
  const filter = user.role === 'admin' ? {} : user.role === 'instructor' ? { courseId: { $in: ownCourses } } : { userId: user._id };
  const [enrollments, quizzes, submissions] = await Promise.all([
    Enrollment.find(filter).lean(), QuizAttempt.find(filter).lean(), Submission.find(filter).lean(),
  ]);
  const studentIds = [...new Set(enrollments.map(e => e.userId))];
  const users = await User.find(user.role === 'admin' ? {} : { _id: { $in: [user._id, ...(user.role === 'instructor' ? studentIds : [])] } }).lean();
  result.users = users.map(publicUser);
  for (const record of [...enrollments, ...quizzes, ...submissions]) result.learning[record.userId] ??= { enrollments: {}, quizzes: {}, submissions: {} };
  for (const e of enrollments) result.learning[e.userId].enrollments[e.courseId] = { completed: e.completed, completedAt: e.completedAt };
  for (const q of quizzes) result.learning[q.userId].quizzes[q.courseId] = { score: q.score, correct: q.correct, total: q.total, answers: q.answers, date: q.date };
  for (const s of submissions) result.learning[s.userId].submissions[s.courseId] = { text: s.text, fileName: s.fileName, date: s.date, status: s.status, marks: s.marks, feedback: s.feedback };
  const activityFilter = user.role === 'admin' ? {} : user.role === 'instructor' ? { $or: [{ actorId: user._id }, { courseId: { $in: ownCourses } }] } : { actorId: user._id };
  result.activity = (await Activity.find(activityFilter).sort({ createdAt: -1 }).limit(20).lean()).map(a => a.message);
  if (user.role === 'admin') {
    const settings = await Setting.findById('platform').lean();
    if (settings) result.settings = { notifications: settings.notifications, weeklyDigest: settings.weeklyDigest };
  }
  return result;
}
export const recordActivity = (actorId, message, courseId) => Activity.create({ actorId, message, courseId });
