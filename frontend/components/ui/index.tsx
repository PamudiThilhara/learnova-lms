import Link from "next/link";
import { BookOpen, ArrowRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import Artwork from './Artwork';
import type { Asset } from '@/lib/assets';

export function PageHeader({ title, description, eyebrow, action, art }: { title: string; description?: string; eyebrow?: string; action?: ReactNode; art?: Asset }) {
  if (art) return <div className="workspace-welcome flex items-center justify-between gap-5"><div className="relative z-10 min-w-0"><p className="eyebrow mb-3">{eyebrow ?? 'Your Learnova workspace'}</p><h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>{description && <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">{description}</p>}{action && <div className="mt-5">{action}</div>}</div><Artwork name={art} className="hidden aspect-[1.7] w-[240px] shrink-0 rounded-xl xl:block" /></div>;
  return <div className="mb-8 flex flex-wrap items-start justify-between gap-4"><div>{eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-400">{eyebrow}</p>}<h1 className="text-3xl font-bold tracking-tight text-slate-50 md:text-4xl">{title}</h1>{description && <p className="mt-3 max-w-2xl leading-7 text-slate-400">{description}</p>}</div>{action}</div>;
}
export function DashboardCard({ label, value, icon: Icon = BookOpen, detail }: { label: string; value: string | number; icon?: LucideIcon; detail?: string }) {
  return <div className="panel p-5"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-400">{label}</p><span className="rounded-xl bg-blue-500/10 p-2.5 text-blue-400"><Icon size={20} aria-hidden="true" /></span></div><p className="mt-3 text-3xl font-bold text-slate-50">{value}</p>{detail && <p className="mt-2 text-xs text-slate-400">{detail}</p>}</div>;
}
export function ProgressBar({ value, label = "Course progress", showLabel = true }: { value: number; label?: string; showLabel?: boolean }) {
  const progress = Math.round(Math.max(0, Math.min(100, value)));
  return <div>{showLabel && <div className="mb-2 flex justify-between gap-3 text-sm"><span className="text-slate-400">{label}</span><span className="font-semibold text-blue-400">{progress}%</span></div>}<div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="h-2.5 overflow-hidden rounded-full bg-blue-500/10"><div className="h-full rounded-full bg-violet-600 transition-all duration-500" style={{ width: `${progress}%` }} /></div></div>;
}
export function EmptyState({ title = "Nothing here yet", description, href, action = "Explore courses" }: { title?: string; description: string; href?: string; action?: string }) {
  return <div className="panel px-6 py-14 text-center"><BookOpen className="mx-auto mb-4 text-blue-400" size={36} aria-hidden="true" /><h2 className="text-xl font-bold text-slate-50">{title}</h2><p className="mx-auto mt-3 max-w-md text-slate-400">{description}</p>{href && <Link className="btn-primary mt-6" href={href}>{action}<ArrowRight size={16} /></Link>}</div>;
}
export function StatusBadge({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "green" | "amber" | "red" }) {
  const colors = { blue: "bg-blue-500/10 text-blue-300", green: "bg-emerald-500/10 text-emerald-300", amber: "bg-amber-500/10 text-amber-300", red: "bg-red-500/10 text-red-300" };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${colors[tone]}`}>{children}</span>;
}
export function LoadingCards() {
  return <div className="container-page py-12" role="status" aria-label="Loading Learnova"><div className="mb-8 h-10 w-60 animate-pulse rounded-lg bg-blue-500/20" /><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map(i => <div key={i} className="panel h-64 animate-pulse bg-blue-500/10" />)}</div><span className="sr-only">Loading…</span></div>;
}
