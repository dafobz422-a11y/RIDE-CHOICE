"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { selectOptions, type Selection } from "@/lib/matching";
import { DEFAULT_PREFERENCES, PRIORITY_LABEL, activeKeys } from "@/lib/prefs";
import { TIERS, generateOptions } from "@/lib/rides";
import { newId, store } from "@/lib/store";
import type { Preferences, RideOption, TripDraft } from "@/lib/types";
import { ColumnsIcon, TableIcon } from "@/components/icons";
import { CompareTable, OptionCard } from "@/components/ride-option";
import { EmptyState, LinkButton, PageHeader, Skeleton, cx } from "@/components/ui";

const FAKE_LATENCY_MS = 600;

type View = "columns" | "table";
type Loaded = { draft: TripDraft | null; prefs: Preferences; selection: Selection | null };

export default function ComparePage() {
  const { user } = useAuth();
  const router = useRouter();
  const userId = user!.id;
  const [data, setData] = useState<Loaded | null>(null);
  const [view, setView] = useState<View>("columns");
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [draft, prefs] = await Promise.all([store.getDraft(userId), store.getPreferences(userId)]);
      const p = prefs ?? DEFAULT_PREFERENCES;
      // Simulated network latency so the skeleton state is real.
      await new Promise((r) => setTimeout(r, FAKE_LATENCY_MS));
      const selection = draft ? selectOptions(generateOptions(draft.pickup, draft.dropoff), p) : null;
      if (alive) setData({ draft, prefs: p, selection });
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    const cards = [...el.querySelectorAll<HTMLElement>("[data-testid=ride-option]")];
    const left = el.scrollLeft;
    let best = 0;
    cards.forEach((c, i) => {
      if (Math.abs(c.offsetLeft - el.offsetLeft - left) < Math.abs(cards[best].offsetLeft - el.offsetLeft - left)) best = i;
    });
    setActive(best);
  }

  async function book(option: RideOption) {
    if (!data?.draft) return;
    setBusy(true);
    const id = newId();
    await store.createBooking({
      id,
      userId,
      pickup: data.draft.pickup,
      dropoff: data.draft.dropoff,
      option,
      preferencesSnapshot: data.prefs,
      activeKeys: activeKeys(data.prefs),
      status: "assigned",
      createdAt: new Date().toISOString(),
    });
    router.push(`/ride/${id}`);
  }

  if (!data) {
    return (
      <>
        <PageHeader title="Comparing rides" subtitle="Checking every ride against your preferences…" back="/ride/new" />
        <div role="status" aria-label="Loading ride options" className="flex gap-3 overflow-hidden px-4">
          {[0, 1].map((i) => (
            <div key={i} className="flex w-[80%] shrink-0 flex-col gap-3 rounded-3xl border border-line bg-surface p-4">
              <Skeleton className="h-6 w-24" />
              <div className="flex justify-between">
                <Skeleton className="h-7 w-28" />
                <Skeleton className="h-7 w-20" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
              {[0, 1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-9" />
              ))}
              <Skeleton className="h-12 rounded-2xl" />
            </div>
          ))}
        </div>
      </>
    );
  }

  if (!data.draft || !data.selection) {
    return (
      <>
        <PageHeader title="Compare rides" />
        <EmptyState
          title="No trip yet"
          body="Tell us where you're going and we'll line up the rides that fit."
          action={<LinkButton href="/ride/new" block>Plan a ride</LinkButton>}
        />
      </>
    );
  }

  const { draft, prefs, selection } = data;
  const keys = activeKeys(prefs);
  const { shown, eligibleCount } = selection;

  return (
    <>
      <PageHeader
        back="/ride/new"
        title="Compare rides"
        subtitle={
          <>
            <span className="font-semibold text-ink">{draft.pickup}</span> → <span className="font-semibold text-ink">{draft.dropoff}</span>
          </>
        }
      />

      <div className="flex flex-col gap-3 px-4 pb-3">
        <p className="text-sm" role="status">
          <strong className="num">
            {eligibleCount} of {TIERS.length}
          </strong>{" "}
          rides fit your must-haves · sorted by {PRIORITY_LABEL[prefs.priority].toLowerCase()}.{" "}
          <Link href="/preferences" className="font-semibold text-accent underline underline-offset-4">
            Edit preferences
          </Link>
        </p>
        {eligibleCount < 3 && (
          <p className="rounded-2xl bg-warn-soft px-3 py-2 text-sm font-medium text-warn">
            {eligibleCount === 0 ? "No rides" : `Only ${eligibleCount} ride${eligibleCount === 1 ? "" : "s"}`} met every
            must-have, so the nearest misses are shown and labeled with what they miss.
          </p>
        )}
        <div role="radiogroup" aria-label="Comparison layout" className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1">
          {(
            [
              ["columns", "Side by side", ColumnsIcon],
              ["table", "Table", TableIcon],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              role="radio"
              aria-checked={view === value}
              onClick={() => setView(value)}
              className={cx(
                "flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold",
                view === value ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-muted hover:text-ink",
              )}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
      </div>

      {view === "columns" ? (
        <>
          <div
            ref={scroller}
            onScroll={onScroll}
            className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2"
            aria-label="Ride options"
          >
            {shown.map((s, i) => (
              <OptionCard
                key={s.option.id}
                shown={s}
                keys={keys}
                prefs={prefs}
                onBook={book}
                busy={busy}
                position={i + 1}
                count={shown.length}
              />
            ))}
            <span className="w-1 shrink-0" aria-hidden />
          </div>
          <p className="num mt-1 flex items-center justify-center gap-2 text-xs text-muted">
            <span className="flex gap-1.5" aria-hidden>
              {shown.map((s, i) => (
                <span key={s.option.id} className={cx("h-1.5 rounded-full transition-all", i === active ? "w-5 bg-accent" : "w-1.5 bg-line")} />
              ))}
            </span>
            {active + 1} of {shown.length} · swipe to compare
          </p>
        </>
      ) : (
        <div className="px-4">
          <CompareTable shown={shown} keys={keys} onBook={book} busy={busy} />
        </div>
      )}
    </>
  );
}
