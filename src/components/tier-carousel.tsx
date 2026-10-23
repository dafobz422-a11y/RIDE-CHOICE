"use client";

import { useEffect, useRef } from "react";
import { formatPrice } from "@/lib/prefs";
import { TIER_INFO } from "@/lib/rides";
import type { RideOption, Tier } from "@/lib/types";
import { CheckIcon, ClockIcon } from "./icons";
import { haptic } from "./feedback";
import { LinkButton, cx } from "./ui";
import { VehicleArt } from "./vehicle-art";

/** Swipeable ride types; the selected one opens a detail panel below. */
export function TierCarousel({
  options,
  selected,
  onSelect,
  routeLabel,
}: {
  options: RideOption[];
  selected: Tier | null;
  onSelect: (tier: Tier) => void;
  routeLabel: string;
}) {
  const current = options.find((o) => o.tier === selected) ?? null;
  const strip = useRef<HTMLDivElement>(null);

  // A car picked on the map brings its card into view, without moving the page vertically.
  useEffect(() => {
    const el = strip.current;
    const card = el?.querySelector<HTMLElement>('[aria-checked="true"]');
    if (!el || !card) return;
    const target = card.offsetLeft - el.offsetLeft - (el.clientWidth - card.clientWidth) / 2;
    el.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [selected]);

  return (
    <div className="flex flex-col gap-3">
      <div ref={strip} role="radiogroup" aria-label="Ride types" className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-px-4 px-4 pb-1">
        {options.map((o) => {
          const on = o.tier === selected;
          return (
            <button
              key={o.tier}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                haptic(5);
                onSelect(o.tier);
              }}
              className={cx(
                "flex w-[8.5rem] shrink-0 snap-start flex-col items-start rounded-[22px] border p-3 text-left transition-all duration-200 active:scale-95",
                on ? "elevated-lg border-accent/50 bg-surface ring-2 ring-accent/25" : "elevated border-line bg-surface",
              )}
            >
              <span className={cx("flex h-12 w-full items-end justify-center rounded-xl transition-colors", on ? "bg-accent-soft" : "bg-surface-2/70")}>
                <VehicleArt tier={o.tier} className={cx("mb-1 h-9 w-auto transition-transform duration-300", on && "scale-110")} />
              </span>
              <span className="mt-2 font-display text-sm font-semibold">{o.tier}</span>
              <span className="num text-xs text-muted">
                {formatPrice(o.price)} · {o.etaMin} min
              </span>
            </button>
          );
        })}
      </div>

      {current && (
        <div key={current.tier} className="animate-rise elevated rounded-[24px] border border-line bg-surface p-4" aria-live="polite">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-lg font-semibold">{current.tier}</p>
              <p className="text-sm text-muted">{TIER_INFO[current.tier].tagline}</p>
            </div>
            <div className="text-right">
              <p className="num text-xl font-extrabold tracking-tight">{formatPrice(current.price)}</p>
              <p className="num flex items-center justify-end gap-1 text-xs text-muted">
                <ClockIcon size={12} /> {current.etaMin} min away
              </p>
            </div>
          </div>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {TIER_INFO[current.tier].perks.map((perk) => (
              <li key={perk} className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold">
                <CheckIcon size={12} strokeWidth={3} className="text-success" /> {perk}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">Estimate for {routeLabel}. Final options are checked against your preferences.</p>
          <LinkButton href="/ride/new" block className="mt-3">
            Book a ride
          </LinkButton>
        </div>
      )}
    </div>
  );
}
