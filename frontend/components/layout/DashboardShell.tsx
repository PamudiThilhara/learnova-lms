"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, BookOpen, ClipboardList, ListChecks, BarChart3, Award, UserRound, LogOut, PlusCircle, Users, Settings, GraduationCap, FileChartColumn, Sparkles, History, Menu, ChevronRight } from "lucide-react";
import { useLearnova } from "@/components/LearnovaProvider";
import type { Role } from "@/data/users";
import { useEffect, useState, type ReactNode } from "react";
import { dashboardPath } from "@/data/users";
import { LoadingCards } from "@/components/ui";
const links = {
 student: [{ title: "Overview", path: "", icon: LayoutDashboard }, { title: "My Courses", path: "/courses", icon: BookOpen }, { title: "Assignments", path: "/assignments", icon: ClipboardList }, { title: "Quizzes", path: "/quizzes", icon: ListChecks }, { title: "Progress", path: "/progress", icon: BarChart3 }, { title: "Certificates", path: "/certificates", icon: Award }, { title: "AI PDF Quiz", path: "/ai-quizzes", icon: Sparkles }, { title: "Quiz History", path: "/ai-quizzes/history", icon: History }],
 instructor: [{ title: "Overview", path: "", icon: LayoutDashboard }, { title: "My Courses", path: "/courses", icon: BookOpen }, { title: "Create Course", path: "/courses/create", icon: PlusCircle }, { title: "Students", path: "/students", icon: Users }, { title: "Assignments", path: "/assignments", icon: ClipboardList }, { title: "Quizzes", path: "/quizzes", icon: ListChecks }],
 admin: [{ title: "Overview", path: "", icon: LayoutDashboard }, { title: "Users", path: "/users", icon: Users }, { title: "Students", path: "/students", icon: GraduationCap }, { title: "Instructors", path: "/instructors", icon: UserRound }, { title: "Courses", path: "/courses", icon: BookOpen }, { title: "Enrollments", path: "/enrollments", icon: ClipboardList }, { title: "Reports", path: "/reports", icon: FileChartColumn }, { title: "Settings", path: "/settings", icon: Settings }],
};
export default function DashboardShell({ role, children }: { role: Role; children: ReactNode }) {
 const pathname = usePathname(); const router = useRouter(); const { user, state, logout } = useLearnova();
 const [expanded,setExpanded]=useState(false);
 const allowed = user && (user.role === role || (user.role === 'admin' && role === 'instructor'));
 useEffect(() => { if (state.ready && !allowed) router.replace(user ? dashboardPath(user.role) : "/login"); }, [state.ready, allowed, user, router]);
 if (!state.ready || !allowed) return <LoadingCards />;
 const base = `/${role}-dashboard`;
 return <div className="container-page grid items-start gap-6 py-6 lg:grid-cols-[224px_minmax(0,1fr)] lg:py-8">
  <aside className="no-print min-w-0 lg:sticky lg:top-28">
   <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
    <div className="flex items-center justify-between border-b border-white/10 px-5 py-5"><div><p className="eyebrow">Your workspace</p><p className="mt-2 text-sm font-semibold capitalize">{role} portal</p></div><button onClick={()=>setExpanded(!expanded)} className="rounded-lg p-2 text-slate-300 lg:hidden" aria-label="Toggle workspace navigation" aria-expanded={expanded} aria-controls="workspace-navigation"><Menu size={20}/></button></div>
    <nav id="workspace-navigation" aria-label={`${role} dashboard`} className={`${expanded?'block':'hidden'} space-y-1 p-3 lg:block`}>
     {links[role].map(({ title,path,icon:Icon })=>{const href=base+path;const active=pathname===href||(path==='/ai-quizzes'&&pathname.startsWith(href+'/')&&!pathname.startsWith(base+'/ai-quizzes/history'));return <Link key={title} href={href} onClick={()=>setExpanded(false)} aria-current={active?'page':undefined} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${active?'border border-violet-400/25 bg-violet-500/15 text-violet-200':'border border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-100'}`}><Icon size={18}/>{title}{active&&<ChevronRight size={14} className="ml-auto"/>}</Link>;})}
     <div className="my-3 border-t border-white/10"/>
     <Link href="/profile" className="menu-link" onClick={()=>setExpanded(false)}><UserRound size={18}/>My Profile</Link>
     <button className="menu-link w-full" onClick={async()=>{if(await logout())router.push('/login');}}><LogOut size={18}/>Sign out</button>
    </nav>
   </div>
   {role==='student'&&<Link href={base+'/ai-quizzes'} className="mt-4 hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/15 to-blue-500/5 p-5 lg:block"><Sparkles size={22} className="text-violet-300"/><p className="mt-3 text-sm font-semibold">Make your notes work harder.</p><p className="mt-2 text-xs leading-6 text-slate-400">Create a focused quiz from your lecture PDFs.</p><span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-violet-300">Create a quiz<ChevronRight size={14}/></span></Link>}
  </aside>
  <div className="min-w-0">{state.storageWarning&&<p className="notice mb-5" role="status">{state.storageWarning}</p>}{children}</div>
 </div>;
}
