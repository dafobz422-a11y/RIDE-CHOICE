"use client";

import { useMemo, useState } from "react";
import {
  DAY_PARTS,
  type DayPart,
  dayChip,
  dayLabel,
  formatSchedule,
  formatTime,
  scheduleDays,
  slotsFor,
  startOfDay,
} from "@/lib/schedule";
import { haptic } from "./feedback";
import { cx } from "./ui";

function partOf(d: Date): DayPart {
  const h = d.getHours();
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}

/** Day chips, a part-of-day switch and a grid of 30-minute pickup slots. */
export function SchedulePicker({
  value,
  onChange,
  now,
}: {
  value: string | null;
  onChange: (iso: string) => void;
  now: Date;
}) {
  const days = useMemo(() => scheduleDays(now), [now]);
  const selected = value ? new Date(value) : null;
  const [day, setDay] = useState<Date>(() => (selected ? startOfDay(selected) : days[0]));
  const [part, setPart] = useState<DayPart>(() => {
    if (selected) return partOf(selected);
    return DAY_PARTS.find((p) => slotsFor(days[0], p.id, now).length > 0)?.id ?? "morning";
  });
  const slots = slotsFor(day, part, now);

  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="Pickup day" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {days.map((d) => {
          const on = d.getTime() === day.getTime();
          const label = dayLabel(d, now);
          const { top, bottom } = dayChip(d, now);
          return (
            <button
              key={d.toISOString()}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={label}
              onClick={() => {
                haptic(5);
                setDay(d);
                if (slotsFor(d, part, now).length === 0) {
                  setPart(DAY_PARTS.find((p) => slotsFor(d, p.id, now).length > 0)?.id ?? "morning");
                }
              }}
              className={cx(
                "flex min-h-16 min-w-[4.75rem] shrink-0 flex-col items-center justify-center rounded-2xl border px-3 transition-all duration-150 active:scale-95",
                on ? "btn-primary border-transparent text-accent-fg" : "elevated border-line bg-surface hover:border-line-strong",
              )}
            >
              <span className={cx("text-[0.7rem] font-bold uppercase tracking-wider", on ? "opacity-90" : "text-muted")}>{top}</span>
              <span className="num text-sm font-bold">{bottom}</span>
            </button>
          );
        })}
      </div>

      <div role="radiogroup" aria-label="Time of day" className="grid grid-cols-3 gap-1 rounded-full bg-surface-2 p-1">
        {DAY_PARTS.map((p) => {
          const on = p.id === part;
          const empty = slotsFor(day, p.id, now).length === 0;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setPart(p.id)}
              className={cx(
                "min-h-11 rounded-full text-sm font-bold transition-colors",
                on ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-muted hover:text-ink",
                empty && !on && "opacity-60",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {slots.length === 0 ? (
        <p className="rounded-2xl bg-surface-2 px-4 py-5 text-center text-sm text-muted">
          No pickup times left this {DAY_PARTS.find((p) => p.id === part)!.label.toLowerCase()}. Try a later part of the day.
        </p>
      ) : (
        <div role="radiogroup" aria-label="Pickup time" className="grid grid-cols-4 gap-2">
          {slots.map((s) => {
            const iso = s.toISOString();
            const on = value !== null && new Date(value).getTime() === s.getTime();
            return (
              <button
                key={iso}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  haptic(5);
                  onChange(iso);
                }}
                className={cx(
                  "num min-h-11 rounded-xl border text-sm font-bold transition-all duration-150 active:scale-95",
                  on ? "btn-primary border-transparent text-accent-fg" : "border-line bg-surface hover:border-line-strong",
                )}
              >
                {formatTime(s).replace(" ", " ")}
              </button>
            );
          })}
        </div>
      )}

      <p className="text-sm text-muted" aria-live="polite">
        {value ? (
          <>
            Pickup <strong className="text-ink">{formatSchedule(value, now)}</strong>. Your driver is assigned about 15 minutes before.
          </>
        ) : (
          "Pick a time at least 30 minutes from now, up to a week ahead."
        )}
      </p>
    </div>
  );
}
