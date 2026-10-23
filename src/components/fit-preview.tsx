"use client";

import { useMemo } from "react";
import { selectOptions, failedHardKeys, evaluate } from "@/lib/matching";
import { PREF_SHORT } from "@/lib/prefs";
import { TIERS, generateOptions } from "@/lib/rides";
import type { Preferences, TripDraft } from "@/lib/types";
import { CheckIcon, XIcon } from "./icons";
import { cx } from "./ui";

export const SAMPLE_TRIP: TripDraft = { pickup: "Union Station, 50 Front St", dropoff: "City Hall, 100 Main St" };

/** Live "how many rides would fit" for a route, updating as preferences change. */
export function FitPreview({ prefs, trip }: { prefs: Preferences; trip: TripDraft }) {
  const options = useMemo(() => generateOptions(trip.pickup, trip.dropoff), [trip.pickup, trip.dropoff]);
  const rows = options.map((o) => {
    const scored = evaluate(o, prefs);
    return { option: scored, failed: failedHardKeys(scored) };
  });
  const fit = selectOptions(options, prefs).eligibleCount;

  return (
    <section aria-labelledby="fit-preview" className="elevated rounded-[28px] border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="fit-preview" className="text-xs font-bold tracking-wider text-muted uppercase">
          Live preview
        </h2>
        <p className="num text-sm" aria-live="polite">
          <strong key={fit} className="animate-pop inline-block font-display text-lg">
            {fit}
          </strong>{" "}
          of {TIERS.length} rides fit
        </p>
      </div>
      <p className="mt-0.5 truncate text-xs text-muted">
        {trip.pickup} → {trip.dropoff}
      </p>
      <ul className="mt-3 grid grid-cols-3 gap-1.5">
        {rows.map(({ option: o, failed }) => {
          const ok = failed.length === 0;
          return (
            <li
              key={o.id}
              title={ok ? "Fits your must-haves" : `Misses: ${failed.map((k) => PREF_SHORT[k]).join(", ")}`}
              className={cx(
                "flex min-h-11 flex-col justify-center rounded-xl px-2 py-1.5 text-xs transition-colors duration-200",
                ok ? "bg-success-soft text-success" : "bg-surface-2 text-muted",
              )}
            >
              <span className="flex items-center gap-1 font-bold">
                {ok ? <CheckIcon size={12} strokeWidth={3} /> : <XIcon size={12} strokeWidth={3} />}
                {o.tier}
              </span>
              <span className="num truncate">
                {ok ? `$${o.price.toFixed(0)} · ${o.etaMin} min` : `Misses ${failed.map((k) => PREF_SHORT[k].toLowerCase()).join(", ")}`}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
