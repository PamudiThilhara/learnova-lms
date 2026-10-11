import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
export default function NotFound() {
  return <div className="container-page py-20 text-center"><p className="text-7xl font-bold text-blue-200">404</p><BookOpen size={42} className="mx-auto mt-7 text-blue-600" /><h1 className="mt-5 text-3xl font-bold text-slate-900">This page took a study break.</h1><p className="mx-auto mt-4 max-w-md leading-7 text-slate-500">The page or course you are looking for could not be found. Let&apos;s get you back to learning.</p><div className="mt-7 flex flex-wrap justify-center gap-3"><Link className="btn-primary" href="/"><ArrowLeft size={16} />Go Home</Link><Link className="btn-secondary" href="/courses">Explore Courses</Link></div></div>;
}
