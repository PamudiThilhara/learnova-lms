"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, X, ChevronDown, LogOut, UserRound, LayoutDashboard } from "lucide-react";
import Brand from "@/components/layout/Brand";
import { useLearnova } from "@/components/LearnovaProvider";
import { dashboardPath } from "@/data/users";

export default function Header() {
  const pathname = usePathname(); const router = useRouter();
  const { user, logout } = useLearnova();
  const [mobileOpen, setMobileOpen] = useState(false); const [profileOpen, setProfileOpen] = useState(false);
  const dashboard = dashboardPath(user?.role);
  const links = [["Home", "/"], ["Courses", "/courses"], ["Dashboard", dashboard], ["About", "/about"], ["Contact", "/contact"]];
  const close = () => { setMobileOpen(false); setProfileOpen(false); };
  const signOut = () => { logout(); close(); router.push("/"); };
  return <header className="site-header sticky top-0 z-40 border-b border-blue-100 bg-white/95 backdrop-blur">
    <div className="container-page flex min-h-20 items-center justify-between gap-4">
      <Brand />
      <nav aria-label="Main navigation" className="hidden items-center gap-6 lg:flex">
        {links.map(([label, href]) => <Link key={label} href={href} onClick={close} aria-current={pathname === href ? "page" : undefined} className={`text-sm font-semibold transition hover:text-blue-600 ${pathname === href ? "text-blue-600" : "text-slate-600"}`}>{label}</Link>)}
      </nav>
      <div className="flex items-center gap-3">
        {user ? <div className="relative">
          <button className="flex items-center gap-2 rounded-xl border border-blue-100 px-2 py-2 text-sm" onClick={() => setProfileOpen(!profileOpen)} aria-expanded={profileOpen} aria-controls="profile-menu">
            <span className="avatar">{user.name.split(" ").map(n => n[0]).slice(0, 2).join("")}</span><span className="hidden max-w-28 truncate font-semibold sm:block">{user.name.split(" ")[0]}</span><ChevronDown size={15} />
          </button>
          {profileOpen && <>
            <button tabIndex={-1} aria-label="Close profile menu" className="fixed inset-0 z-40 cursor-default" onClick={close} />
            <div id="profile-menu" className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-blue-100 bg-white p-2 shadow-lg">
              <p className="px-3 py-2 text-xs capitalize text-slate-500">{user.role} account</p>
              <Link className="menu-link" href={dashboard} onClick={close}><LayoutDashboard size={17} />Dashboard</Link>
              <Link className="menu-link" href="/profile" onClick={close}><UserRound size={17} />Profile</Link>
              <button className="menu-link w-full" onClick={signOut}><LogOut size={17} />Logout</button>
            </div>
          </>}
        </div> : <div className="hidden items-center gap-4 sm:flex"><Link href="/login" className="text-sm font-semibold text-slate-600">Login</Link><Link href="/register" className="btn-primary">Sign Up</Link></div>}
        <button className="rounded-lg p-2 text-slate-600 lg:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileOpen} aria-controls="mobile-nav">{mobileOpen ? <X size={24} /> : <Menu size={24} />}</button>
      </div>
    </div>
    {mobileOpen && <nav id="mobile-nav" aria-label="Mobile navigation" className="border-t border-blue-50 bg-white px-5 pb-5 lg:hidden">
      {links.map(([label, href]) => <Link key={label} href={href} className="menu-link" onClick={close}>{label}</Link>)}
      {!user && <div className="mt-3 flex gap-3"><Link href="/login" className="btn-secondary flex-1" onClick={close}>Login</Link><Link href="/register" className="btn-primary flex-1" onClick={close}>Sign Up</Link></div>}
    </nav>}
  </header>;
}
