"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { useSettings } from "@/lib/storage";

const TABS = [
  { href: "/", label: "الرئيسية", icon: HomeIcon },
  { href: "/games", label: "الألعاب", icon: CardsIcon },
  { href: "/favorites", label: "المفضّلة", icon: HeartIcon },
  { href: "/settings", label: "الإعدادات", icon: SlidersIcon },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Applies persisted preferences (reduced motion) to <html>. Renders nothing. */
function PreferenceSync() {
  useSettings();
  return null;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const inPlay = pathname.startsWith("/play");

  if (inPlay) {
    return (
      <>
        <PreferenceSync />
        {children}
      </>
    );
  }

  return (
    <>
      <PreferenceSync />
      {/* Top bar at ≥768px */}
      <header className="hidden border-line border-b bg-ground md:block">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-6">
          <Link href="/" aria-label="ونس — الرئيسية" className="rounded-chip">
            <Logo size={34} withWordmark animate />
          </Link>
          <nav aria-label="التنقّل الرئيسي">
            <ul className="flex gap-1">
              {TABS.map((t) => {
                const active = isActive(pathname, t.href);
                return (
                  <li key={t.href}>
                    <Link
                      href={t.href}
                      aria-current={active ? "page" : undefined}
                      className={`inline-flex min-h-11 items-center gap-2 rounded-chip px-4 font-medium transition-[color,background-color,transform] duration-200 ${
                        active
                          ? "bg-card text-ink shadow-sm"
                          : "text-ink-soft hover:-translate-y-0.5 hover:text-ink"
                      }`}
                    >
                      <t.icon />
                      {t.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </header>

      {/* Compact brand bar on phones — the tab bar carries navigation. */}
      <header className="sticky top-0 z-10 border-line/70 border-b bg-ground/85 backdrop-blur md:hidden">
        <div className="mx-auto flex h-14 w-full max-w-md items-center px-4">
          <Link href="/" aria-label="ونس — الرئيسية" className="rounded-chip">
            <Logo size={30} withWordmark animate />
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-28 md:max-w-3xl md:px-6 md:pb-16">
        {children}
      </main>

      {/* Bottom tab bar on phones */}
      <nav
        aria-label="التنقّل الرئيسي"
        className="fixed inset-x-0 bottom-0 border-line border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {TABS.map((t) => {
            const active = isActive(pathname, t.href);
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-sm transition-colors ${
                    active ? "font-semibold text-ink" : "text-ink-soft"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute top-1 left-1/2 h-1 -translate-x-1/2 rounded-chip bg-marigold transition-all duration-300 ${
                      active ? "w-8 opacity-100" : "w-0 opacity-0"
                    }`}
                  />
                  <span
                    className={`transition-transform duration-300 ${active ? "-translate-y-0.5 scale-110" : ""}`}
                  >
                    <t.icon />
                  </span>
                  <span>{t.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

function HomeIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    >
      <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8Z" />
    </svg>
  );
}
function CardsIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    >
      <rect x="7" y="4" width="11" height="16" rx="2.5" transform="rotate(8 12.5 12)" />
      <rect x="5" y="4" width="11" height="16" rx="2.5" transform="rotate(-8 10.5 12)" />
    </svg>
  );
}
function HeartIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    >
      <path d="M12 20.5s-7.5-4.6-7.5-10A4.5 4.5 0 0 1 12 8a4.5 4.5 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10Z" />
    </svg>
  );
}
function SlidersIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </svg>
  );
}
