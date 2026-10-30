"use client";
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Search, Sparkles, ShieldCheck, BookOpen, Clock3, Mail } from 'lucide-react';
import { useLearnova } from '@/components/LearnovaProvider';
import CourseCard from '@/components/CourseCard';
import Artwork from '@/components/ui/Artwork';
import { EmptyState } from '@/components/ui';
import { categories } from '@/data/courses';
import type { Asset } from '@/lib/assets';
const benefits: {image:Asset; title:string; text:string}[] = [
 {image:'courseIcon',title:'Knowledge you can use',text:'Go from the first concept to a practical project, one clear lesson at a time.'},
 {image:'quizIcon',title:'Practice that makes it stick',text:'Check your understanding with course assessments and quizzes from your own PDF notes.'},
 {image:'certificateIcon',title:'Make progress visible',text:'Finish your lessons, pass your assessments, and celebrate with a completion certificate.'},
 {image:'progressIcon',title:'Your journey, in focus',text:'Pick up where you left off with progress saved to your account.'},
 {image:'instructorIcon',title:'Learn with your instructors',text:'Follow a thoughtful curriculum and get feedback on your practical assignments.'},
 {image:'studentsIcon',title:'A space for every learner',text:'Explore new subjects at your own pace, wherever you are learning from.'},
];
export default function Home() {
 const {state,user}=useLearnova();
 const publishedCourses = state.courses.filter(course => course.status !== 'draft');
 return <>
  <section className="hero-surface relative overflow-hidden border-b border-white/10">
   <div className="container-page grid items-center gap-10 pb-16 pt-12 lg:grid-cols-[1.05fr_1fr] lg:py-20">
    <div className="relative z-10">
     <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-4 py-2 text-xs font-medium text-violet-200"><span className="h-1.5 w-1.5 rounded-full bg-cyan-400"/>A brighter future starts with curiosity</p>
     <h1 className="text-5xl font-bold leading-[1.12] tracking-[-0.045em] sm:text-6xl xl:text-[68px]">Learn Today.<br/><span className="gradient-text">Build Tomorrow.</span></h1>
     <p className="mt-6 max-w-lg text-base leading-8 text-slate-400 sm:text-lg">Big ambitions start with small steps. Discover practical courses, test your knowledge, and build the skills for whatever comes next.</p>
     <div className="mt-8 flex flex-wrap gap-3"><Link href={user?'/courses':'/register'} className="btn-primary">Get Started<ArrowRight size={17}/></Link><Link href="/courses" className="btn-secondary">Explore Courses<ArrowUpRight size={17}/></Link></div>
     <div className="mt-7 flex flex-wrap gap-5 text-xs text-slate-400"><span className="flex items-center gap-2"><ShieldCheck size={15} className="text-cyan-400"/>Your progress, saved</span><span className="flex items-center gap-2"><Clock3 size={15} className="text-violet-300"/>Learn at your pace</span></div>
    </div>
    <div className="relative mx-auto w-full max-w-xl py-5">
     <div className="absolute inset-8 rounded-full bg-violet-600/15 blur-3xl"/>
     <Artwork name="hero" priority alt="Student learning with a laptop, surrounded by glowing learning tools" className="aspect-[566/323] rounded-3xl border border-white/10 shadow-2xl shadow-violet-950/30"/>
     <div className="relative -mt-7 ml-5 mr-5 flex items-center gap-3 rounded-2xl border border-white/15 bg-slate-900/95 p-4 shadow-xl sm:ml-10 sm:mr-10"><span className="rounded-xl bg-violet-500/15 p-3 text-violet-300"><BookOpen size={22}/></span><div><p className="text-sm font-semibold">Your next chapter is yours to write.</p><p className="mt-1 text-xs text-slate-400">Learn. Practice. Build something that matters.</p></div></div>
    </div>
   </div>
   <div className="container-page pb-8"><div className="grid gap-6 border-t border-white/10 pt-7 sm:grid-cols-3">{[[state.stats?.students,'Curious learners'],[state.courses.length,'Courses to explore'],[state.stats?.instructors,'Instructors sharing knowledge']].map(([value,label])=><div key={String(label)} className="flex items-center gap-4"><p className="text-3xl font-bold tracking-tight">{state.storageWarning||!state.ready?'—':value??'—'}</p><p className="max-w-36 text-sm text-slate-400">{label}</p></div>)}</div></div>
  </section>
  <section className="container-page py-14 md:py-20">
   <div className="mb-8 flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow mb-3">Find your next skill</p><h2 className="text-3xl font-bold tracking-tight">A new possibility in every course.</h2><p className="mt-3 text-slate-400">Explore what our learning community is building.</p></div><Link href="/courses" className="inline-flex items-center gap-2 text-sm font-medium text-violet-300">Explore the catalog<ArrowUpRight size={17}/></Link></div>
   {state.storageWarning&&<p className="notice mb-6" role="status">{state.storageWarning}</p>}
   <form action="/courses" className="mb-7 flex max-w-xl items-center gap-3 rounded-xl border border-white/15 bg-slate-900 p-2"><Search size={20} className="ml-2 shrink-0 text-slate-400"/><label className="min-w-0 flex-1"><span className="sr-only">Search for courses</span><input className="w-full bg-transparent py-2 text-sm outline-none" name="q" placeholder="What would you like to learn?"/></label><button className="btn-primary" aria-label="Search courses"><ArrowRight size={17}/></button></form>
   <div className="mb-8 flex flex-wrap gap-2">{categories.map(c=><Link key={c} href={`/courses?category=${encodeURIComponent(c)}`} className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-300 transition hover:border-violet-400/50 hover:bg-violet-500/10">{c}</Link>)}</div>
   {publishedCourses.length?<div className="grid gap-6 md:grid-cols-3">{publishedCourses.slice(0,3).map(c=><CourseCard key={c.id} course={c}/>)}</div>:<EmptyState title={state.ready?'Your next course is on its way':'Loading the course catalog'} description={state.storageWarning?'The catalog will load when the backend is available.':'Published courses appear here as instructors add them.'}/>}
  </section>
  <section id="features" className="border-y border-white/10 bg-slate-900/40 py-14 md:py-20"><div className="container-page"><p className="eyebrow text-center">Built around your learning</p><h2 className="mx-auto mt-3 max-w-xl text-center text-3xl font-bold">Everything you need.<br/>Every step of the way.</h2><div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{benefits.map(b=><article className="panel p-6 transition hover:border-violet-400/30" key={b.title}><Artwork name={b.image} className="mb-5 h-16 w-20 rounded-xl"/><h3 className="text-lg font-semibold">{b.title}</h3><p className="mt-3 text-sm leading-7 text-slate-400">{b.text}</p></article>)}</div></div></section>
  <section className="container-page py-14 md:py-20"><div className="workspace-welcome grid items-center gap-8 md:grid-cols-[1fr_280px]"><div><p className="eyebrow flex items-center gap-2"><Sparkles size={16}/>Your notes. A new way to practice.</p><h2 className="mt-4 text-3xl font-bold">Turn lecture notes into<br/>your next knowledge check.</h2><p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">Upload a PDF, choose your challenge, and put your understanding to the test with an AI-generated quiz and a focused countdown.</p><Link href="/student-dashboard/ai-quizzes" className="btn-primary mt-6">Try the PDF Quiz Generator<ArrowRight size={16}/></Link></div><Artwork name="quiz" className="mx-auto aspect-[260/228] w-full max-w-[240px] rounded-2xl"/></div></section>
  <section id="about" className="container-page grid items-center gap-10 pb-16 md:grid-cols-2"><Artwork name="learning" className="aspect-[369/228] rounded-2xl border border-white/10"/><div><p className="eyebrow">A little about Learnova</p><h2 className="mt-3 text-3xl font-bold">A home for curious minds.</h2><p className="mt-5 leading-8 text-slate-400">We bring lessons, projects, assessments, and achievements together. A clear path for students. A thoughtful workspace for instructors. One connected learning community.</p><Link className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-violet-300" href="/about">Meet Learnova<ArrowUpRight size={16}/></Link></div></section>
  <section id="contact" className="container-page pb-16"><div className="panel flex flex-wrap items-center justify-between gap-6 p-7 md:p-10"><div><p className="eyebrow">Let’s keep the conversation going</p><h2 className="mt-3 text-2xl font-semibold">Need a hand with your next step?</h2><p className="mt-3 text-sm text-slate-400">Send a message about your courses, account, or learning experience.</p></div><Link href="/contact" className="btn-secondary"><Mail size={17}/>Contact Learnova<ArrowUpRight size={16}/></Link></div></section>
 </>;
}
