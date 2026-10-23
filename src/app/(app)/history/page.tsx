"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAsync } from "@/lib/hooks";
import { formatPrice } from "@/lib/prefs";
import { historyStats, summarizeRating } from "@/lib/rating";
import { store } from "@/lib/store";
import { STAGE_LABEL } from "@/lib/trip";
import { ChevronRightIcon } from "@/components/icons";
import { Stars } from "@/components/rating-summary";
import { EmptyState, FullPageSpinner, LinkButton, PageHeader, Segmented } from "@/components/ui";

type Filter = "all" | "rated" | "unrated";

export default function HistoryPage() {
  const { user } = useAuth();
  const userId = user!.id;
  const [filter, setFilter] = useState<Filter>("all");
  const [items] = useAsync(async () => {
    const bookings = await store.listBookings(userId);
    return Promise.all(bookings.map(async (b) => ({ booking: b, rating: await store.getRating(b.id) })));
  }, [userId]);

  if (!items) return <FullPageSpinner />;

  if (items.length === 0) {
    return (
      <>
        <PageHeader title="Your rides" />
        <EmptyState
          title="No rides yet"
          body="Your booked rides and how well they met your preferences will show up here."
          action={<LinkButton href="/ride/new" block>Book your first ride</LinkButton>}
        />
      </>
    );
  }

  const stats = historyStats(items.map((i) => ({ activeKeys: i.booking.activeKeys, rating: i.rating })));
  const unrated = items.filter((i) => !i.rating).length;
  const visible = items.filter((i) => (filter === "all" ? true : filter === "rated" ? !!i.rating : !i.rating));

  return (
    <>
      <PageHeader title="Your rides" />
      <div className="flex flex-col gap-3 px-4">
        <dl className="num grid grid-cols-3 gap-2" aria-label="Ride stats">
          {[
            ["Rides", String(stats.rides)],
            ["Avg stars", stats.avgStars?.toFixed(1) ?? "–"],
            ["Prefs met", stats.metPct === null ? "–" : `${stats.metPct}%`],
          ].map(([label, value], i) => (
            <div key={label} className="animate-rise rounded-2xl border border-line bg-surface px-3 py-2.5" style={{ animationDelay: `${i * 60}ms` }}>
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="font-display text-2xl font-semibold">{value}</dd>
            </div>
          ))}
        </dl>

        <Segmented<Filter>
          name="history-filter"
          label="Show"
          value={filter}
          options={[
            { value: "all", label: `All (${items.length})` },
            { value: "rated", label: `Rated (${items.length - unrated})` },
            { value: "unrated", label: `To rate (${unrated})` },
          ]}
          onChange={setFilter}
        />

        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line bg-surface px-6 py-8 text-center">
            <p className="text-sm text-muted">{filter === "unrated" ? "You've rated every ride. Nice." : "No rated rides yet."}</p>
            <button type="button" onClick={() => setFilter("all")} className="min-h-11 font-semibold text-accent underline underline-offset-4">
              Show all rides
            </button>
          </div>
        ) : (
          <ul key={filter} className="flex flex-col gap-3" aria-label="Ride history">
            {visible.map(({ booking: b, rating }, i) => {
              const summary = rating ? summarizeRating(rating.perPreference, b.activeKeys) : null;
              const pct = summary && summary.total ? (summary.met / summary.total) * 100 : 0;
              return (
                <li key={b.id} data-testid="history-item" className="animate-rise" style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}>
                  <Link
                    href={rating || b.status !== "completed" ? `/ride/${b.id}` : `/ride/${b.id}/rate`}
                    className="flex items-center gap-3 elevated rounded-[28px] border border-line bg-surface p-4 transition-[background-color,transform] duration-150 hover:bg-surface-2 active:scale-[0.98]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-display text-lg font-semibold">{b.option.tier}</p>
                        <p className="num font-bold">{formatPrice(b.option.price)}</p>
                      </div>
                      <p className="truncate text-sm text-muted">
                        {b.pickup} → {b.dropoff}
                      </p>
                      <p className="num text-xs text-muted">
                        {new Date(b.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {summary ? (
                          <>
                            <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent-soft-fg">
                              {summary.label}
                            </span>
                            <Stars value={rating!.stars} size={14} />
                          </>
                        ) : b.status === "completed" ? (
                          <span className="rounded-full bg-warn-soft px-2.5 py-1 text-xs font-bold text-warn">Not rated yet · tap to rate</span>
                        ) : (
                          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold">In progress · {STAGE_LABEL[b.status]}</span>
                        )}
                      </div>
                      {summary && (
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
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
