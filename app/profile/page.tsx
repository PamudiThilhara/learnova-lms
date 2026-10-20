"use client";
import Image from "next/image";
import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Save, UserRound } from "lucide-react";
import { useLearnova } from "@/components/LearnovaProvider";
import { LoadingCards, PageHeader, StatusBadge } from "@/components/ui";
import type { User } from "@/data/users";
export default function ProfilePage() {
  const { state, user, learner } = useLearnova();
  const router = useRouter();
  useEffect(() => { if (state.ready && !user) router.replace("/login"); }, [state.ready, user, router]);
  if (!state.ready || !user) return <LoadingCards />;
  return <ProfileForm key={(user ?? learner).id} person={user ?? learner} />;
}
function ProfileForm({ person }: { person: User }) {
  const { state, user, dispatch } = useLearnova(); const [editing, setEditing] = useState(false); const [draft, setDraft] = useState(person); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (draft.name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) { setError("Enter your full name and a valid email."); return; }
    if (state.users.some(u => u.id !== person.id && u.email.toLowerCase() === draft.email.trim().toLowerCase())) { setError("This email belongs to another account."); return; }
    if (draft.phone.trim() && !/^[+\d\s()-]{7,25}$/.test(draft.phone.trim())) { setError("Enter a valid phone number, or leave it blank."); return; }
    if (!(await dispatch({ type: "profile", user: { ...draft, name: draft.name.trim(), email: draft.email.trim().toLowerCase(), phone: draft.phone.trim() } })).ok) return; setError(""); setEditing(false); setMessage("Profile changes saved.");
  }
  return <div className="container-page max-w-4xl py-10"><PageHeader title="My Profile" description="Introduce yourself to your learning community." action={<button className="btn-secondary" onClick={() => { setEditing(true); setMessage(""); }}><Pencil size={16} />Edit Profile</button>} />{!user && <p className="notice mb-6">You are editing the sample student profile. <Link href="/login" className="font-semibold underline">Sign in</Link> to edit your own local account.</p>}<form className="panel p-6 md:p-9" onSubmit={submit} noValidate><div className="mb-8 flex flex-wrap items-center gap-5"><div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-blue-50">{draft.avatar ? <Image src={draft.avatar} alt="Profile photo" fill unoptimized className="object-cover" sizes="96px" /> : <UserRound size={40} className="text-blue-500" />}</div><div><h2 className="text-xl font-bold">{person.name}</h2><div className="mt-2"><StatusBadge>{person.role}</StatusBadge></div>{editing && <label className="mt-3 block text-xs text-slate-500">Profile picture · PNG, JPEG or WebP under 200 KB<input type="file" accept="image/png,image/jpeg,image/webp" className="mt-2 block max-w-full" onChange={e => { const file = e.target.files?.[0]; if (!file) return; if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 200 * 1024) { setError("Choose a PNG, JPEG or WebP under 200 KB."); return; } const reader = new FileReader(); reader.onload = () => { setDraft({ ...draft, avatar: String(reader.result) }); setError(""); }; reader.readAsDataURL(file); }} /></label>}</div></div><div className="grid gap-5 sm:grid-cols-2">{[["Full Name", "name"], ["Email", "email"], ["Phone", "phone"]].map(([label, field]) => <label key={field}><span className="field-label">{label}</span><input className="field" type={field === "email" ? "email" : field === "phone" ? "tel" : "text"} value={draft[field as "name" | "email" | "phone"]} disabled={!editing} onChange={e => setDraft({ ...draft, [field]: e.target.value })} /></label>)}<label><span className="field-label">Role</span><input className="field capitalize" value={person.role} disabled /></label><label className="sm:col-span-2"><span className="field-label">Bio</span><textarea className="field min-h-28" value={draft.bio} disabled={!editing} onChange={e => setDraft({ ...draft, bio: e.target.value })} /></label></div>{error && <p className="form-error mt-5" role="alert">{error}</p>}{message && <p className="notice mt-5" role="status">{message}</p>}{editing && <div className="mt-7 flex gap-3"><button className="btn-primary"><Save size={16} />Save Changes</button><button type="button" className="btn-secondary" onClick={() => { setDraft(person); setEditing(false); setError(""); }}>Cancel</button></div>}</form></div>;
}
