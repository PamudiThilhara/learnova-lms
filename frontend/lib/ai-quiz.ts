export type AiDocument = { id: string; fileName: string; pages: number; characters: number; byteSize: number; createdAt: string };
export type AiQuiz = { id: string; documentId: string; title: string; questionCount: number; difficulty: 'Easy'|'Medium'|'Hard'; durationMinutes: number; createdAt: string };
export type AiQuestion = { question: string; options: string[]; answer?: number; explanation?: string; sourceQuote?: string };
export type AiAttempt = { id: string; quizId: string; status: 'active'|'grading'|'submitted'; startedAt: string; deadline: string; submittedAt?: string; answers: (number|null)[]; correct?: number; incorrect?: number; unanswered?: number; total?: number; percentage?: number; timeTakenSeconds?: number; timedOut?: boolean };
export type AttemptPayload = { attempt: AiAttempt; quiz: AiQuiz; questions: AiQuestion[]; serverNow: string };
export const aiBase = '/ai-quizzes';
export const quizBase = '/student-dashboard/ai-quizzes';
export const clockTime = (seconds: number) => `${Math.floor(Math.max(0,seconds)/60).toString().padStart(2,'0')}:${Math.floor(Math.max(0,seconds)%60).toString().padStart(2,'0')}`;
