"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Apple, Globe, Eye, EyeOff, ArrowRight, GraduationCap } from "lucide-react";
import Artwork from "@/components/ui/Artwork";
import { useLearnova } from "@/components/LearnovaProvider";
import { api, errorMessage } from "@/lib/api";
import { dashboardPath, type Role } from "@/data/users";
export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const register = mode === "register";
  const { state, login, register: registerUser } = useLearnova();
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<Role>("student"); const [remember, setRemember] = useState(false); const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false); const [errors, setErrors] = useState<Record<string, string>>({}); const [message, setMessage] = useState("");
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  async function submit(e: FormEvent) {
    e.preventDefault(); if (busy) return; const next: Record<string, string> = {};
    if (register && name.trim().length < 2) next.name = "Enter your full name (at least 2 characters).";
    if (!emailValid.test(email.trim())) next.email = "Enter a valid email address.";
    if (password.length < 8) next.password = "Use at least 8 characters.";
    if (register && password !== confirm) next.confirm = "Passwords do not match.";
    if (register && !terms) next.terms = "Accept the terms to continue.";
    setErrors(next); setMessage(""); if (Object.keys(next).length) return;
    setBusy(true);
    try {
      if (register) {
        const user = await registerUser({ name: name.trim(), email: email.trim(), password, role, terms });
        window.location.assign(dashboardPath(user.role));
      } else {
        const token = new URLSearchParams(window.location.search).get('reset');
        if (token) {
          await api('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) });
          window.history.replaceState(null, '', '/login');
        }
        const found = await login(email, password, remember);
        window.location.assign(dashboardPath(found.role));
      }
    } catch (error) { setErrors({ email: errorMessage(error) }); } finally { setBusy(false); }
  }
  async function demo(email: string) {
    if (!password) { setMessage("Enter the configured sample account password above to sign in."); return; }
    try { const found = await login(email, password, remember); window.location.assign(dashboardPath(found.role)); }
    catch (error) { setMessage(errorMessage(error)); }
  }
  const fieldError = (field: string) => errors[field] ? <p id={`${field}-error`} className="form-error">{errors[field]}</p> : null;
  return <div className="container-page grid items-center gap-12 py-12 lg:grid-cols-2">
    <section className="hidden lg:block"><Artwork name={register ? "signup" : "login"} className="mb-8 aspect-[1.35] max-w-md rounded-3xl border border-white/10" /><p className="mb-4 text-xs font-bold uppercase tracking-widest text-blue-400">Your learning, your future</p><h1 className="max-w-lg text-5xl font-bold leading-tight text-slate-50">{register ? "Great things start with a little curiosity." : "Your next achievement is waiting."}</h1><p className="mt-6 max-w-md text-lg leading-8 text-slate-400">Expert-led courses, practical assignments, and a clear path from your first lesson to your certificate.</p><div className="panel mt-9 max-w-md p-6"><GraduationCap size={32} className="text-blue-400" /><p className="mt-4 font-semibold text-slate-100">One place for every step of learning.</p><p className="mt-2 text-sm leading-7 text-slate-400">Explore programming, design, marketing, and more. Build skills you can put into practice.</p></div></section>
    <section className="panel mx-auto w-full max-w-lg p-6 sm:p-9">
      <h2 className="text-3xl font-bold text-slate-50">{register ? "Create Account" : "Welcome Back"}</h2><p className="mt-2 text-sm text-slate-400">{register ? "Start your learning journey with Learnova." : "Sign in to continue your learning journey."}</p>
      <p className="notice mt-5">Your learning stays connected to your account. If you opened a password reset link, enter your email and a new password below.</p>
      <form onSubmit={submit} noValidate className="mt-6 space-y-5">
        {register && <div><label className="field-label" htmlFor="name">Full Name</label><input id="name" className="field" autoComplete="name" value={name} onChange={e => setName(e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} />{fieldError("name")}</div>}
        <div><label className="field-label" htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" className="field" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} />{fieldError("email")}</div>
        <div><label className="field-label" htmlFor="password">Password</label><div className="relative"><input id="password" type={showPassword ? "text" : "password"} autoComplete={register ? "new-password" : "current-password"} className="field pr-12" value={password} onChange={e => setPassword(e.target.value)} aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined} placeholder="At least 8 characters" /><button type="button" className="absolute right-3 top-3 text-slate-400" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button></div>{fieldError("password")}</div>
        {register ? <>
          <div><label className="field-label" htmlFor="confirm">Confirm Password</label><input id="confirm" type="password" autoComplete="new-password" className="field" value={confirm} onChange={e => setConfirm(e.target.value)} aria-invalid={!!errors.confirm} aria-describedby={errors.confirm ? "confirm-error" : undefined} />{fieldError("confirm")}</div>
          <div><label className="field-label" htmlFor="role">Register As</label><select id="role" className="field" value={role} onChange={e => setRole(e.target.value as Role)}><option value="student">Student</option><option value="instructor">Instructor</option></select></div>
          <div><label className="flex items-start gap-3 text-sm leading-6 text-slate-400"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={terms} onChange={e => setTerms(e.target.checked)} /> <span>I agree to the <Link href="/terms" className="text-blue-400 underline">Terms and Conditions</Link> and <Link href="/privacy" className="text-blue-400 underline">Privacy information</Link>.</span></label>{fieldError("terms")}</div>
        </> : <div className="flex flex-wrap justify-between gap-3 text-sm"><label className="flex items-center gap-2 text-slate-400"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />Remember Me</label><Link className="font-medium text-blue-400" href="/forgot-password">Forgot Password?</Link></div>}
        <button type="submit" disabled={!state.ready || busy} className="btn-primary w-full">{busy ? "Please wait?" : register ? "Create Account" : "Login"}<ArrowRight size={17} /></button>
      </form>
      <div className="my-5 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-800" />or continue with<span className="h-px flex-1 bg-slate-800" /></div>
      <div className="grid grid-cols-2 gap-3"><button type="button" className="btn-secondary" onClick={() => setMessage("Google sign-in is not configured. Please use your email and password.")}><Globe size={18} />Google</button><button type="button" className="btn-secondary" onClick={() => setMessage("Apple sign-in is not configured. Please use your email and password.")}><Apple size={18} />Apple</button></div>
      {message && <p className="notice mt-4" role="status">{message}</p>}
      {!register && <div className="mt-6 rounded-xl bg-slate-900 p-4"><p className="mb-3 text-xs font-semibold text-slate-400">Explore a sample workspace with its configured password</p><div className="flex flex-wrap gap-2">{[["Student", "student@learnova.demo"], ["Instructor", "instructor@learnova.demo"], ["Admin", "admin@learnova.demo"]].map(([label, value]) => <button key={label} disabled={!state.ready} className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-xs font-semibold text-blue-300" onClick={() => demo(value)}>{label}</button>)}</div></div>}
      <p className="mt-6 text-center text-sm text-slate-400">{register ? "Already have an account?" : "Don't have an account?"} <Link className="font-semibold text-blue-400" href={register ? "/login" : "/register"}>{register ? "Login" : "Sign Up"}</Link></p>
    </section>
  </div>;
}
