import { useId } from "react";
import type { Tier } from "@/lib/types";

type Shape = "sedan" | "suv" | "van" | "luxury";

const SHAPE: Record<Tier, Shape> = {
  Economy: "sedan",
  Comfort: "sedan",
  "Green EV": "sedan",
  XL: "suv",
  Access: "van",
  Premium: "luxury",
};

/** Body outline and window paths per silhouette, drawn on a 120×48 grid. */
const PATHS: Record<Shape, { body: string; windows: string }> = {
  sedan: {
    body: "M8 34 C8 29 11 27 18 26 L34 24 L46 15 C49 13 52 12 56 12 L76 12 C81 12 85 14 88 17 L96 24 L106 26 C111 27 113 30 113 34 L113 37 L8 37 Z",
    windows: "M49 23 L57 16 L70 16 L70 23 Z M74 16 L82 16 C84 16 86 17 88 19 L92 23 L74 23 Z",
  },
  luxury: {
    body: "M6 34 C6 29 10 27 18 26 L36 24 L50 14 C53 12 57 11 61 11 L80 11 C86 11 90 13 93 16 L101 24 L110 26 C114 27 115 30 115 34 L115 37 L6 37 Z",
    windows: "M53 23 L61 15 L75 15 L75 23 Z M79 15 L86 15 C88 15 90 16 92 18 L97 23 L79 23 Z",
  },
  suv: {
    body: "M8 35 L8 26 C8 23 10 21 14 21 L28 20 L38 10 C40 8 43 7 46 7 L86 7 C90 7 93 9 95 12 L102 21 L108 22 C111 23 113 25 113 29 L113 37 L8 37 Z",
    windows: "M41 19 L48 11 L64 11 L64 19 Z M68 11 L85 11 C87 11 89 12 90 14 L94 19 L68 19 Z",
  },
  van: {
    body: "M8 36 L8 12 C8 8 11 6 15 6 L84 6 C88 6 91 8 93 11 L104 22 L109 23 C112 24 113 26 113 30 L113 37 L8 37 Z",
    windows: "M14 11 L36 11 L36 20 L14 20 Z M40 11 L62 11 L62 20 L40 20 Z M66 11 L84 11 C86 11 87 12 88 13 L95 20 L66 20 Z",
  },
};

export function VehicleArt({ tier, className }: { tier: Tier; className?: string }) {
  const id = useId();
  const shape = SHAPE[tier];
  const { body, windows } = PATHS[shape];
  return (
    <svg viewBox="0 0 120 48" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.95" />
          <stop offset="1" stopColor="var(--accent-strong)" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="43" rx="52" ry="3" fill="var(--text)" opacity="0.1" />
      <path d={body} fill={`url(#${id}-body)`} />
      <path d={windows} fill="var(--surface)" opacity="0.85" />
      <path d="M12 31 h8 M101 30 h8" stroke="var(--surface)" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      {[30, 92].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="37" r="7" fill="var(--text)" />
          <circle cx={cx} cy="37" r="3" fill="var(--surface-2)" />
        </g>
      ))}
      {tier === "Green EV" && (
        <path d="M60 26 l-4 6 h3 l-1 5 l5-7 h-3 l1-4z" fill="var(--surface)" />
      )}
      {tier === "Access" && (
        <g fill="none" stroke="var(--surface)" strokeWidth="1.6" strokeLinecap="round">
          <circle cx="24" cy="26" r="1.4" fill="var(--surface)" stroke="none" />
          <path d="M24 28 v3 h3 l1.5 3 M21.5 30.5 a3.6 3.6 0 1 0 5.5 3.6" />
        </g>
      )}
    </svg>
  );
}
