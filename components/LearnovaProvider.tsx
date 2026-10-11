"use client";

import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from "react";
import { users, type User } from "@/data/users";
import { emptyLearning, initialState, reducer, type Action, type AppState, type DemoData, type Learning } from "@/lib/learnova-state";

const DATA_KEY = "learnova.frontend.v1";
const SESSION_KEY = "learnova.session.v1";
type Context = { state: AppState; dispatch: Dispatch<Action>; user: User | null; learner: User; learning: Learning; login: (email: string, remember: boolean) => User | null; logout: () => void; rememberUser: (id: string, remember: boolean) => void };
const LearnovaContext = createContext<Context | null>(null);
function isDemoData(value: unknown): value is DemoData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as DemoData;
  return Array.isArray(candidate.courses) && candidate.courses.every(c => typeof c.id === "string" && typeof c.title === "string" && Array.isArray(c.lessons) && Array.isArray(c.outcomes)) && Array.isArray(candidate.users) && candidate.users.every(u => typeof u.id === "string" && typeof u.email === "string" && ["student", "instructor", "admin"].includes(u.role)) && !!candidate.learning && typeof candidate.learning === "object" && Object.values(candidate.learning).every(l => !!l && typeof l.enrollments === "object" && typeof l.quizzes === "object" && typeof l.submissions === "object") && Array.isArray(candidate.activity) && typeof candidate.settings?.notifications === "boolean" && typeof candidate.settings?.weeklyDigest === "boolean";
}

export function LearnovaProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  useEffect(() => {
    let data: DemoData = initialState(); let activeId: string | null = null;
    try {
      const saved = localStorage.getItem(DATA_KEY);
      if (saved) { const parsed: unknown = JSON.parse(saved); if (isDemoData(parsed)) data = parsed; }
      const session = sessionStorage.getItem(SESSION_KEY) ?? localStorage.getItem(SESSION_KEY);
      if (data.users.some(u => u.id === session && u.status === "Active")) activeId = session;
    } catch { dispatch({ type: "warning", message: "Browser storage is unavailable. You can still use this preview, but changes may not survive a refresh." }); }
    dispatch({ type: "hydrate", data, activeId });
  }, []);
  useEffect(() => {
    if (!state.ready) return;
    try { const { courses, users, learning, activity, settings } = state; localStorage.setItem(DATA_KEY, JSON.stringify({ courses, users, learning, activity, settings })); }
    catch { dispatch({ type: "warning", message: "These changes could not be saved in browser storage. Keep this tab open or remove large profile images." }); }
  }, [state]);

  function rememberUser(id: string, remember: boolean) {
    try { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, id); }
    catch { dispatch({ type: "warning", message: "Your session cannot be remembered in this browser." }); }
  }
  function login(email: string, remember: boolean) {
    const found = state.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase() && u.status === "Active");
    if (!found) return null;
    rememberUser(found.id, remember); dispatch({ type: "login", id: found.id }); return found;
  }
  function logout() {
    try { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); } catch { /* The current tab can still sign out. */ }
    dispatch({ type: "logout" });
  }
  const user = state.users.find(u => u.id === state.activeId && u.status === "Active") ?? null;
  const learner = user?.role === "student" ? user : state.users.find(u => u.id === "student-1") ?? users[0];
  const learning = state.learning[learner.id] ?? emptyLearning();
  return <LearnovaContext.Provider value={{ state, dispatch, user, learner, learning, login, logout, rememberUser }}>{children}</LearnovaContext.Provider>;
}
export function useLearnova() {
  const context = useContext(LearnovaContext);
  if (!context) throw new Error("useLearnova must be used inside LearnovaProvider");
  return context;
}
