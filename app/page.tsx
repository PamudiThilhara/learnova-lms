"use client";
import Link from "next/link";
import Image from "next/image";
import { Search, ArrowRight, BookOpen, Users, Award, Clock3, BarChart3, ClipboardCheck, Code2, Palette, Megaphone, BriefcaseBusiness, ChartNoAxesCombined, Sparkles, GraduationCap } from "lucide-react";
import { useLearnova } from "@/components/LearnovaProvider";
import CourseCard from "@/components/CourseCard";
import { categories } from "@/data/courses";

const categoryIcons = [Code2, Palette, Megaphone, BriefcaseBusiness, ChartNoAxesCombined, Sparkles];
const benefits = [
  { icon: Users, title: "Expert Instructors", text: "Learn from educators who bring practical experience to every lesson." },
  { icon: Clock3, title: "Flexible Learning", text: "Build a learning schedule that fits your studies, work, and life." },
  { icon: ClipboardCheck, title: "Interactive Quizzes", text: "Put your knowledge to the test and get immediate feedback." },
  { icon: Award, title: "Certificates", text: "Celebrate your achievements with a certificate of completion." },
  { icon: BarChart3, title: "Progress Tracking", text: "See how far you have come and know what to learn next." },
  { icon: BookOpen, title: "Practical Assignments", text: "Apply new concepts to projects that strengthen your portfolio." },
];
export default function Home() {
  const { state } = useLearnova();
  return <>
    <section className="relative overflow-hidden bg-blue-50">
      <div className="absolute inset-0 bg-cover bg-center opacity-[0.06]" style={{ backgroundImage: "url('/images/blue-background.jpg')" }} />
      <div className="container-page relative grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-xs font-semibold text-blue-700"><GraduationCap size={16} />Your next chapter starts here</p>
          <h1 className="max-w-xl text-5xl font-bold leading-[1.1] tracking-tight text-slate-900 md:text-6xl">Learn Without <span className="text-blue-600">Limits</span></h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-500">Build your skills with expert-led online courses and interactive learning experiences.</p>
          <div className="mt-7 flex flex-wrap gap-3"><Link href="/courses" className="btn-primary">Explore Courses<ArrowRight size={17} /></Link><Link href="/register" className="btn-secondary">Get Started</Link></div>
          <form action="/courses" className="mt-8 flex max-w-lg gap-2 rounded-2xl border border-blue-100 bg-white p-2 shadow-sm">
            <label className="flex min-w-0 flex-1 items-center gap-2 px-2"><Search size={19} className="shrink-0 text-slate-400" /><span className="sr-only">Search for courses</span><input name="q" placeholder="What would you like to learn?" className="min-w-0 w-full py-2 text-sm outline-none" /></label><button className="btn-primary px-4" type="submit">Search</button>
          </form>
          <p className="mt-5 text-sm text-slate-500">Practical skills. Clear progress. Learning at your pace.</p>
        </div>
        <div className="relative mx-auto w-full max-w-lg">
          <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-lg">
            <div className="mb-4 flex items-center justify-between"><span className="text-sm font-bold text-slate-800">Your learning journey</span><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Keep growing</span></div>
            <div className="relative h-60 overflow-hidden rounded-2xl bg-blue-50"><Image src="/images/ux-design.jpg" alt="Explore design and creative learning with Learnova" fill preload className="object-contain p-3" sizes="(max-width: 1023px) 90vw, 450px" /></div>
            <div className="mt-5 grid grid-cols-3 gap-2">{[[BookOpen, "Learn"], [ClipboardCheck, "Practice"], [Award, "Achieve"]].map(([Icon, label]) => { const Symbol = Icon as typeof BookOpen; return <div key={String(label)} className="rounded-xl bg-blue-50 p-3 text-center"><Symbol size={20} className="mx-auto text-blue-600" /><p className="mt-2 text-xs font-semibold text-slate-700">{String(label)}</p></div>; })}</div>
          </div>
        </div>
      </div>
    </section>
    <section className="container-page py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-600">Discover your next skill</p><h2 className="text-3xl font-bold text-slate-900">Popular Courses</h2><p className="mt-3 text-slate-500">Start with a favorite from our learning community.</p></div><Link href="/courses" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600">View all courses<ArrowRight size={17} /></Link></div>
      <div className="grid gap-7 md:grid-cols-3">{state.courses.slice(0, 3).map(course => <CourseCard key={course.id} course={course} />)}</div>
    </section>
    <section className="border-y border-blue-100 bg-white py-16"><div className="container-page"><h2 className="text-center text-3xl font-bold text-slate-900">Find your direction</h2><p className="mt-3 text-center text-slate-500">Explore a subject that sparks your curiosity.</p><div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{categories.map((category, i) => { const Icon = categoryIcons[i]; return <Link key={category} href={`/courses?category=${encodeURIComponent(category)}`} className="panel flex items-center gap-4 p-5 transition hover:border-blue-300"><span className="rounded-xl bg-blue-50 p-3 text-blue-600"><Icon size={24} /></span><div><h3 className="font-bold text-slate-800">{category}</h3><p className="mt-1 text-xs text-slate-500">{state.courses.filter(c => c.category === category).length} courses to explore</p></div><ArrowRight className="ml-auto text-blue-400" size={18} /></Link>; })}</div></div></section>
    <section id="features" className="container-page py-16"><h2 className="text-center text-3xl font-bold text-slate-900">Why Choose Learnova</h2><p className="mt-3 text-center text-slate-500">Everything you need to turn curiosity into capability.</p><div className="mt-9 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{benefits.map(({ icon: Icon, title, text }) => <div key={title} className="panel p-6"><Icon className="mb-5 text-blue-600" size={28} /><h3 className="text-lg font-bold text-slate-900">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-500">{text}</p></div>)}</div></section>
    <section className="bg-blue-600 py-10 text-white"><div className="container-page grid grid-cols-2 gap-8 text-center md:grid-cols-4">{[["10K+", "Students"], ["50+", "Courses"], ["20+", "Instructors"], ["95%", "Satisfaction"]].map(([value, label]) => <div key={label}><p className="text-4xl font-bold">{value}</p><p className="mt-2 text-sm text-blue-100">{label}</p></div>)}</div><p className="mt-7 text-center text-xs text-blue-100">Illustrative community statistics for this Learnova preview.</p></section>
    <section id="community" className="container-page py-16"><div className="panel px-6 py-12 text-center md:px-12"><h2 className="text-3xl font-bold text-slate-900">Make room for your next achievement.</h2><p className="mx-auto mt-4 max-w-xl leading-7 text-slate-500">Choose a course, build your confidence, and take the next step with Learnova.</p><Link className="btn-primary mt-7" href="/register">Start Learning Today<ArrowRight size={17} /></Link></div></section>
  </>;
}
