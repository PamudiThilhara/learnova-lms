import Link from "next/link";
import Image from "next/image";
import { assets } from "@/lib/assets";
export default function Brand() {
  return <Link href="/" className="brand inline-flex min-w-0 items-center" aria-label="Learnova home"><Image src={assets.logo} alt="Learnova — Learn today, build tomorrow" width={2172} height={724} sizes="(max-width: 639px) 176px, 208px" className="h-auto w-44 max-w-full object-contain sm:w-52" preload /></Link>;
}
