"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import type { RideOption, Tier } from "@/lib/types";

const W = 360;
const H = 230;
const ME = { x: 180, y: 122 };

/** Each car circles its own loop near the rider at its own pace. */
const LOOPS = [
  { cx: 150, cy: 95, rx: 70, ry: 38, speed: 0.22, phase: 0.3 },
  { cx: 215, cy: 140, rx: 80, ry: 45, speed: -0.17, phase: 2.1 },
  { cx: 120, cy: 160, rx: 60, ry: 32, speed: 0.15, phase: 4.0 },
  { cx: 250, cy: 85, rx: 55, ry: 34, speed: -0.2, phase: 1.2 },
  { cx: 95, cy: 75, rx: 45, ry: 28, speed: 0.12, phase: 5.2 },
  { cx: 280, cy: 170, rx: 50, ry: 30, speed: 0.18, phase: 3.3 },
];

function carAt(i: number, t: number) {
  const l = LOOPS[i % LOOPS.length];
  const a = l.phase + t * l.speed;
  const x = l.cx + l.rx * Math.cos(a);
  const y = l.cy + l.ry * Math.sin(a);
  // Heading is the tangent of the ellipse, in the direction of travel.
  const dx = -l.rx * Math.sin(a) * Math.sign(l.speed);
  const dy = l.ry * Math.cos(a) * Math.sign(l.speed);
  return { x, y, deg: (Math.atan2(dy, dx) * 180) / Math.PI };
}

function useClock(): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    let reduced = false;
    try {
      reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      /* older browsers */
    }
    if (reduced) return;
    let raf = 0;
    let last = 0;
    const start = performance.now();
    const tick = (now: number) => {
      // ~30 fps is plenty for gliding cars and keeps the work light.
      if (now - last > 33) {
        last = now;
        setT((now - start) / 1000);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return t;
}

/** Stylised live map: the rider's pin with nearby cars that can be tapped to select a tier. */
export function NearbyMap({
  options,
  selected,
  onSelect,
}: {
  options: RideOption[];
  selected: Tier | null;
  onSelect: (tier: Tier) => void;
}) {
  const t = useClock();
  const onKey = (tier: Tier) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(tier);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[24px] bg-surface-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="group" aria-label="Nearby cars. Tap a car to see its ride type.">
        {/* Park, river and streets */}
        <path d="M250 0 C 240 40, 290 60, 300 100 S 360 140, 360 140 L360 0 Z" fill="var(--success-soft)" opacity="0.8" />
        <path d="M0 200 C 60 180, 120 230, 200 205 S 320 190, 360 215" fill="none" stroke="var(--accent-soft)" strokeWidth="16" opacity="0.9" />
        <g stroke="var(--surface)" strokeLinecap="round">
          <path d="M0 60 H360 M0 122 H360 M0 175 H360 M70 0 V230 M180 0 V230 M290 0 V230" strokeWidth="9" />
          <path d="M0 230 L250 0" strokeWidth="7" />
        </g>
        <g stroke="var(--border)" strokeWidth="1" strokeDasharray="4 6" opacity="0.9">
          <path d="M0 122 H360 M180 0 V230" />
        </g>

        {/* Rider */}
        <circle cx={ME.x} cy={ME.y} r="26" fill="var(--accent)" opacity="0.12" className="map-ping" />
        <circle cx={ME.x} cy={ME.y} r="11" fill="var(--surface)" />
        <circle cx={ME.x} cy={ME.y} r="7" fill="var(--accent)" />

        {/* Selected car drawn last so its label sits above the others. */}
        {options
          .map((o, i) => ({ o, i }))
          .sort((a, b) => Number(a.o.tier === selected) - Number(b.o.tier === selected))
          .map(({ o, i }) => {
            const { x, y, deg } = carAt(i, t);
            const on = selected === o.tier;
            const label = `${o.tier} · ${o.etaMin} min`;
            const lw = label.length * 6.3 + 20;
            // Keep the label inside the map horizontally.
            const lx = Math.min(Math.max(x, lw / 2 + 4), W - lw / 2 - 4) - x;
            return (
              <g
                key={o.tier}
                role="button"
                tabIndex={0}
                aria-pressed={on}
                aria-label={`${o.tier}, ${o.etaMin} minutes away`}
                onClick={() => onSelect(o.tier)}
                onKeyDown={onKey(o.tier)}
                transform={`translate(${x} ${y})`}
                className="cursor-pointer outline-none [&:focus-visible>circle:first-child]:stroke-[var(--ring)]"
              >
                {/* Generous invisible hit area so moving cars stay easy to tap. */}
                <circle r="22" fill="transparent" stroke="transparent" strokeWidth="3" />
                <g transform={`rotate(${deg}) scale(${on ? 1.35 : 1})`} style={{ transition: "transform 200ms" }}>
                  <rect x="-9" y="-5" width="18" height="10" rx="3.5" fill={on ? "var(--accent)" : "var(--text)"} />
                  <rect x="1.5" y="-3.5" width="4" height="7" rx="1.5" fill="var(--surface)" opacity="0.85" />
                </g>
                {on && (
                  <g transform={`translate(${lx} ${y < 40 ? 26 : -24})`}>
                    <rect x={-lw / 2} y="-12" width={lw} height="22" rx="11" fill="var(--text)" />
                    <text textAnchor="middle" y="3" fontSize="10.5" fontWeight="700" fill="var(--bg)" className="num">
                      {label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
      </svg>
      <p className="pointer-events-none absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-surface/95 px-2.5 py-1 text-[0.7rem] font-bold shadow-sm">
        <span className="size-1.5 animate-pulse rounded-full bg-success" /> {options.length} cars nearby
      </p>
    </div>
  );
}
