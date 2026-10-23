"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { selectOptions, totalTime } from "@/lib/matching";
import { DEFAULT_PREFERENCES, PREF_SHORT, PRIORITY_LABEL, SIZE_LABEL, activeKeys, formatPrice } from "@/lib/prefs";
import { TIERS, generateOptions } from "@/lib/rides";
import { newId, store } from "@/lib/store";
import type { Preferences, Priority, RideOption, TripDraft } from "@/lib/types";
import { haptic, Sheet, useToast } from "@/components/feedback";
import { ClockIcon, ColumnsIcon, FlagIcon, PinIcon, SlidersIcon, TableIcon } from "@/components/icons";
import { MustHaveControls, opts } from "@/components/pref-controls";
import { CompareTable, MetMark, OptionCard, ScoreMeter } from "@/components/ride-option";
import { Button, EmptyState, LinkButton, PageHeader, Segmented, Skeleton, cx } from "@/components/ui";

const FAKE_LATENCY_MS = 600;

type View = "columns" | "table";
type Loaded = { draft: TripDraft | null; saved: Preferences };

export default function ComparePage() {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const userId = user!.id;
  const [data, setData] = useState<Loaded | null>(null);
  // Search-only tweaks to the must-haves; null means "use saved preferences".
  const [override, setOverride] = useState<Preferences | null>(null);
  const [tuning, setTuning] = useState<Preferences | null>(null);
  const [pending, setPending] = useState<RideOption | null>(null);
  const [view, setView] = useState<View>("columns");
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [draft, prefs] = await Promise.all([store.getDraft(userId), store.getPreferences(userId)]);
      // Simulated network latency so the skeleton state is real.
      await new Promise((r) => setTimeout(r, FAKE_LATENCY_MS));
      if (alive) setData({ draft, saved: prefs ?? DEFAULT_PREFERENCES });
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  const draft = data?.draft ?? null;
  const options = useMemo(() => (draft ? generateOptions(draft.pickup, draft.dropoff) : []), [draft]);
  const prefs = override ?? data?.saved ?? DEFAULT_PREFERENCES;
  const selection = useMemo(() => selectOptions(options, prefs), [options, prefs]);
  const tuningCount = useMemo(() => (tuning ? selectOptions(options, tuning).eligibleCount : 0), [options, tuning]);

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

  function scrollToCard(i: number) {
    const el = scroller.current;
    const card = el?.querySelectorAll<HTMLElement>("[data-testid=ride-option]")[i];
    if (el && card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft - 16, behavior: "smooth" });
  }

  function setPriority(priority: Priority) {
    haptic(5);
    setOverride({ ...prefs, priority });
    scroller.current?.scrollTo({ left: 0 });
    setActive(0);
  }

  function applyTuning(save: boolean) {
    if (!tuning) return;
    setOverride(tuning);
    if (save) {
      void store.savePreferences(userId, tuning);
      setData((d) => (d ? { ...d, saved: tuning } : d));
      setOverride(null);
      toast("Saved to your preferences");
    }
    setTuning(null);
    scroller.current?.scrollTo({ left: 0 });
    setActive(0);
  }

  async function confirmBooking() {
    if (!data?.draft || !pending) return;
    setBusy(true);
    const id = newId();
    await store.createBooking({
      id,
      userId,
      pickup: data.draft.pickup,
      dropoff: data.draft.dropoff,
      option: pending,
      preferencesSnapshot: prefs,
      activeKeys: activeKeys(prefs),
      status: "assigned",
      createdAt: new Date().toISOString(),
    });
    haptic([10, 40, 20]);
    toast(`${pending.tier} booked`);
    router.push(`/ride/${id}`);
  }

  if (!data) {
    return (
      <>
        <PageHeader title="Comparing rides" subtitle="Checking every ride against your preferences…" back="/ride/new" />
        <div role="status" aria-label="Loading ride options" className="flex gap-3 overflow-hidden px-4">
          {[0, 1].map((i) => (
            <div key={i} className="flex w-[80%] shrink-0 flex-col gap-3 elevated rounded-[28px] border border-line bg-surface p-4">
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

  if (!draft) {
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

  const keys = activeKeys(prefs);
  const { shown, eligibleCount } = selection;
  const chips = [
    `Up to $${prefs.maxPrice}`,
    `≤ ${prefs.maxWaitMin} min wait`,
    prefs.vehicleSize !== "any" && `${SIZE_LABEL[prefs.vehicleSize]} only`,
    prefs.wheelchair && "Wheelchair",
  ].filter(Boolean) as string[];
  // Re-mount the list when the result set changes so the cards animate in again.
  const listKey = shown.map((s) => s.option.id).join("|");

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
        <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 no-scrollbar" aria-label="Must-haves for this search">
          <button
            type="button"
            onClick={() => setTuning(prefs)}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-accent-fg transition-transform active:scale-95"
          >
            <SlidersIcon size={16} /> Adjust
          </button>
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setTuning(prefs)}
              className="num inline-flex min-h-11 shrink-0 items-center rounded-full border border-line bg-surface px-3.5 text-sm font-semibold transition-transform active:scale-95"
            >
              {c}
            </button>
          ))}
        </div>

        <p className="text-sm" role="status">
          <strong key={eligibleCount} className="num animate-pop inline-block">
            {eligibleCount} of {TIERS.length}
          </strong>{" "}
          rides fit your must-haves.{" "}
          {override && (
            <>
              <span className="font-semibold text-accent">Adjusted for this search.</span>{" "}
              <button type="button" onClick={() => setOverride(null)} className="font-semibold text-accent underline underline-offset-4">
                Reset
              </button>
            </>
          )}
          {!override && (
            <Link href="/preferences" className="font-semibold text-accent underline underline-offset-4">
              Edit preferences
            </Link>
          )}
        </p>
        {eligibleCount < 3 && (
          <p className="animate-rise rounded-2xl bg-warn-soft px-3 py-2 text-sm font-medium text-warn">
            {eligibleCount === 0 ? "No rides" : `Only ${eligibleCount} ride${eligibleCount === 1 ? "" : "s"}`} met every
            must-have, so the nearest misses are shown and labeled with what they miss. Tap <strong>Adjust</strong> to loosen them.
          </p>
        )}

        <Segmented<Priority>
          name="compare-priority"
          label="Sort by"
          value={prefs.priority}
          options={opts(PRIORITY_LABEL)}
          onChange={setPriority}
        />

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
                "flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors",
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
            key={listKey}
            ref={scroller}
            onScroll={onScroll}
            className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2"
            aria-label="Ride options"
          >
            {shown.map((s, i) => (
              <div key={s.option.id} className="animate-rise flex w-[80%] max-w-[330px] shrink-0 snap-start" style={{ animationDelay: `${i * 70}ms` }}>
                <OptionCard
                  shown={s}
                  keys={keys}
                  prefs={prefs}
                  onBook={(o) => {
                    haptic();
                    setPending(o);
                  }}
                  busy={busy}
                  position={i + 1}
                  count={shown.length}
                />
              </div>
            ))}
            <span className="w-1 shrink-0" aria-hidden />
          </div>
          <div className="flex items-center justify-center gap-1">
            {shown.map((s, i) => (
              <button
                key={s.option.id}
                type="button"
                onClick={() => scrollToCard(i)}
                aria-label={`Show option ${i + 1}: ${s.option.tier}`}
                aria-current={i === active ? "true" : undefined}
                className="flex h-11 min-w-8 items-center justify-center"
              >
                <span className={cx("h-2 rounded-full transition-all duration-300", i === active ? "w-6 bg-accent" : "w-2 bg-line")} />
              </button>
            ))}
            <span className="num ml-1 text-xs text-muted">
              {active + 1} of {shown.length}
            </span>
          </div>
        </>
      ) : (
        <div className="animate-rise px-4">
          <CompareTable
            shown={shown}
            keys={keys}
            onBook={(o) => {
              haptic();
              setPending(o);
            }}
            busy={busy}
          />
        </div>
      )}

      <Sheet open={tuning !== null} onClose={() => setTuning(null)} title="Adjust must-haves">
        {tuning && (
          <div className="flex flex-col gap-5">
            <p className="text-sm text-muted" aria-live="polite">
              <strong key={tuningCount} className="num animate-pop inline-block font-display text-lg text-ink">
                {tuningCount}
              </strong>{" "}
              of {TIERS.length} rides would fit
            </p>
            <MustHaveControls
              prefs={tuning}
              set={(key, value) => setTuning((t) => (t ? { ...t, [key]: value } : t))}
              idPrefix="tune"
            />
            <div className="flex flex-col gap-2">
              <Button block onClick={() => applyTuning(false)}>
                Show {tuningCount} matching ride{tuningCount === 1 ? "" : "s"}
              </Button>
              <Button block variant="ghost" onClick={() => applyTuning(true)}>
                Apply and save to my preferences
              </Button>
            </div>
          </div>
        )}
      </Sheet>

      <Sheet open={pending !== null} onClose={() => !busy && setPending(null)} title="Confirm your ride">
        {pending && (
          <div className="flex flex-col gap-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="font-display text-2xl font-semibold">{pending.tier}</p>
                <p className="text-sm text-muted">
                  {pending.vehicle.color} {pending.vehicle.make} {pending.vehicle.model} · {pending.driver.name}
                </p>
              </div>
              <p className="num text-3xl font-extrabold tracking-tight">{formatPrice(pending.price)}</p>
            </div>
            <ul className="flex flex-col gap-2 rounded-2xl bg-surface-2 p-3 text-sm">
              <li className="flex items-center gap-2">
                <PinIcon size={16} className="text-accent" /> {draft.pickup}
              </li>
              <li className="flex items-center gap-2">
                <FlagIcon size={16} className="text-accent" /> {draft.dropoff}
              </li>
              <li className="num flex items-center gap-2 text-muted">
                <ClockIcon size={16} /> Pickup in {pending.etaMin} min · arrive in ~{totalTime(pending)} min
              </li>
            </ul>
            <ScoreMeter score={pending.matchScore} total={keys.length} />
            {keys.some((k) => !pending.meets[k]) && (
              <ul className="flex flex-col gap-1.5 text-sm" aria-label="Preferences this ride misses">
                {keys
                  .filter((k) => !pending.meets[k])
                  .map((k) => (
                    <li key={k} className="flex items-center gap-2">
                      <MetMark met={false} size={12} /> Misses {PREF_SHORT[k].toLowerCase()}
                    </li>
                  ))}
              </ul>
            )}
            <div className="flex flex-col gap-2">
              <Button block onClick={confirmBooking} disabled={busy}>
                {busy ? "Booking…" : `Confirm booking · ${formatPrice(pending.price)}`}
              </Button>
              <Button block variant="secondary" onClick={() => setPending(null)} disabled={busy}>
                Keep comparing
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}
