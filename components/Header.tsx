import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-100">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <GraduationCap
            size={32}
            className="text-blue-600"
          />

          <h1 className="text-xl font-bold text-slate-900">
            Learn<span className="text-blue-600">Nova</span>
          </h1>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-10 text-sm font-medium text-slate-700">
          <Link href="/courses" className="hover:text-blue-600">
            Courses
          </Link>

          <a href="#features" className="hover:text-blue-600">
            Features
          </a>

          <a href="#community" className="hover:text-blue-600">
            Community
          </a>
        </nav>

        {/* Buttons */}
        <div className="flex items-center gap-4">

          <Link
            href="/login"
            className="text-sm font-medium text-slate-700 hover:text-blue-600"
          >
            Log in
          </Link>

          <Link
            href="/register"
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Sign Up
          </Link>

        </div>

      </div>
    </header>
  );
}