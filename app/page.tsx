import Header from "@/components/Header";
import CourseCard from "@/components/CourseCard";
import Link from "next/link";
import { Search } from "lucide-react";

const courses = [
  {
    id: 1,
    title: "Python",
    description: "Course covering coding with Python for beginners.",
    price: "$23.00",
    rating: "4.8",
    image: "/images/python.jpg",
  },
  {
    id: 2,
    title: "UX Design",
    description:
      "Learn modern UI and UX design principles and create beautiful interfaces.",
    price: "$35.00",
    rating: "4.8",
    image: "/images/ux-design.jpg",
  },
  {
    id: 3,
    title: "Marketing",
    description:
      "Master digital marketing, social media strategies and online branding.",
    price: "$73.00",
    rating: "4.8",
    image: "/images/digital-marketing.jpg",
  },
];
export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">

      <Header />

      {/* HERO SECTION */}
      <section
  
  className="relative min-h-[430px] bg-cover bg-center bg-no-repeat"
  style={{
    backgroundImage:
      "linear-gradient(rgba(0,70,150,0.60), rgba(0,70,150,0.65)), url('/images/blue-background.jpg')",
  }}
>
      

        <div className="mx-auto flex max-w-6xl flex-col items-center px-6 pt-16 text-center text-white">

          <h1 className="text-4xl font-bold md:text-5xl">
            Welcome to LearnNova!
          </h1>

          <p className="mt-3 text-xl text-blue-100">
            Your Journey Starts Here.
          </p>

          {/* Search Bar */}
          <div className="mt-8 flex w-full max-w-2xl overflow-hidden rounded-full bg-white p-1 shadow-xl">

            <div className="flex flex-1 items-center px-5">

              <Search
                size={19}
                className="mr-3 text-gray-400"
              />

              <input
                type="text"
                placeholder="Search for courses..."
                className="w-full py-3 text-slate-800 outline-none"
              />

            </div>

            <button className="rounded-full bg-blue-600 px-8 py-3 font-semibold text-white transition hover:bg-blue-700">
              Search
            </button>

          </div>

        </div>

      </section>

      {/* COURSE CARDS */}
      <section className="relative z-10 mx-auto -mt-145px max-w-5xl px-6">

        <div className="grid gap-7 md:grid-cols-3">

          {courses.map((course) => (
            <CourseCard
              key={course.title}
              {...course}
            />
          ))}

        </div>

      </section>

      {/* LEARN MORE */}
      <section className="pb-20 pt-10 text-center">

        <Link
          href="/courses"
          className="inline-block rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white shadow-md transition hover:bg-blue-700"
        >
          Learn More
        </Link>

      </section>

    </main>
  );
}