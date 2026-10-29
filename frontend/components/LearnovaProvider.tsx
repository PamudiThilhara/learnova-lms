"use client";

import { createContext, useCallback, useContext, useEffect, useReducer, useRef, type ReactNode } from 'react';
import type { User, Role } from '@/data/users';
import type { Question } from '@/data/learning';
import { api, apiLogin, apiState, ApiError, errorMessage } from '@/lib/api';
import { emptyLearning, initialState, reducer, type Action, type AppState, type Learning } from '@/lib/learnova-state';

type Result = { ok: boolean; review?: Question[] };
type Context = {
  state: AppState; dispatch: (action: Action, file?: File) => Promise<Result>;
  user: User | null; learner: User; learning: Learning;
  login: (email: string, password: string, remember: boolean) => Promise<User>;
  register: (input: { name: string; email: string; password: string; role: Role; terms: boolean }) => Promise<User>;
  logout: () => Promise<boolean>; refresh: () => Promise<void>;
};
const LearnovaContext = createContext<Context | null>(null);
const guest: User = { id: '', name: '', email: '', role: 'student', phone: '', bio: '', avatar: '', status: 'Active', joined: new Date(0).toISOString() };

export function LearnovaProvider({ children }: { children: ReactNode }) {
  const [state, reduce] = useReducer(reducer, undefined, initialState);
  const version = useRef(0);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const refresh = useCallback(async () => {
    const sequence = ++version.current;
    const data = await apiState();
    if (sequence === version.current) reduce({ type: 'hydrate', data, activeId: data.activeId });
  }, []);
  useEffect(() => {
    try { localStorage.removeItem('learnova.frontend.v1'); localStorage.removeItem('learnova.session.v1'); sessionStorage.removeItem('learnova.session.v1'); } catch {}
    void refresh().catch(error => { reduce({ type: 'hydrate', data: initialState(), activeId: null }); reduce({ type: 'warning', message: errorMessage(error) }); });
    const sync = () => { void refresh().catch(error => reduce({ type: 'warning', message: errorMessage(error) })); };
    window.addEventListener('focus', sync);
    return () => window.removeEventListener('focus', sync);
  }, [refresh]);
  async function login(email: string, password: string, remember: boolean) {
    const { user } = await apiLogin(email, password, remember); await refresh(); return user;
  }
  async function register(input: { name: string; email: string; password: string; role: Role; terms: boolean }) {
    const { user } = await api<{ user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(input) }); await refresh(); return user;
  }
  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
      ++version.current;
      reduce({ type: 'hydrate', data: initialState(), activeId: null });
      await refresh().catch(error => reduce({ type: 'warning', message: errorMessage(error) }));
      return true;
    }
    catch (error) { reduce({ type: 'warning', message: errorMessage(error) }); return false; }
  }
  function dispatch(action: Action, file?: File): Promise<Result> {
    const run = async (): Promise<Result> => {
      if (action.type === 'warning') { reduce(action); return { ok: true }; }
      let path = ''; let method = 'POST'; let body: unknown; let form: FormData | undefined;
      const coursePath = 'courseId' in action ? `/courses/${encodeURIComponent(action.courseId)}` : '';
      switch (action.type) {
        case 'profile': path = '/auth/me'; method = 'PATCH'; body = action.user; break;
        case 'enroll': path = `${coursePath}/enrollments`; break;
        case 'complete': path = `${coursePath}/lessons/${encodeURIComponent(action.lessonId)}/completion`; method = 'PUT'; break;
        case 'quiz': path = `${coursePath}/quiz-attempts`; body = { answers: action.attempt.answers }; break;
        case 'submit':
          path = `${coursePath}/submission`; method = 'PUT'; form = new FormData();
          form.set('text', action.submission.text); form.set('removeFile', String(!action.submission.fileName));
          if (file) form.set('file', file); break;
        case 'grade': path = `${coursePath}/submissions/${encodeURIComponent(action.userId)}/grade`; method = 'PATCH'; body = { marks: action.marks, feedback: action.feedback }; break;
        case 'save-course':
          path = state.courses.some(c => c.id === action.course.id) ? `/courses/${encodeURIComponent(action.course.id)}` : '/courses';
          method = path === '/courses' ? 'POST' : 'PUT'; body = action.course; break;
        case 'delete-course': path = `/courses/${encodeURIComponent(action.id)}`; method = 'DELETE'; break;
        case 'user-status': path = `/admin/users/${encodeURIComponent(action.id)}/status`; method = 'PATCH'; break;
        case 'delete-user': path = `/admin/users/${encodeURIComponent(action.id)}`; method = 'DELETE'; break;
        case 'settings': path = '/admin/settings'; method = 'PUT'; body = action.settings; break;
        case 'reset': path = '/admin/sample-data'; break;
        default: return { ok: false };
      }
      try {
        const response = await api<{ review?: Question[] }>(path, { method, ...(form ? { body: form } : body ? { body: JSON.stringify(body) } : {}) });
        await refresh(); reduce({ type: 'warning', message: '' });
        return { ok: true, review: response.review };
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) await refresh().catch(() => {});
        reduce({ type: 'warning', message: errorMessage(error) });
        if (typeof window !== 'undefined') window.alert(errorMessage(error));
        return { ok: false };
      }
    };
    const result = queue.current.then(run, run); queue.current = result; return result;
  }
  const user = state.users.find(u => u.id === state.activeId && u.status === 'Active') ?? null;
  const learner = user ?? guest;
  const learning = state.learning[learner.id] ?? emptyLearning();
  return <LearnovaContext.Provider value={{ state, dispatch, user, learner, learning, login, register, logout, refresh }}>{children}</LearnovaContext.Provider>;
}
export function useLearnova() {
  const context = useContext(LearnovaContext);
  if (!context) throw new Error('useLearnova must be used inside LearnovaProvider');
  return context;
}
