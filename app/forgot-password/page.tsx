"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState(""); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  function submit(e: FormEvent) { e.preventDefault(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Enter a valid email address."); return; } setError(""); setMessage("This is a frontend preview, so no reset email was sent. You can return to login and select a demo account."); }
  return <div className="container-page py-16"><div className="panel mx-auto max-w-md p-8"><h1 className="text-2xl font-bold">Forgot your password?</h1><p className="mt-3 text-sm leading-7 text-slate-500">Enter your email to preview the password recovery flow.</p><form className="mt-6 space-y-4" onSubmit={submit} noValidate><label className="field-label" htmlFor="reset-email">Email</label><input id="reset-email" className="field" type="email" value={email} onChange={e => setEmail(e.target.value)} />{error && <p className="form-error" role="alert">{error}</p>}<button className="btn-primary w-full">Request Reset</button></form>{message && <p className="notice mt-5" role="status">{message}</p>}<Link href="/login" className="mt-6 inline-block text-sm font-semibold text-blue-600">Back to Login</Link></div></div>;
}
