"use client";

import { useId } from "react";
import { PRICE_MAX, PRICE_MIN, SIZE_LABEL, WAIT_MAX, WAIT_MIN } from "@/lib/prefs";
import type { Preferences, VehicleSize } from "@/lib/types";
import { Segmented, Switch } from "./ui";

export function opts<T extends string>(labels: Record<T, string>) {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}

export function RangeField({
  label,
  value,
  min,
  max,
  format,
  spoken,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  format: (n: number) => string;
  spoken: (n: number) => string;
  onChange: (n: number) => void;
}) {
  const id = useId();
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-semibold">
          {label}
        </label>
        {/* Re-keyed on change so the value gives a small pop. */}
        <span key={value} className="num animate-pop inline-block text-xl font-extrabold tracking-tight">
          {format(value)}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11 w-full cursor-pointer"
        aria-valuetext={spoken(value)}
      />
      <div className="num flex justify-between text-xs text-muted">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

type Set = <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;

/** The hard filters: max price, max wait, vehicle size, wheelchair access. */
export function MustHaveControls({ prefs, set, idPrefix }: { prefs: Preferences; set: Set; idPrefix: string }) {
  return (
    <>
      <RangeField
        label="Max price"
        value={prefs.maxPrice}
        min={PRICE_MIN}
        max={PRICE_MAX}
        format={(n) => `$${n}`}
        spoken={(n) => `$${n}`}
        onChange={(n) => set("maxPrice", n)}
      />
      <RangeField
        label="Max pickup wait"
        value={prefs.maxWaitMin}
        min={WAIT_MIN}
        max={WAIT_MAX}
        format={(n) => `${n} min`}
        spoken={(n) => `${n} minutes`}
        onChange={(n) => set("maxWaitMin", n)}
      />
      <Segmented<VehicleSize>
        name={`${idPrefix}-size`}
        label="Vehicle size"
        value={prefs.vehicleSize}
        options={opts(SIZE_LABEL)}
        onChange={(v) => set("vehicleSize", v)}
      />
      <Switch
        label="Wheelchair accessible"
        description="Ramp or lift-equipped vehicle"
        checked={prefs.wheelchair}
        onChange={(v) => set("wheelchair", v)}
      />
    </>
  );
}
