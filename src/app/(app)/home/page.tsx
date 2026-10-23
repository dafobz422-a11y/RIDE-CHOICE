"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAsync } from "@/lib/hooks";
import { setIntent } from "@/lib/intent";
import { DEFAULT_PREFERENCES, PRIORITY_LABEL, formatPrice } from "@/lib/prefs";
import { generateOptions } from "@/lib/rides";
import { formatSchedule, timeUntil } from "@/lib/schedule";
import { store } from "@/lib/store";
import { STAGES, STAGE_LABEL, tripProgress, tripStart } from "@/lib/trip";
import type { Booking, Tier } from "@/lib/types";
import { SAMPLE_TRIP } from "@/components/fit-preview";
import { CalendarIcon, ChevronRightIcon, ClockIcon, FlagIcon, SearchIcon, SlidersIcon, StarIcon } from "@/components/icons";
import { NearbyMap } from "@/components/nearby-map";
import { TierCarousel } from "@/components/tier-carousel";
import { FullPageSpinner, cx } from "@/components/ui";
import { VehicleArt } from "@/components/vehicle-art";

function greeting(d: Date): string {
  const h = d.getHours();
  return h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-end justify-between">
      <h2 className="font-display text-lg font-semibold">{children}</h2>
      {action}
    </div>
  );
}

/** A live trip in progress, ticking on the Home screen. */
function ActiveRideCard({ booking }: { booking: Booking }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  const { stage, fraction } = tripProgress(tripStart(booking), now, booking.status);
  if (stage === "completed") return null;
  const pct = ((STAGES.indexOf(stage) + fraction) / (STAGES.length - 1)) * 100;
  return (
    <Link
      href={`/ride/${booking.id}`}
      className="btn-primary elevated-lg block rounded-[24px] p-4 text-accent-fg transition-transform active:scale-[0.98]"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase opacity-90">
            <span className="size-1.5 animate-pulse rounded-full bg-current" /> Ride in progress
          </p>
          <p className="mt-0.5 font-display text-xl font-semibold">{STAGE_LABEL[stage]}</p>
          <p className="text-sm opacity-90">
            {booking.option.tier} · {booking.option.vehicle.plate}
          </p>
        </div>
        <VehicleArt tier={booking.option.tier} className="h-11 w-auto drop-shadow" />
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/25" aria-hidden>
        <div className="h-full rounded-full bg-white transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </Link>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const userId = user!.id;
  const [now] = useState(() => new Date());
  const [selected, setSelected] = useState<Tier | null>("Comfort");
  const [data] = useAsync(async () => {
    const [prefs, draft, bookings] = await Promise.all([
      store.getPreferences(userId),
      store.getDraft(userId),
      store.listBookings(userId),
    ]);
    const ratings = await Promise.all(bookings.map((b) => store.getRating(b.id)));
    return { prefs: prefs ?? DEFAULT_PREFERENCES, draft, bookings, rated: new Set(bookings.filter((_, i) => ratings[i]).map((b) => b.id)) };
  }, [userId]);

  const trip = data?.draft ?? SAMPLE_TRIP;
  const nearby = useMemo(() => generateOptions(trip.pickup, trip.dropoff), [trip.pickup, trip.dropoff]);

  if (!data) return <FullPageSpinner />;

  const { prefs, bookings, rated } = data;
  const live = bookings.find((b) => ["assigned", "arriving", "on_trip"].includes(b.status));
  const upcoming = bookings
    .filter((b) => b.status === "scheduled" && b.scheduledFor)
    .sort((a, b) => a.scheduledFor!.localeCompare(b.scheduledFor!))[0];
  const toRate = bookings.find((b) => b.status === "completed" && !rated.has(b.id));
  const places = [...new Set(bookings.flatMap((b) => [b.dropoff, b.pickup]))].slice(0, 4);
  const first = user!.name.split(" ")[0];

  async function goTo(dropoff: string) {
    await store.saveDraft(userId, { pickup: data!.draft?.pickup ?? SAMPLE_TRIP.pickup, dropoff, scheduledFor: null });
    router.push("/ride/new");
  }

  return (
    <div className="flex flex-col gap-6 px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted">{greeting(now)},</p>
          <h1 className="font-display text-[2rem] leading-tight font-bold">{first}</h1>
        </div>
        <Link
          href="/account"
          aria-label="Profile"
          className="btn-primary flex size-12 items-center justify-center rounded-[16px] font-display text-lg font-semibold text-accent-fg transition-transform active:scale-95"
        >
          {first.charAt(0).toUpperCase()}
        </Link>
      </header>

      {/* Search pill */}
      <div className="flex flex-col gap-2.5">
        <Link
          href="/ride/new"
          onClick={() => setIntent("now")}
          className="elevated-lg flex min-h-15 items-center gap-3 rounded-full border border-line bg-surface py-2 pr-2 pl-5 transition-transform active:scale-[0.98]"
        >
          <SearchIcon size={20} className="text-accent" />
          <span className="flex-1 text-lg font-bold">Where to?</span>
          <span className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-2 text-xs font-bold">
            <ClockIcon size={14} /> Now
          </span>
        </Link>
        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href="/ride/new"
            onClick={() => setIntent("now")}
            className="elevated flex min-h-14 items-center gap-2.5 rounded-[20px] border border-line bg-surface px-4 text-sm font-bold transition-transform active:scale-95"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-accent-soft text-accent-soft-fg">
              <ClockIcon size={16} />
            </span>
            Ride now
          </Link>
          <Link
            href="/ride/new"
            onClick={() => setIntent("schedule")}
            className="elevated flex min-h-14 items-center gap-2.5 rounded-[20px] border border-line bg-surface px-4 text-sm font-bold transition-transform active:scale-95"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-accent-soft text-accent-soft-fg">
              <CalendarIcon size={16} />
            </span>
            Schedule
          </Link>
        </div>
      </div>

      {live && <ActiveRideCard booking={live} />}

      {upcoming && (
        <section aria-label="Upcoming ride">
          <SectionTitle>Upcoming</SectionTitle>
          <Link
            href={`/ride/${upcoming.id}`}
            className="elevated flex items-center gap-3 rounded-[24px] border border-accent/40 bg-surface p-4 transition-transform active:scale-[0.98]"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-soft-fg">
              <CalendarIcon size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{formatSchedule(upcoming.scheduledFor!, now)}</span>
              <span className="block truncate text-sm text-muted">
                {upcoming.option.tier} to {upcoming.dropoff}
              </span>
            </span>
            <span className="num rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold whitespace-nowrap text-accent-soft-fg">
              {timeUntil(upcoming.scheduledFor!, now)}
            </span>
          </Link>
        </section>
      )}

      {toRate && (
        <Link
          href={`/ride/${toRate.id}/rate`}
          className="elevated flex items-center gap-3 rounded-[24px] border border-line bg-warn-soft p-4 transition-transform active:scale-[0.98]"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-warn">
            <StarIcon size={18} filled />
          </span>
          <span className="min-w-0 flex-1 text-sm">
            <span className="block font-bold text-warn">How was your {toRate.option.tier} ride?</span>
            <span className="block text-warn">Rate whether it met your preferences.</span>
          </span>
          <ChevronRightIcon className="shrink-0 text-warn" />
        </Link>
      )}

      <section aria-labelledby="nearby-title">
        <SectionTitle>
          <span id="nearby-title">Nearby now</span>
        </SectionTitle>
        <div className="elevated overflow-hidden rounded-[24px] border border-line">
          <NearbyMap options={nearby} selected={selected} onSelect={setSelected} />
        </div>
      </section>

      <section aria-labelledby="types-title">
        <SectionTitle>
          <span id="types-title">Ride types</span>
        </SectionTitle>
        <TierCarousel options={nearby} selected={selected} onSelect={setSelected} routeLabel={`${trip.pickup} → ${trip.dropoff}`} />
      </section>

      {places.length > 0 && (
        <section aria-labelledby="places-title">
          <SectionTitle>
            <span id="places-title">Your places</span>
          </SectionTitle>
          <ul className="elevated divide-y divide-line overflow-hidden rounded-[24px] border border-line bg-surface">
            {places.map((p) => (
              <li key={p}>
                <button
                  type="button"
                  onClick={() => goTo(p)}
                  className="flex min-h-13 w-full items-center gap-3 px-4 text-left text-sm font-semibold transition-colors hover:bg-surface-2"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted">
                    <FlagIcon size={15} />
                  </span>
                  <span className="flex-1 truncate">{p}</span>
                  <ChevronRightIcon size={18} className="text-muted" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link
        href="/preferences"
        className="elevated flex items-center gap-3 rounded-[24px] border border-line bg-surface p-4 transition-transform active:scale-[0.98]"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-soft-fg">
          <SlidersIcon size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">Your must-haves</span>
          <span className="num block truncate text-sm text-muted">
            Up to {formatPrice(prefs.maxPrice).replace(".00", "")} · {prefs.maxWaitMin} min wait · sorted by {PRIORITY_LABEL[prefs.priority].toLowerCase()}
          </span>
        </span>
        <span className={cx("text-sm font-bold text-accent-soft-fg")}>Edit</span>
      </Link>
    </div>
  );
}
