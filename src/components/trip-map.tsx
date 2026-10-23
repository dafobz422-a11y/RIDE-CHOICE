"use client";

import { useEffect, useRef } from "react";
import type { BookingStatus } from "@/lib/types";

const APPROACH = "M 28 26 C 40 70, 20 96, 64 128";
const ROUTE = "M 64 128 C 120 150, 130 60, 190 78 S 250 60, 288 36";

/** Where the car sits along its two paths for a stage and progress within it. */
function carTarget(stage: BookingStatus, fraction: number): { path: "approach" | "route"; t: number } {
  switch (stage) {
    case "assigned":
      return { path: "approach", t: fraction * 0.6 };
    case "arriving":
      return { path: "approach", t: 0.6 + fraction * 0.4 };
    case "on_trip":
      return { path: "route", t: fraction };
    case "completed":
      return { path: "route", t: 1 };
  }
}

/** Stylized map: the car drives to the pickup, then along the route. */
export function TripMap({ stage, fraction, label }: { stage: BookingStatus; fraction: number; label: string }) {
  const approachRef = useRef<SVGPathElement>(null);
  const routeRef = useRef<SVGPathElement>(null);
  const carRef = useRef<SVGGElement>(null);
  const { path, t } = carTarget(stage, fraction);
  const routeDone = path === "route" ? t : 0;

  useEffect(() => {
    const el = path === "approach" ? approachRef.current : routeRef.current;
    const car = carRef.current;
    if (!el || !car) return;
    try {
      const len = el.getTotalLength();
      const p = el.getPointAtLength(len * t);
      car.style.transform = `translate(${p.x}px, ${p.y}px)`;
    } catch {
      /* SVG geometry unavailable (e.g. not laid out yet) */
    }
  }, [path, t]);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface-2">
      <svg viewBox="0 0 320 170" className="block h-auto w-full" role="img" aria-label={`Map: ${label}`}>
        <g stroke="var(--border)" strokeWidth="6" strokeLinecap="round" opacity="0.7">
          <path d="M0 50 H320 M0 110 H320 M0 150 H320 M70 0 V170 M160 0 V170 M240 0 V170" />
        </g>
        <path ref={approachRef} d={APPROACH} fill="none" stroke="var(--muted)" strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round" opacity={stage === "assigned" || stage === "arriving" ? 0.9 : 0.25} />
        <path ref={routeRef} d={ROUTE} fill="none" stroke="var(--accent-soft)" strokeWidth="9" strokeLinecap="round" />
        <path
          d={ROUTE}
          pathLength={1}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="1 1"
          strokeDashoffset={1 - routeDone}
          style={{ transition: "stroke-dashoffset 250ms linear" }}
        />
        <g transform="translate(64 128)">
          <circle r="11" fill="var(--surface)" stroke="var(--accent)" strokeWidth="3" />
          <circle r="4" fill="var(--accent)" />
        </g>
        <g transform="translate(288 36)">
          <rect x="-10" y="-10" width="20" height="20" rx="5" fill="var(--accent)" />
          <path d="M-4 6 V-5 H5 L3 -1.5 L5 2 H-4" fill="none" stroke="var(--accent-fg)" strokeWidth="2" strokeLinejoin="round" />
        </g>
        <g ref={carRef} style={{ transition: "transform 250ms linear", transform: "translate(28px, 26px)" }}>
          <circle r="14" fill="var(--text)" opacity="0.12" />
          <circle r="10" fill="var(--text)" />
          <path d="M-5 2 h10 M-5.5 1 l1.5-4 h8 l1.5 4 v3 h-11z" fill="none" stroke="var(--bg)" strokeWidth="1.6" strokeLinejoin="round" />
        </g>
      </svg>
      <p className="num absolute top-2 left-2 rounded-full bg-surface/95 px-3 py-1 text-xs font-bold shadow-sm">{label}</p>
    </div>
  );
}
