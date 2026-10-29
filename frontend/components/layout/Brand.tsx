import Link from "next/link";
import { GraduationCap } from "lucide-react";
export default function Brand() {
  return <Link href="/" className="inline-flex shrink-0 items-center gap-2" aria-label="Learnova home"><span className="rounded-xl bg-blue-600 p-2 text-white"><GraduationCap size={25} aria-hidden="true" /></span><span className="text-xl font-bold tracking-tight text-slate-900">Learn<span className="text-blue-600">ova</span></span></Link>;
}
