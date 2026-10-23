"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { CarIcon, HistoryIcon, SlidersIcon, UserIcon } from "./icons";
import { FullPageSpinner, cx } from "./ui";

const TABS = [
  { href: "/ride/new", match: "/ride", label: "Ride", Icon: CarIcon },
  { href: "/history", match: "/history", label: "History", Icon: HistoryIcon },
  { href: "/preferences", match: "/preferences", label: "Preferences", Icon: SlidersIcon },
  { href: "/account", match: "/account", label: "Account", Icon: UserIcon },
];

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="pb-safe fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[440px] border-t border-line bg-surface/95 backdrop-blur sm:border-x"
    >
      <ul className="grid grid-cols-4">
        {TABS.map(({ href, match, label, Icon }) => {
          const active = pathname === match || pathname.startsWith(`${match}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold",
                  active ? "text-accent" : "text-muted hover:text-ink",
                )}
              >
                <span
                  className={cx(
                    "flex h-7 w-12 items-center justify-center rounded-full",
                    active && "bg-accent-soft text-accent-soft-fg",
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
      <main className="flex flex-1 flex-col pb-[calc(5rem+env(safe-area-inset-bottom))]">{children}</main>
      <TabBar />
    </>
  );
}
