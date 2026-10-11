"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Apple, Globe, Eye, EyeOff, ArrowRight, GraduationCap } from "lucide-react";
import { useLearnova } from "@/components/LearnovaProvider";
import { dashboardPath, type Role, type User } from "@/data/users";
export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const register = mode === "register"; const router = useRouter();
  const { state, login, dispatch, rememberUser } = useLearnova();
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<Role>("student"); const [remember, setRemember] = useState(false); const [terms, setTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false); const [errors, setErrors] = useState<Record<string, string>>({}); const [message, setMessage] = useState("");
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function submit(e: FormEvent) {
    e.preventDefault(); const next: Record<string, string> = {};
    if (register && name.trim().length < 2) next.name = "Enter your full name (at least 2 characters).";
    if (!emailValid.test(email.trim())) next.email = "Enter a valid email address.";
    if (password.length < 8) next.password = "Use at least 8 characters.";
    if (register && password !== confirm) next.confirm = "Passwords do not match.";
    if (register && !terms) next.terms = "Accept the terms to continue.";
    if (register && state.users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) next.email = "This email already has a local account. Please log in.";
    setErrors(next); setMessage(""); if (Object.keys(next).length) return;
    if (register) {
      const user: User = { id: crypto.randomUUID(), name: name.trim(), email: email.trim().toLowerCase(), role, phone: "", bio: "", avatar: "", status: "Active", joined: new Date().toISOString() };
      dispatch({ type: "register", user }); rememberUser(user.id, false); router.push(dashboardPath(role));
    } else {
      const found = login(email, remember);
      if (!found) { setErrors({ email: "No active local account matches this email. Register or choose a demo account below." }); return; }
      router.push(dashboardPath(found.role));
    }
  }
  function demo(email: string) { const found = login(email, remember); if (found) router.push(dashboardPath(found.role)); else setMessage("This demo account is unavailable. Restore demo data in admin settings."); }
  const fieldError = (field: string) => errors[field] ? <p id={`${field}-error`} className="form-error">{errors[field]}</p> : null;
  return <div className="container-page grid items-center gap-12 py-12 lg:grid-cols-2">
    <section className="hidden lg:block"><p className="mb-4 text-xs font-bold uppercase tracking-widest text-blue-600">Your learning, your future</p><h1 className="max-w-lg text-5xl font-bold leading-tight text-slate-900">{register ? "Great things start with a little curiosity." : "Your next achievement is waiting."}</h1><p className="mt-6 max-w-md text-lg leading-8 text-slate-500">Expert-led courses, practical assignments, and a clear path from your first lesson to your certificate.</p><div className="panel mt-9 max-w-md p-6"><GraduationCap size={32} className="text-blue-600" /><p className="mt-4 font-semibold text-slate-800">One place for every step of learning.</p><p className="mt-2 text-sm leading-7 text-slate-500">Explore programming, design, marketing, and more. Build skills you can put into practice.</p></div></section>
    <section className="panel mx-auto w-full max-w-lg p-6 sm:p-9">
      <h2 className="text-3xl font-bold text-slate-900">{register ? "Create Account" : "Welcome Back"}</h2><p className="mt-2 text-sm text-slate-500">{register ? "Start your learning journey with Learnova." : "Sign in to continue your learning journey."}</p>
      <p className="notice mt-5">Frontend preview: accounts are local to this browser. Passwords are validated for this form but are not stored or verified. Do not use a real password.</p>
      <form onSubmit={submit} noValidate className="mt-6 space-y-5">
        {register && <div><label className="field-label" htmlFor="name">Full Name</label><input id="name" className="field" autoComplete="name" value={name} onChange={e => setName(e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} />{fieldError("name")}</div>}
        <div><label className="field-label" htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" className="field" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} />{fieldError("email")}</div>
        <div><label className="field-label" htmlFor="password">Password</label><div className="relative"><input id="password" type={showPassword ? "text" : "password"} autoComplete={register ? "new-password" : "current-password"} className="field pr-12" value={password} onChange={e => setPassword(e.target.value)} aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined} placeholder="At least 8 characters" /><button type="button" className="absolute right-3 top-3 text-slate-400" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button></div>{fieldError("password")}</div>
        {register ? <>
          <div><label className="field-label" htmlFor="confirm">Confirm Password</label><input id="confirm" type="password" autoComplete="new-password" className="field" value={confirm} onChange={e => setConfirm(e.target.value)} aria-invalid={!!errors.confirm} aria-describedby={errors.confirm ? "confirm-error" : undefined} />{fieldError("confirm")}</div>
          <div><label className="field-label" htmlFor="role">Register As</label><select id="role" className="field" value={role} onChange={e => setRole(e.target.value as Role)}><option value="student">Student</option><option value="instructor">Instructor</option></select></div>
          <div><label className="flex items-start gap-3 text-sm leading-6 text-slate-500"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={terms} onChange={e => setTerms(e.target.checked)} /> <span>I agree to the <Link href="/terms" className="text-blue-600 underline">Terms and Conditions</Link> and <Link href="/privacy" className="text-blue-600 underline">Privacy information</Link>.</span></label>{fieldError("terms")}</div>
        </> : <div className="flex flex-wrap justify-between gap-3 text-sm"><label className="flex items-center gap-2 text-slate-500"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />Remember Me</label><Link className="font-medium text-blue-600" href="/forgot-password">Forgot Password?</Link></div>}
        <button type="submit" disabled={!state.ready} className="btn-primary w-full">{register ? "Create Account" : "Login"}<ArrowRight size={17} /></button>
      </form>
      <div className="my-5 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-100" />or continue with<span className="h-px flex-1 bg-slate-100" /></div>
      <div className="grid grid-cols-2 gap-3"><button type="button" className="btn-secondary" onClick={() => setMessage("Google sign-in is a UI preview. Choose a local demo account or use the form.")}><Globe size={18} />Google</button><button type="button" className="btn-secondary" onClick={() => setMessage("Apple sign-in is a UI preview. Choose a local demo account or use the form.")}><Apple size={18} />Apple</button></div>
      {message && <p className="notice mt-4" role="status">{message}</p>}
      {!register && <div className="mt-6 rounded-xl bg-slate-50 p-4"><p className="mb-3 text-xs font-semibold text-slate-500">Explore a demo workspace — no password needed</p><div className="flex flex-wrap gap-2">{[["Student", "student@learnova.demo"], ["Instructor", "instructor@learnova.demo"], ["Admin", "admin@learnova.demo"]].map(([label, value]) => <button key={label} disabled={!state.ready} className="rounded-lg border border-blue-100 bg-white px-3 py-2 text-xs font-semibold text-blue-700" onClick={() => demo(value)}>{label}</button>)}</div></div>}
      <p className="mt-6 text-center text-sm text-slate-500">{register ? "Already have an account?" : "Don't have an account?"} <Link className="font-semibold text-blue-600" href={register ? "/login" : "/register"}>{register ? "Login" : "Sign Up"}</Link></p>
    </section>
  </div>;
}
