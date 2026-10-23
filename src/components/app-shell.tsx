"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { CarIcon, HistoryIcon, HomeIcon, UserIcon } from "./icons";
import { FullPageSpinner, cx } from "./ui";

/** Preferences live under Account, so that tab lights up there too. */
const TABS = [
  { href: "/home", match: ["/home"], label: "Home", Icon: HomeIcon },
  { href: "/ride/new", match: ["/ride"], label: "Book", Icon: CarIcon },
  { href: "/history", match: ["/history"], label: "History", Icon: HistoryIcon },
  { href: "/account", match: ["/account", "/preferences"], label: "Account", Icon: UserIcon },
];

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.6rem)] z-20 mx-auto max-w-[440px] px-3"
    >
      <ul className="elevated-lg grid grid-cols-4 rounded-full border border-line bg-surface/85 p-1 backdrop-blur-xl backdrop-saturate-150">
        {TABS.map(({ href, match, label, Icon }) => {
          const active = match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-full text-[0.7rem] font-bold tracking-tight transition-colors",
                  active ? "bg-accent-soft text-accent-soft-fg" : "text-muted hover:text-ink",
                )}
              >
                <span
                  className={cx(
                    "flex h-6 items-center justify-center transition-transform duration-200",
                    active && "-translate-y-px scale-110",
                  )}
                >
                  <Icon size={20} />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Client-side route protection: no session → /login. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready || !user) return <FullPageSpinner />;
  return (
    <>
      <main className="flex flex-1 flex-col pb-[calc(6.5rem+env(safe-area-inset-bottom))]">{children}</main>
      <TabBar />
    </>
  );
}
