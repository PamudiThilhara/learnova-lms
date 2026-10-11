import { courses, type Course } from "@/data/courses";
import { users, type User } from "@/data/users";

export type Enrollment = { completed: string[]; completedAt?: string };
export type QuizAttempt = { score: number; correct: number; total: number; answers: number[]; date: string };
export type Submission = { text: string; fileName: string; date: string; status: "Submitted" | "Graded"; marks?: number; feedback?: string };
export type Learning = { enrollments: Record<string, Enrollment>; quizzes: Record<string, QuizAttempt>; submissions: Record<string, Submission> };
export type DemoData = { courses: Course[]; users: User[]; learning: Record<string, Learning>; activity: string[]; settings: { notifications: boolean; weeklyDigest: boolean } };
export type AppState = DemoData & { ready: boolean; activeId: string | null; storageWarning: string };
export const emptyLearning = (): Learning => ({ enrollments: {}, quizzes: {}, submissions: {} });
export function initialState(): AppState {
  return {
    ready: false, activeId: null, storageWarning: "", courses, users,
    learning: {
      "student-1": {
        enrollments: { "1": { completed: ["1", "2", "3", "4", "5", "6"] }, "2": { completed: ["1", "2"] }, "3": { completed: ["1", "2", "3", "4", "5", "6"], completedAt: "2026-10-03T10:00:00.000Z" } },
        quizzes: { "3": { score: 90, correct: 9, total: 10, answers: [0, 1, 2, 3, 0, 1, 2, 3, 0, 0], date: "2026-10-03T10:00:00.000Z" } },
        submissions: { "3": { text: "My campaign project includes audience research, a content calendar, and a measurement plan.", fileName: "campaign-project.pdf", date: "2026-10-02T10:00:00.000Z", status: "Graded", marks: 88, feedback: "A clear strategy and thoughtful measurement plan. Add more detail to your audience segments." } },
      },
      "student-2": { enrollments: { "2": { completed: ["1"] } }, quizzes: {}, submissions: {} },
    },
    activity: ["Aisha completed Digital Marketing", "Daniel enrolled in UI/UX Design", "Python Programming course materials updated"],
    settings: { notifications: true, weeklyDigest: true },
  };
}
export type Action =
  | { type: "hydrate"; data: DemoData; activeId: string | null }
  | { type: "login"; id: string } | { type: "logout" }
  | { type: "register"; user: User } | { type: "profile"; user: User }
  | { type: "enroll"; userId: string; courseId: string }
  | { type: "complete"; userId: string; courseId: string; lessonId: string; date: string }
  | { type: "quiz"; userId: string; courseId: string; attempt: QuizAttempt }
  | { type: "submit"; userId: string; courseId: string; submission: Submission }
  | { type: "grade"; userId: string; courseId: string; marks: number; feedback: string }
  | { type: "save-course"; course: Course }
  | { type: "delete-course"; id: string }
  | { type: "user-status"; id: string }
  | { type: "delete-user"; id: string }
  | { type: "settings"; settings: DemoData["settings"] }
  | { type: "warning"; message: string } | { type: "reset" };

export function reducer(state: AppState, action: Action): AppState {
  const withLearning = (userId: string, update: (value: Learning) => Learning, message: string): AppState => ({
    ...state, learning: { ...state.learning, [userId]: update(state.learning[userId] ?? emptyLearning()) },
    activity: [message, ...state.activity].slice(0, 20),
  });
  switch (action.type) {
    case "hydrate": return { ...state, ...action.data, ready: true, activeId: action.activeId };
    case "login": return { ...state, activeId: action.id };
    case "logout": return { ...state, activeId: null };
    case "register": return { ...state, users: [...state.users, action.user], learning: { ...state.learning, [action.user.id]: emptyLearning() }, activeId: action.user.id, activity: [`${action.user.name} joined Learnova`, ...state.activity].slice(0, 20) };
    case "profile": return { ...state, users: state.users.map(u => u.id === action.user.id ? action.user : u), courses: state.courses.map(c => c.instructorId === action.user.id ? { ...c, instructor: action.user.name } : c) };
    case "enroll": return withLearning(action.userId, l => ({ ...l, enrollments: { ...l.enrollments, [action.courseId]: l.enrollments[action.courseId] ?? { completed: [] } } }), "A learner enrolled in a course");
    case "complete": {
      const course = state.courses.find(c => c.id === action.courseId);
      if (!course?.lessons.some(l => l.id === action.lessonId)) return state;
      return withLearning(action.userId, l => {
        const enrollment = l.enrollments[action.courseId] ?? { completed: [] };
        const completed = [...new Set([...enrollment.completed, action.lessonId])];
        return { ...l, enrollments: { ...l.enrollments, [action.courseId]: { completed, completedAt: course.lessons.every(lesson => completed.includes(lesson.id)) ? enrollment.completedAt ?? action.date : undefined } } };
      }, `A lesson in ${course.title} was completed`);
    }
    case "quiz": return withLearning(action.userId, l => ({ ...l, quizzes: { ...l.quizzes, [action.courseId]: action.attempt } }), `A quiz was completed with ${action.attempt.score}%`);
    case "submit": return withLearning(action.userId, l => ({ ...l, submissions: { ...l.submissions, [action.courseId]: action.submission } }), "An assignment was submitted");
    case "grade": return withLearning(action.userId, l => {
      const submission = l.submissions[action.courseId];
      return submission ? { ...l, submissions: { ...l.submissions, [action.courseId]: { ...submission, status: "Graded", marks: action.marks, feedback: action.feedback } } } : l;
    }, "An assignment was graded");
    case "save-course": return { ...state, courses: state.courses.some(c => c.id === action.course.id) ? state.courses.map(c => c.id === action.course.id ? action.course : c) : [...state.courses, action.course], activity: [`${action.course.title} was saved`, ...state.activity].slice(0, 20) };
    case "delete-course": {
      const learning = Object.fromEntries(Object.entries(state.learning).map(([id, value]) => {
        const enrollments = { ...value.enrollments }; const quizzes = { ...value.quizzes }; const submissions = { ...value.submissions };
        delete enrollments[action.id]; delete quizzes[action.id]; delete submissions[action.id];
        return [id, { enrollments, quizzes, submissions }];
      }));
      return { ...state, learning, courses: state.courses.filter(c => c.id !== action.id), activity: ["A course was removed", ...state.activity].slice(0, 20) };
    }
    case "user-status": return { ...state, users: state.users.map(u => u.id === action.id ? { ...u, status: u.status === "Active" ? "Blocked" : "Active" } : u), activeId: state.activeId === action.id ? null : state.activeId };
    case "delete-user": {
      if (action.id === state.activeId || state.courses.some(c => c.instructorId === action.id)) return state;
      const learning = { ...state.learning }; delete learning[action.id];
      return { ...state, learning, users: state.users.filter(u => u.id !== action.id) };
    }
    case "settings": return { ...state, settings: action.settings };
    case "warning": return state.storageWarning === action.message ? state : { ...state, storageWarning: action.message };
    case "reset": return { ...initialState(), ready: true };
  }
}

export function progressFor(course: Course, learning: Learning): number {
  const completed = learning.enrollments[course.id]?.completed ?? [];
  return course.lessons.length ? Math.round(course.lessons.filter(l => completed.includes(l.id)).length / course.lessons.length * 100) : 0;
}
export function certificateEligible(course: Course, learning: Learning): boolean {
  return progressFor(course, learning) === 100 && (learning.quizzes[course.id]?.score ?? 0) >= 70 && !!learning.submissions[course.id];
}
export const formatDate = (value: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Colombo" }).format(new Date(value));
export const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
