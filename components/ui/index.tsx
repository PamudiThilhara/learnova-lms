import Link from "next/link";
import { BookOpen, ArrowRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({ title, description, eyebrow, action }: { title: string; description?: string; eyebrow?: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-wrap items-start justify-between gap-4"><div>{eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">{eyebrow}</p>}<h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">{title}</h1>{description && <p className="mt-3 max-w-2xl leading-7 text-slate-500">{description}</p>}</div>{action}</div>;
}
export function DashboardCard({ label, value, icon: Icon = BookOpen, detail }: { label: string; value: string | number; icon?: LucideIcon; detail?: string }) {
  return <div className="panel p-5"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-500">{label}</p><span className="rounded-xl bg-blue-50 p-2.5 text-blue-600"><Icon size={20} aria-hidden="true" /></span></div><p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>{detail && <p className="mt-2 text-xs text-slate-500">{detail}</p>}</div>;
}
export function ProgressBar({ value, label = "Course progress", showLabel = true }: { value: number; label?: string; showLabel?: boolean }) {
  const progress = Math.max(0, Math.min(100, value));
  return <div>{showLabel && <div className="mb-2 flex justify-between gap-3 text-sm"><span className="text-slate-500">{label}</span><span className="font-semibold text-blue-600">{progress}%</span></div>}<div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="h-2.5 overflow-hidden rounded-full bg-blue-50"><div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }} /></div></div>;
}
export function EmptyState({ title = "Nothing here yet", description, href, action = "Explore courses" }: { title?: string; description: string; href?: string; action?: string }) {
  return <div className="panel px-6 py-14 text-center"><BookOpen className="mx-auto mb-4 text-blue-400" size={36} aria-hidden="true" /><h2 className="text-xl font-bold text-slate-900">{title}</h2><p className="mx-auto mt-3 max-w-md text-slate-500">{description}</p>{href && <Link className="btn-primary mt-6" href={href}>{action}<ArrowRight size={16} /></Link>}</div>;
}
export function StatusBadge({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "green" | "amber" | "red" }) {
  const colors = { blue: "bg-blue-50 text-blue-700", green: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700", red: "bg-red-50 text-red-700" };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${colors[tone]}`}>{children}</span>;
}
export function LoadingCards() {
  return <div className="container-page py-12" role="status" aria-label="Loading Learnova"><div className="mb-8 h-10 w-60 animate-pulse rounded-lg bg-blue-100" /><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map(i => <div key={i} className="panel h-64 animate-pulse bg-blue-50" />)}</div><span className="sr-only">Loading…</span></div>;
}
