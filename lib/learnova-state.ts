import { type Course } from "@/data/courses";
import { type User } from "@/data/users";

export type Enrollment = { completed: string[]; completedAt?: string };
export type QuizAttempt = { score: number; correct: number; total: number; answers: number[]; date: string };
export type Submission = { text: string; fileName: string; date: string; status: "Submitted" | "Graded"; marks?: number; feedback?: string };
export type Learning = { enrollments: Record<string, Enrollment>; quizzes: Record<string, QuizAttempt>; submissions: Record<string, Submission> };
export type DemoData = { courses: Course[]; users: User[]; learning: Record<string, Learning>; activity: string[]; settings: { notifications: boolean; weeklyDigest: boolean }; stats?: { students: number; instructors: number } };
export type AppState = DemoData & { ready: boolean; activeId: string | null; storageWarning: string };
export const emptyLearning = (): Learning => ({ enrollments: {}, quizzes: {}, submissions: {} });
export function initialState(): AppState {
 return { ready: false, activeId: null, storageWarning: '', courses: [], users: [], learning: {}, activity: [], settings: { notifications: true, weeklyDigest: true } };
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
 if (action.type === 'hydrate') return { ...state, ...action.data, ready: true, activeId: action.activeId, storageWarning: '' };
 if (action.type === 'warning') return { ...state, storageWarning: action.message };
 return state;
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
