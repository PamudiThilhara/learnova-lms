"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, RotateCcw } from "lucide-react";
import { useLearnova } from "@/components/LearnovaProvider";
import CourseCard from "@/components/CourseCard";
import { categories, levels } from "@/data/courses";
import { EmptyState, LoadingCards, PageHeader } from "@/components/ui";
import { progressFor } from "@/lib/learnova-state";

function Catalog() {
  const query = useSearchParams();
  return <CatalogFilters key={query.toString()} initialSearch={query.get("q") ?? ""} initialCategory={query.get("category") ?? "All"} />;
}
function CatalogFilters({ initialSearch, initialCategory }: { initialSearch: string; initialCategory: string }) {
  const { state, learning } = useLearnova();
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(categories.some(c => c === initialCategory) ? initialCategory : "All");
  const [level, setLevel] = useState("All");
  const [sort, setSort] = useState("popular");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const filtered = state.courses.filter(course =>
    [course.title, course.description, course.instructor].join(" ").toLowerCase().includes(search.trim().toLowerCase()) &&
    (category === "All" || course.category === category) && (level === "All" || course.level === level)
  ).sort((a, b) => sort === "rating" ? b.rating - a.rating : sort === "price" ? a.price - b.price : sort === "newest" ? state.courses.indexOf(b) - state.courses.indexOf(a) : b.students - a.students);
  function reset() { setSearch(""); setCategory("All"); setLevel("All"); setSort("popular"); }
  return <>
    <section className="border-b border-blue-100 bg-blue-50"><div className="container-page py-12"><PageHeader title="Explore Courses" eyebrow="Find your next skill" description="Expert-led lessons and practical projects. Find a course that fits your goals." /></div></section>
    <section className="container-page py-10">
      <div className="panel p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-blue-100 bg-slate-50 px-4"><Search size={19} className="shrink-0 text-slate-400" /><span className="sr-only">Search courses</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses or instructors..." className="min-w-0 w-full bg-transparent py-3 text-sm outline-none" /></label>
          <button className="btn-secondary" onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen} aria-controls="course-filters"><SlidersHorizontal size={17} />Filters</button>
        </div>
        {filtersOpen && <div id="course-filters" className="mt-5 space-y-5">
          <div><p className="field-label">Category</p><div className="flex flex-wrap gap-2">{["All", ...categories].map(item => <button key={item} onClick={() => setCategory(item)} aria-pressed={category === item} className={`rounded-full px-4 py-2 text-xs font-semibold transition ${category === item ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}`}>{item}</button>)}</div></div>
          <div className="flex flex-wrap items-end gap-4"><label className="w-full sm:w-52"><span className="field-label">Level</span><select className="field" value={level} onChange={e => setLevel(e.target.value)}>{["All", ...levels].map(item => <option key={item}>{item}</option>)}</select></label><button className="btn-secondary" onClick={reset}><RotateCcw size={16} />Reset filters</button></div>
        </div>}
      </div>
      <div className="my-7 flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-slate-500" aria-live="polite"><span className="font-bold text-slate-800">{filtered.length}</span> courses found</p><label className="flex items-center gap-3 text-sm text-slate-500">Sort by<select className="field w-auto" value={sort} onChange={e => setSort(e.target.value)}><option value="popular">Most Popular</option><option value="rating">Highest Rated</option><option value="price">Lowest Price</option><option value="newest">Newest</option></select></label></div>
      {filtered.length ? <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(course => <CourseCard key={course.id} course={course} progress={learning.enrollments[course.id] ? progressFor(course, learning) : undefined} />)}</div> : <EmptyState title="No courses found" description="Try a different search, category, or level." />}
    </section>
  </>;
}
export default function CoursesPage() { return <Suspense fallback={<LoadingCards />}><Catalog /></Suspense>; }
