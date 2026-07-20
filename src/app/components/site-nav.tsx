"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = {
  href: string;
  label: string;
};

const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Dashboard" },
  { href: "/slicer", label: "Slicer" },
  { href: "/ambient", label: "Ambient" },
  { href: "/breathe", label: "Breathe" },
  { href: "/challenges", label: "Challenges" },
  { href: "/focus", label: "Focus" },
  { href: "/execute", label: "Execute" },
  { href: "/review", label: "Review" },
  { href: "/trends", label: "Trends" },
  { href: "/journal", label: "Journal" },
  { href: "/pricing", label: "Pricing" },
  { href: "/monetization", label: "Monetization" },
];

// The export is configured with trailingSlash, so the live pathname is
// "/journal/" while the hrefs are written "/journal". Compare them stripped.
function normalizePath(pathname: string | null): string {
  if (!pathname) {
    return "/";
  }

  const withoutTrailingSlash = pathname.replace(/\/+$/, "");
  return withoutTrailingSlash === "" ? "/" : withoutTrailingSlash;
}

export function SiteNav() {
  const activePath = normalizePath(usePathname());

  return (
    <nav className="site-nav-links" aria-label="Primary">
      {NAV_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={activePath === link.href ? "page" : undefined}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
