"use client";

import { useMemo, useState } from "react";
import Header from "@/components/Header";
import CourseCard from "@/components/CourseCard";
import {
  Search,
  SlidersHorizontal,
  BookOpen,
} from "lucide-react";

const courses = [
  {
    id: 1,
    title: "Python",
    category: "Programming",
    description:
      "Course covering coding with Python for beginners.",
    price: "$23.00",
    rating: "4.8",
    image: "/images/python.jpg",
  },
  {
    id: 2,
    title: "UX Design",
    category: "Design",
    description:
      "Learn modern UI and UX design principles and create beautiful interfaces.",
    price: "$35.00",
    rating: "4.8",
    image: "/images/ux-design.jpg",
  },
  {
    id: 3,
    title: "Digital Marketing",
    category: "Marketing",
    description:
      "Master digital marketing, social media strategies and online branding.",
    price: "$73.00",
    rating: "4.8",
    image: "/images/digital-marketing.jpg",
  },
  {
    id: 4,
    title: "Python Advanced",
    category: "Programming",
    description:
      "Improve your Python knowledge with advanced concepts and practical projects.",
    price: "$40.00",
    rating: "4.9",
    image: "/images/python.jpg",
  },
  {
    id: 5,
    title: "UI/UX Design Masterclass",
    category: "Design",
    description:
      "Learn professional interface design, wireframing and user experience principles.",
    price: "$45.00",
    rating: "4.7",
    image: "/images/ux-design.jpg",
  },
  {
    id: 6,
    title: "Social Media Marketing",
    category: "Marketing",
    description:
      "Learn how to create effective social media campaigns and grow online brands.",
    price: "$50.00",
    rating: "4.9",
    image: "/images/digital-marketing.jpg",
  },
];

const categories = [
  "All",
  "Programming",
  "Design",
  "Marketing",
];

export default function CoursesPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState("All");

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch =
        course.title
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        course.description
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesCategory =
        selectedCategory === "All" ||
        course.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [search, selectedCategory]);

  return (
    <main className="min-h-screen bg-[#f7fbff]">

      {/* Header */}
      <Header />

      {/* Page Header */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-500">
        <div className="mx-auto max-w-7xl px-6 py-14 text-white">

          <div className="flex items-center gap-3">
            <BookOpen size={34} />

            <div>
              <h1 className="text-4xl font-bold">
                Courses Catalog
              </h1>

              <p className="mt-2 text-blue-100">
                Explore our courses and start learning today.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Main Content */}
      <section className="mx-auto max-w-7xl px-6 py-12">

        {/* Search Area */}
        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">

          <div className="flex flex-col gap-4 md:flex-row">

            {/* Search */}
            <div className="flex flex-1 items-center rounded-xl border border-blue-100 bg-slate-50 px-4">

              <Search
                size={19}
                className="text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search courses..."
                className="w-full bg-transparent px-4 py-3 outline-none"
              />

            </div>

            {/* Filter button */}
            <button className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-6 py-3 font-medium text-blue-600 transition hover:bg-blue-50">

              <SlidersHorizontal size={18} />

              Filters

            </button>

          </div>

          {/* Category Buttons */}
          <div className="mt-5 flex flex-wrap gap-3">

            {categories.map((category) => (
              <button
                key={category}
                onClick={() =>
                  setSelectedCategory(category)
                }
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  selectedCategory === category
                    ? "bg-blue-600 text-white"
                    : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                }`}
              >
                {category}
              </button>
            ))}

          </div>

        </div>

        {/* Results Information */}
        <div className="mt-10 flex items-center justify-between">

          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Available Courses
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {filteredCourses.length} courses found
            </p>
          </div>

          <select className="rounded-lg border border-blue-100 bg-white px-4 py-2 text-sm outline-none">
            <option>Most Popular</option>
            <option>Highest Rated</option>
            <option>Lowest Price</option>
            <option>Newest</option>
          </select>

        </div>

        {/* Course Layout */}
        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">

          {filteredCourses.map((course) => (
            <CourseCard
              key={course.id}
              id={course.id}
              title={course.title}
              description={course.description}
              price={course.price}
              rating={course.rating}
              image={course.image}
            />
          ))}

        </div>

        {/* No Results */}
        {filteredCourses.length === 0 && (
          <div className="py-20 text-center">

            <div className="text-6xl">
              🔍
            </div>

            <h3 className="mt-5 text-xl font-bold">
              No courses found
            </h3>

            <p className="mt-2 text-slate-500">
              Try another search or category.
            </p>

          </div>
        )}

      </section>

    </main>
  );
}