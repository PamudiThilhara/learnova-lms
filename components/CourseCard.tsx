import Image from "next/image";
import Link from "next/link";
import { Star, Clock3, Users, ArrowRight } from "lucide-react";
import { type Course } from "@/data/courses";
import { money } from "@/lib/learnova-state";
import { ProgressBar, StatusBadge } from "@/components/ui";

export default function CourseCard({ course, progress }: { course: Course; progress?: number }) {
  return <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md">
    <Link href={`/courses/${course.id}`} tabIndex={-1} aria-hidden="true" className="relative block h-48 bg-blue-50/50">
      <Image src={course.image} alt="" fill sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw" className="object-contain p-3" />
    </Link>
    <div className="flex flex-1 flex-col p-5">
      <div className="mb-3 flex flex-wrap gap-2"><StatusBadge>{course.category}</StatusBadge><span className="py-1 text-xs text-slate-500">{course.level}</span></div>
      <h3 className="text-xl font-bold text-slate-900"><Link href={`/courses/${course.id}`} className="hover:text-blue-600">{course.title}</Link></h3>
      <p className="mt-2 text-sm text-slate-500">{course.instructor}</p>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">{course.description}</p>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1"><Star size={14} className="fill-amber-400 text-amber-400" />{course.rating.toFixed(1)}</span>
        <span className="inline-flex items-center gap-1"><Users size={14} />{course.students.toLocaleString("en-US")}</span>
        <span className="inline-flex items-center gap-1"><Clock3 size={14} />{course.duration}</span>
      </div>
      <div className="mt-auto pt-5">
        {progress !== undefined ? <ProgressBar value={progress} /> : <p className="text-lg font-bold text-slate-900">{money(course.price)}</p>}
        <Link href={progress !== undefined ? `/courses/${course.id}/learn` : `/courses/${course.id}`} className="btn-primary mt-4 w-full">{progress !== undefined ? "Continue Learning" : "View Course"}<ArrowRight size={16} /></Link>
      </div>
    </div>
  </article>;
}
