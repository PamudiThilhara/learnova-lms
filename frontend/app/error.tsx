"use client";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <div className="container-page py-20 text-center"><AlertCircle className="mx-auto text-blue-600" size={44} /><h1 className="mt-5 text-3xl font-bold">We could not load this page.</h1><p className="mt-4 text-slate-500">Please try again, or return to your courses.</p><div className="mt-7 flex flex-wrap justify-center gap-3"><button className="btn-primary" onClick={retry}>Try Again</button><Link className="btn-secondary" href="/courses">Explore Courses</Link></div></div>;
}
