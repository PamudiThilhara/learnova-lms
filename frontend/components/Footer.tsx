import Link from "next/link";
import Brand from "@/components/layout/Brand";
export default function Footer() {
  return <footer className="site-footer border-t border-white/10 bg-slate-800"><div className="container-page grid gap-9 py-12 sm:grid-cols-2 lg:grid-cols-4"><div><Brand /><p className="mt-4 text-sm leading-7 text-slate-400">A place to learn, build, and grow. Practical courses and a supportive university learning experience.</p></div>{[
    { title: "Quick links", links: [["Home", "/"], ["Courses", "/courses"], ["About Learnova", "/about"], ["Contact", "/contact"]] },
    { title: "Courses", links: [["Programming", "/courses?category=Programming"], ["Design", "/courses?category=Design"], ["Marketing", "/courses?category=Marketing"], ["Data Science", "/courses?category=Data%20Science"]] },
    { title: "Support", links: [["Help & contact", "/contact"], ["Student dashboard", "/student-dashboard"], ["Terms & conditions", "/terms"], ["Privacy", "/privacy"]] },
  ].map(group => <div key={group.title}><h2 className="font-bold text-slate-50">{group.title}</h2><ul className="mt-4 space-y-3">{group.links.map(([label, href]) => <li key={href}><Link href={href} className="text-sm text-slate-400 hover:text-blue-300">{label}</Link></li>)}</ul></div>)}</div><div className="container-page flex flex-wrap justify-between gap-3 border-t border-white/10 py-5 text-xs text-slate-400"><p>© 2026 Learnova. All rights reserved.</p><Link href="/contact">Questions? Get in touch</Link></div></footer>;
}
