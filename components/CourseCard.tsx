import Link from "next/link";
import { Star } from "lucide-react";

type CourseCardProps = {
  id?: number;
  title: string;
  description: string;
  price: string;
  rating: string;
  image: string;
};

export default function CourseCard({
  id,
  title,
  description,
  price,
  rating,
  image,
}: CourseCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl">

      {/* Course Image */}
      <div className="flex h-60 w-full items-center justify-center overflow-hidden bg-white p-2">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-contain"
        />
      </div>

      {/* Course Details */}
      <div className="p-5">

        <h3 className="text-xl font-bold text-slate-900">
          {title}
        </h3>

        <p className="mt-3 min-h-[52px] text-sm leading-6 text-slate-500">
          {description}
        </p>

        {/* Price and Rating */}
        <div className="mt-5 flex items-center justify-between">

          <span className="text-lg font-bold text-slate-900">
            {price}
          </span>

          <div className="flex items-center gap-1">
            <Star
              size={17}
              className="fill-yellow-400 text-yellow-400"
            />

            <span className="text-sm font-semibold text-slate-700">
              {rating}
            </span>
          </div>

        </div>

        {/* View Course Button */}
        {id && (
          <Link
            href={`/courses/${id}`}
            className="mt-5 block w-full rounded-lg bg-blue-600 py-2.5 text-center font-semibold text-white transition hover:bg-blue-700"
          >
            View Course
          </Link>
        )}

      </div>

    </div>
  );
}