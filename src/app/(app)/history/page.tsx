"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAsync } from "@/lib/hooks";
import { formatPrice } from "@/lib/prefs";
import { historyStats, summarizeRating } from "@/lib/rating";
import { formatSchedule, timeUntil } from "@/lib/schedule";
import { store } from "@/lib/backend";
import { STAGE_LABEL } from "@/lib/trip";
import type { Booking, Rating } from "@/lib/types";
import { CalendarIcon, ChevronRightIcon } from "@/components/icons";
import { Stars } from "@/components/rating-summary";
import { EmptyState, FullPageSpinner, LinkButton, PageHeader, cx } from "@/components/ui";
import { VehicleArt } from "@/components/vehicle-art";

type Filter = "all" | "upcoming" | "rated" | "unrated";
type Item = { booking: Booking; rating: Rating | null };

const MATCH: Record<Filter, (i: Item) => boolean> = {
  all: () => true,
  upcoming: (i) => i.booking.status === "scheduled",
  rated: (i) => !!i.rating,
  unrated: (i) => i.booking.status === "completed" && !i.rating,
};

const EMPTY_FILTER: Record<Exclude<Filter, "all">, string> = {
  upcoming: "No upcoming rides. Schedule one from the Ride tab.",
  rated: "No rated rides yet.",
  unrated: "You've rated every completed ride. Nice.",
};

function StatusChip({ booking: b, rating, now }: Item & { now: Date }) {
  if (rating) {
    const summary = summarizeRating(rating.perPreference, b.activeKeys);
    return (
      <>
        <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent-soft-fg">{summary.label}</span>
        <Stars value={rating.stars} size={14} />
      </>
    );
  }
  if (b.status === "scheduled" && b.scheduledFor) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent-soft-fg">
        <CalendarIcon size={12} /> Upcoming · {timeUntil(b.scheduledFor, now)}
      </span>
    );
  }
  if (b.status === "cancelled") return <span className="rounded-full bg-danger-soft px-2.5 py-1 text-xs font-bold text-danger">Cancelled</span>;
  if (b.status === "completed")
    return <span className="rounded-full bg-warn-soft px-2.5 py-1 text-xs font-bold text-warn">Not rated yet · tap to rate</span>;
  return <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold">In progress · {STAGE_LABEL[b.status]}</span>;
}

export default function HistoryPage() {
  const { user } = useAuth();
  const userId = user!.id;
  const [filter, setFilter] = useState<Filter>("all");
  const [now] = useState(() => new Date());
  const [items] = useAsync(async () => {
    const bookings = await store.listBookings(userId);
    const withRatings = await Promise.all(bookings.map(async (b) => ({ booking: b, rating: await store.getRating(b.id) })));
    // Upcoming rides first (soonest first), then everything else newest first.
    const upcoming = withRatings
      .filter((i) => i.booking.status === "scheduled")
      .sort((a, b) => (a.booking.scheduledFor ?? "").localeCompare(b.booking.scheduledFor ?? ""));
    return [...upcoming, ...withRatings.filter((i) => i.booking.status !== "scheduled")];
  }, [userId]);

  if (!items) return <FullPageSpinner />;

  if (items.length === 0) {
    return (
      <>
        <PageHeader title="Your rides" />
        <EmptyState
          title="No rides yet"
          body="Your booked and scheduled rides, and how well they met your preferences, will show up here."
          action={<LinkButton href="/ride/new" block>Book your first ride</LinkButton>}
        />
      </>
    );
  }

  const live = items.filter((i) => i.booking.status !== "cancelled");
  const stats = historyStats(live.map((i) => ({ activeKeys: i.booking.activeKeys, rating: i.rating })));
  const counts = Object.fromEntries((Object.keys(MATCH) as Filter[]).map((f) => [f, items.filter(MATCH[f]).length])) as Record<Filter, number>;
  const visible = items.filter(MATCH[filter]);

  return (
    <>
      <PageHeader title="Your rides" />
      <div className="flex flex-col gap-4 px-4">
        <dl className="num grid grid-cols-3 gap-2" aria-label="Ride stats">
          {[
            ["Rides", String(stats.rides)],
            ["Avg stars", stats.avgStars?.toFixed(1) ?? "–"],
            ["Prefs met", stats.metPct === null ? "–" : `${stats.metPct}%`],
          ].map(([label, value], i) => (
            <div
              key={label}
              className="animate-rise elevated rounded-[22px] border border-line bg-surface px-3 py-3"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <dt className="text-xs font-semibold text-muted">{label}</dt>
              <dd className="font-display text-2xl font-semibold">{value}</dd>
            </div>
          ))}
        </dl>

        <div role="radiogroup" aria-label="Show" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {(
            [
              ["all", "All"],
              ["upcoming", "Upcoming"],
              ["rated", "Rated"],
              ["unrated", "To rate"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={filter === value}
              onClick={() => setFilter(value)}
              className={cx(
                "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-bold transition-all active:scale-95",
                filter === value ? "btn-primary border-transparent text-accent-fg" : "elevated border-line bg-surface text-ink",
              )}
            >
              {label}
              <span className={cx("num rounded-full px-1.5 text-xs", filter === value ? "bg-white/20" : "bg-surface-2 text-muted")}>
                {counts[value]}
              </span>
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="elevated flex flex-col items-center gap-3 rounded-[28px] border border-line bg-surface px-6 py-8 text-center">
            <p className="text-sm text-muted">{filter !== "all" && EMPTY_FILTER[filter]}</p>
            <button type="button" onClick={() => setFilter("all")} className="min-h-11 font-bold text-accent-soft-fg underline underline-offset-4">
              Show all rides
            </button>
          </div>
        ) : (
          <ul key={filter} className="flex flex-col gap-3" aria-label="Ride history">
            {visible.map(({ booking: b, rating }, i) => {
              const summary = rating ? summarizeRating(rating.perPreference, b.activeKeys) : null;
              const pct = summary && summary.total ? (summary.met / summary.total) * 100 : 0;
              const toRate = b.status === "completed" && !rating;
              return (
                <li key={b.id} data-testid="history-item" className="animate-rise" style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}>
                  <Link
                    href={toRate ? `/ride/${b.id}/rate` : `/ride/${b.id}`}
                    className={cx(
                      "elevated flex items-center gap-3 rounded-[28px] border bg-surface p-4 transition-[background-color,transform] duration-150 hover:bg-surface-2 active:scale-[0.98]",
                      b.status === "scheduled" ? "border-accent/40" : "border-line",
                      b.status === "cancelled" && "opacity-75",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <VehicleArt tier={b.option.tier} className="h-7 w-auto" />
                          <p className="font-display text-lg font-semibold">{b.option.tier}</p>
                        </div>
                        <p className={cx("num font-extrabold", b.status === "cancelled" && "text-muted line-through")}>
                          {formatPrice(b.option.price)}
                        </p>
                      </div>
                      <p className="mt-1 truncate text-sm text-muted">
                        {b.pickup} → {b.dropoff}
                      </p>
                      <p className="num text-xs text-muted">
                        {b.scheduledFor
                          ? `Pickup ${formatSchedule(b.scheduledFor, now)}`
                          : new Date(b.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusChip booking={b} rating={rating} now={now} />
                      </div>
                      {summary && (
                        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                          <div className="btn-primary h-full rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </div>
                    <ChevronRightIcon className="shrink-0 text-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
