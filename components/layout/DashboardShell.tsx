"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, BookOpen, ClipboardList, ListChecks, BarChart3, Award, UserRound, LogOut, PlusCircle, Users, Settings, GraduationCap, FileChartColumn } from "lucide-react";
import { useLearnova } from "@/components/LearnovaProvider";
import type { Role } from "@/data/users";
import { useEffect, type ReactNode } from "react";
import { dashboardPath } from "@/data/users";
import { LoadingCards } from "@/components/ui";
const links = {
  student: [{ title: "Dashboard", path: "", icon: LayoutDashboard }, { title: "My Courses", path: "/courses", icon: BookOpen }, { title: "Assignments", path: "/assignments", icon: ClipboardList }, { title: "Quizzes", path: "/quizzes", icon: ListChecks }, { title: "Progress", path: "/progress", icon: BarChart3 }, { title: "Certificates", path: "/certificates", icon: Award }],
  instructor: [{ title: "Dashboard", path: "", icon: LayoutDashboard }, { title: "My Courses", path: "/courses", icon: BookOpen }, { title: "Create Course", path: "/courses/create", icon: PlusCircle }, { title: "Students", path: "/students", icon: Users }, { title: "Assignments", path: "/assignments", icon: ClipboardList }, { title: "Quizzes", path: "/quizzes", icon: ListChecks }],
  admin: [{ title: "Dashboard", path: "", icon: LayoutDashboard }, { title: "Users", path: "/users", icon: Users }, { title: "Students", path: "/students", icon: GraduationCap }, { title: "Instructors", path: "/instructors", icon: UserRound }, { title: "Courses", path: "/courses", icon: BookOpen }, { title: "Reports", path: "/reports", icon: FileChartColumn }, { title: "Settings", path: "/settings", icon: Settings }],
};
export default function DashboardShell({ role, children }: { role: Role; children: ReactNode }) {
  const pathname = usePathname(); const router = useRouter(); const { user, state, logout } = useLearnova();
  const allowed = user && (user.role === role || (user.role === 'admin' && role === 'instructor'));
  useEffect(() => { if (state.ready && !allowed) router.replace(user ? dashboardPath(user.role) : "/login"); }, [state.ready, allowed, user, router]);
  if (!state.ready || !allowed) return <LoadingCards />;
  const base = `/${role}-dashboard`;
  return <div className="container-page grid gap-6 py-6 lg:grid-cols-[225px_minmax(0,1fr)] lg:py-9">
    <aside className="no-print min-w-0">
      <div className="panel lg:sticky lg:top-26">
        <div className="border-b border-blue-50 p-5"><p className="text-xs font-bold uppercase tracking-widest text-blue-600">Learning workspace</p><p className="mt-2 font-bold capitalize text-slate-800">{role} portal</p></div>
        <nav aria-label={`${role} dashboard`} className="flex gap-1 overflow-x-auto p-3 lg:flex-col">
          {links[role].map(({ title, path, icon: Icon }) => { const href = base + path; const active = pathname === href; return <Link key={title} href={href} aria-current={active ? "page" : undefined} className={`flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3 py-3 text-sm font-semibold ${active ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-blue-50 hover:text-blue-700"}`}><Icon size={18} />{title}</Link>; })}
          <Link href="/profile" className="menu-link shrink-0 whitespace-nowrap"><UserRound size={18} />Profile</Link>
          <button className="menu-link shrink-0 whitespace-nowrap" onClick={async () => { if (await logout()) router.push("/login"); }}><LogOut size={18} />Logout</button>
        </nav>
      </div>
    </aside>
    <div className="min-w-0">
      {(!user || !allowed) && <div className="notice mb-6 flex flex-wrap items-center justify-between gap-3"><span>Sign in to access your {role} workspace.</span><Link href="/login" className="font-semibold underline">Sign in</Link></div>}
      {state.storageWarning && <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800" role="status">{state.storageWarning}</p>}
      {children}
    </div>
  </div>;
}
