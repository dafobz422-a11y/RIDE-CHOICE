import type { Tier } from "@/lib/types";
import { cx } from "./ui";
import { VehicleArt } from "./vehicle-art";

/** Buildings as [x, width, height] on a 400-wide skyline. */
const SKYLINE: [number, number, number][] = [
  [0, 34, 62], [30, 26, 92], [52, 40, 70], [88, 22, 118], [106, 38, 84], [140, 30, 104],
  [166, 46, 66], [208, 24, 128], [228, 36, 90], [260, 28, 112], [284, 44, 74], [324, 26, 100],
  [346, 30, 80], [372, 28, 108],
];

const FAR: [number, number, number][] = [
  [10, 40, 40], [60, 50, 54], [120, 36, 46], [170, 60, 58], [240, 42, 50], [300, 56, 44], [350, 50, 56],
];

/** Each car: tier, lane, direction, seconds per crossing, and where it rests without motion. */
const CARS: { tier: Tier; lane: "near" | "far"; dir: "ltr" | "rtl"; secs: number; delay: number; rest: string }[] = [
  { tier: "Comfort", lane: "near", dir: "ltr", secs: 9, delay: -2, rest: "8%" },
  { tier: "Green EV", lane: "near", dir: "ltr", secs: 9, delay: -6.5, rest: "58%" },
  { tier: "XL", lane: "far", dir: "rtl", secs: 12, delay: -4, rest: "30%" },
  { tier: "Premium", lane: "far", dir: "rtl", secs: 12, delay: -10, rest: "76%" },
];

/**
 * Decorative street scene with cars driving across, for the front pages.
 * Purely visual (aria-hidden); cars park in place for reduced-motion users.
 */
export function CarBackdrop({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div aria-hidden className={cx("relative overflow-hidden select-none", compact ? "h-36" : "h-52", className)}>
      {/* Sky and skyline */}
      <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="cb-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--glow-1)" stopOpacity="0.22" />
            <stop offset="0.6" stopColor="var(--glow-2)" stopOpacity="0.12" />
            <stop offset="1" stopColor="var(--bg)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="400" height="200" fill="url(#cb-sky)" />
        <circle cx="330" cy="46" r="22" fill="var(--warn)" opacity="0.22" />
        {FAR.map(([x, w, h]) => (
          <rect key={`f${x}`} x={x} y={150 - h} width={w} height={h} rx="3" fill="var(--accent)" opacity="0.08" />
        ))}
        {SKYLINE.map(([x, w, h], i) => (
          <g key={`b${x}`}>
            <rect x={x} y={150 - h} width={w} height={h + 2} rx="3" fill="var(--accent-soft)" />
            {/* A few lit windows per building */}
            {Array.from({ length: Math.floor(h / 22) }, (_, row) => (
              <rect
                key={row}
                x={x + 6 + ((row + i) % 2) * (w / 2 - 4)}
                y={150 - h + 10 + row * 20}
                width="5"
                height="7"
                rx="1"
                className="cb-window"
              />
            ))}
          </g>
        ))}
        {/* Road */}
        <rect x="0" y="150" width="400" height="50" fill="var(--surface-2)" />
        <rect x="0" y="150" width="400" height="3" fill="var(--border-strong)" />
        <path d="M0 176 H400" stroke="var(--border-strong)" strokeWidth="2" strokeDasharray="14 12" />
        {[60, 200, 340].map((x) => (
          <g key={`l${x}`}>
            <rect x={x} y="104" width="2.5" height="48" fill="var(--border-strong)" />
            <rect x={x - 6} y="102" width="14" height="4" rx="2" fill="var(--border-strong)" />
            <circle cx={x + 6} cy="108" r="6" fill="var(--warn)" opacity="0.18" />
          </g>
        ))}
      </svg>

      {/* Cars */}
      {CARS.map((c) => (
        <div
          key={c.tier}
          className={cx("cb-drive absolute inset-x-0", c.dir === "ltr" ? "cb-ltr" : "cb-rtl", c.lane === "near" ? "bottom-[2%]" : "bottom-[17%]")}
          style={
            {
              animationDuration: `${c.secs}s`,
              animationDelay: `${c.delay}s`,
              "--rest": c.rest,
            } as React.CSSProperties
          }
        >
          <div className={cx("cb-bob", c.lane === "near" ? "w-[30%]" : "w-[22%] opacity-80")}>
            <VehicleArt tier={c.tier} className={cx("h-auto w-full", c.dir === "rtl" && "-scale-x-100")} />
          </div>
        </div>
      ))}

      {/* Fade into the page */}
      <div className="absolute inset-x-0 bottom-0 h-6 bg-linear-to-t from-bg to-bg/0" />
    </div>
  );
}
