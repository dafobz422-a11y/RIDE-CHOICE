"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAsync } from "@/lib/hooks";
import { setIntent } from "@/lib/intent";
import { DEFAULT_PREFERENCES, PREF_SHORT, PRIORITY_LABEL, activeKeys, describePref } from "@/lib/prefs";
import { authApi, backendKind, store } from "@/lib/backend";
import { CalendarIcon, ChevronRightIcon, HistoryIcon, SlidersIcon } from "@/components/icons";
import { Button, Card, PageHeader } from "@/components/ui";

export default function AccountPage() {
  const { user } = useAuth();
  const userId = user!.id;
  const [confirmReset, setConfirmReset] = useState(false);
  const online = backendKind === "supabase";
  const [data] = useAsync(async () => {
    const [prefs, bookings] = await Promise.all([store.getPreferences(userId), store.listBookings(userId)]);
    return { prefs: prefs ?? DEFAULT_PREFERENCES, bookings };
  }, [userId]);

  // Full navigation (not a client transition) so the protected-route guard
  // doesn't race us to /login, and all in-memory state starts fresh.
  async function onLogout() {
    await authApi.logout();
    window.location.replace("/");
  }

  async function onReset() {
    await store.reset();
    await authApi.logout();
    window.location.replace("/");
  }

  const prefs = data?.prefs ?? DEFAULT_PREFERENCES;
  const keys = activeKeys(prefs);
  const completed = data?.bookings.filter((b) => b.status === "completed").length ?? 0;
  const upcoming = data?.bookings.filter((b) => b.status === "scheduled").length ?? 0;
  const memberSince = new Date(user!.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" });

  return (
    <>
      <PageHeader title="Account" />
      <div className="flex flex-col gap-4 px-4">
        <Card className="relative overflow-hidden">
          <div aria-hidden className="aurora absolute inset-0 opacity-70" />
          <div className="relative flex items-center gap-4">
            <span className="btn-primary flex size-16 items-center justify-center rounded-[20px] font-display text-2xl font-semibold text-accent-fg">
              {user!.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="font-display text-xl font-semibold">{user!.name}</p>
              <p className="truncate text-sm text-muted">{user!.email}</p>
              <p className="text-xs text-muted">Member since {memberSince}</p>
            </div>
          </div>
          <dl className="num relative mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-surface/80 px-3 py-2.5">
              <dt className="text-xs font-semibold text-muted">Rides taken</dt>
              <dd className="font-display text-2xl font-semibold">{completed}</dd>
            </div>
            <div className="rounded-2xl bg-surface/80 px-3 py-2.5">
              <dt className="text-xs font-semibold text-muted">Upcoming</dt>
              <dd className="font-display text-2xl font-semibold">{upcoming}</dd>
            </div>
          </dl>
        </Card>

        <Link
          href="/preferences"
          className="elevated flex flex-col gap-3 rounded-[28px] border border-line bg-surface p-4 transition-transform active:scale-[0.98]"
        >
          <span className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-soft-fg">
              <SlidersIcon size={18} />
            </span>
            <span className="flex-1">
              <span className="block font-bold">Ride preferences</span>
              <span className="block text-sm text-muted">Sorted by {PRIORITY_LABEL[prefs.priority].toLowerCase()}</span>
            </span>
            <ChevronRightIcon className="text-muted" />
          </span>
          <span className="flex flex-wrap gap-1.5">
            {keys.map((k) => (
              <span key={k} className="num rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold" title={PREF_SHORT[k]}>
                {describePref(k, prefs)}
              </span>
            ))}
          </span>
        </Link>

        <ul className="elevated divide-y divide-line overflow-hidden rounded-[24px] border border-line bg-surface">
          {[
            { href: "/history", label: "Ride history", Icon: HistoryIcon },
            { href: "/ride/new", label: "Schedule a ride", Icon: CalendarIcon, onClick: () => setIntent("schedule") },
          ].map(({ href, label, Icon, onClick }) => (
            <li key={href}>
              <Link href={href} onClick={onClick} className="flex min-h-14 items-center gap-3 px-4 text-sm font-bold hover:bg-surface-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-surface-2 text-muted">
                  <Icon size={16} />
                </span>
                <span className="flex-1">{label}</span>
                <ChevronRightIcon size={18} className="text-muted" />
              </Link>
            </li>
          ))}
        </ul>

        <Button variant="secondary" block onClick={onLogout}>
          Log out
        </Button>

        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold">{online ? "Delete my ride data" : "Reset demo data"}</h2>
          <p className="text-sm text-muted">
            {online
              ? "Deletes your preferences, rides and ratings, and logs you out. Your login stays, so you can start fresh."
              : "Deletes every account, preference, ride and rating stored in this browser, and logs you out."}
          </p>
          {confirmReset ? (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setConfirmReset(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={onReset}>
                {online ? "Yes, delete" : "Yes, reset"}
              </Button>
            </div>
          ) : (
            <Button variant="danger" block onClick={() => setConfirmReset(true)}>
              {online ? "Delete my ride data" : "Reset demo data"}
            </Button>
          )}
        </Card>

        <p className="text-center text-xs text-muted">
          {online
            ? "Rides, drivers and prices are simulated. Your account and rides are saved securely online."
            : "RideChoice is a demo. Rides, drivers and prices are simulated; data never leaves this browser."}
        </p>
      </div>
    </>
  );
}
