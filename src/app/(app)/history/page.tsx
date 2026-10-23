"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useAsync } from "@/lib/hooks";
import { formatPrice } from "@/lib/prefs";
import { summarizeRating } from "@/lib/rating";
import { store } from "@/lib/store";
import { STAGE_LABEL } from "@/lib/trip";
import { ChevronRightIcon } from "@/components/icons";
import { Stars } from "@/components/rating-summary";
import { EmptyState, FullPageSpinner, LinkButton, PageHeader } from "@/components/ui";

export default function HistoryPage() {
  const { user } = useAuth();
  const userId = user!.id;
  const [items] = useAsync(async () => {
    const bookings = await store.listBookings(userId);
    return Promise.all(bookings.map(async (b) => ({ booking: b, rating: await store.getRating(b.id) })));
  }, [userId]);

  if (!items) return <FullPageSpinner />;

  return (
    <>
      <PageHeader title="Your rides" subtitle={items.length ? `${items.length} ride${items.length === 1 ? "" : "s"}` : undefined} />
      {items.length === 0 ? (
        <EmptyState
          title="No rides yet"
          body="Your booked rides and how well they met your preferences will show up here."
          action={<LinkButton href="/ride/new" block>Book your first ride</LinkButton>}
        />
      ) : (
        <ul className="flex flex-col gap-3 px-4" aria-label="Ride history">
          {items.map(({ booking: b, rating }) => {
            const summary = rating ? summarizeRating(rating.perPreference, b.activeKeys) : null;
            return (
              <li key={b.id} data-testid="history-item">
                <Link
                  href={`/ride/${b.id}`}
                  className="flex items-center gap-3 rounded-3xl border border-line bg-surface p-4 hover:bg-surface-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-display text-lg font-bold">{b.option.tier}</p>
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
                  </div>
                  <ChevronRightIcon className="shrink-0 text-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
