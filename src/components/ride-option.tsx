"use client";

import { describeOffer, powertrainLabel } from "@/lib/describe";
import { totalTime, type Badge, type ShownOption } from "@/lib/matching";
import { PREF_SHORT, describePref, formatPrice, isHard } from "@/lib/prefs";
import type { PrefKey, Preferences, RideOption } from "@/lib/types";
import { CheckIcon, ClockIcon, StarIcon, XIcon } from "./icons";
import { Button, cx } from "./ui";

export function MetMark({ met, size = 16 }: { met: boolean; size?: number }) {
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        met ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
      )}
      style={{ width: size + 8, height: size + 8 }}
    >
      {met ? <CheckIcon size={size} strokeWidth={3} /> : <XIcon size={size} strokeWidth={3} />}
    </span>
  );
}

export function PrefCheck({ prefKey, option, prefs }: { prefKey: PrefKey; option: RideOption; prefs: Preferences }) {
  const met = option.meets[prefKey] === true;
  return (
    <li className="flex items-start gap-2.5 py-1.5">
      <MetMark met={met} />
      <span className="min-w-0 flex-1 text-sm leading-snug">
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-semibold">{PREF_SHORT[prefKey]}</span>
          <span className={cx("text-xs font-bold uppercase", met ? "text-success" : "text-danger")}>
            {met ? "Meets" : "Misses"}
          </span>
        </span>
        <span className="num block text-muted">
          {describeOffer(prefKey, option)} <span aria-hidden>·</span> you asked: {describePref(prefKey, prefs).toLowerCase()}
        </span>
      </span>
    </li>
  );
}

const BADGE_STYLE: Record<Badge, string> = {
  "Best match": "btn-primary text-accent-fg",
  Cheapest: "bg-accent-soft text-accent-soft-fg",
  Fastest: "bg-warn-soft text-warn",
};

export function Badges({ badges }: { badges: Badge[] }) {
  if (!badges.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Badges">
      {badges.map((b) => (
        <li key={b} className={cx("rounded-full px-2.5 py-1 text-xs font-bold", BADGE_STYLE[b])}>
          {b}
        </li>
      ))}
    </ul>
  );
}

export function ScoreMeter({ score, total }: { score: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-1" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={cx("h-2 flex-1 rounded-full", i < score ? "btn-primary" : "bg-surface-2")} />
        ))}
      </div>
      <span className="num text-sm font-bold whitespace-nowrap">
        {score}/{total} <span className="font-medium text-muted">match</span>
      </span>
    </div>
  );
}

export function arrivalLabel(o: RideOption): string {
  return `${totalTime(o)} min to destination`;
}

export function OptionCard({
  shown,
  keys,
  prefs,
  onBook,
  busy,
  position,
  count,
}: {
  shown: ShownOption;
  keys: PrefKey[];
  prefs: Preferences;
  onBook: (o: RideOption) => void;
  busy: boolean;
  position: number;
  count: number;
}) {
  const { option: o, eligible, failed, badges } = shown;
  return (
    <article
      data-testid="ride-option"
      aria-label={`${o.tier}, option ${position} of ${count}`}
      className={cx(
        "flex w-full flex-col elevated rounded-[28px] border bg-surface p-4",
        !eligible
          ? "border-dashed border-danger/60"
          : badges.includes("Best match")
            ? "elevated-lg border-accent/50 ring-2 ring-accent/25"
            : "border-line",
      )}
    >
      <div className="flex min-h-7 items-start justify-between gap-2">
        <Badges badges={badges} />
        {!eligible && (
          <span className="rounded-full bg-danger-soft px-2.5 py-1 text-xs font-bold text-danger">Near miss</span>
        )}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div>
          <h3 className="font-display text-2xl font-semibold">{o.tier}</h3>
          <p className="text-sm text-muted">
            {o.vehicle.color} {o.vehicle.make} {o.vehicle.model}
          </p>
        </div>
        <p className="num text-2xl font-extrabold tracking-tight">{formatPrice(o.price)}</p>
      </div>

      <dl className="num mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-2xl bg-surface-2/80 px-3 py-2.5">
          <dt className="text-xs text-muted">Pickup in</dt>
          <dd className="flex items-center gap-1 font-bold">
            <ClockIcon size={14} /> {o.etaMin} min
          </dd>
        </div>
        <div className="rounded-2xl bg-surface-2/80 px-3 py-2.5">
          <dt className="text-xs text-muted">Trip</dt>
          <dd className="font-bold">{o.durationMin} min</dd>
        </div>
      </dl>

      <p className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-muted">
        <span className="font-semibold text-ink">{o.driver.name}</span>
        <span className="num inline-flex items-center gap-0.5">
          <StarIcon size={13} filled /> {o.driver.rating.toFixed(2)}
        </span>
        <span aria-hidden>·</span>
        <span>{powertrainLabel(o)}</span>
      </p>

      {!eligible && (
        <p className="mt-3 rounded-2xl bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
          Doesn&apos;t meet: {failed.map((k) => PREF_SHORT[k].toLowerCase()).join(", ")}
        </p>
      )}

      <div className="mt-4">
        <ScoreMeter score={o.matchScore} total={keys.length} />
      </div>
      <ul className="mt-2 flex-1 divide-y divide-line" aria-label="Preference checks">
        {keys.map((k) => (
          <PrefCheck key={k} prefKey={k} option={o} prefs={prefs} />
        ))}
      </ul>

      <Button
        className="mt-4"
        block
        variant={eligible ? "primary" : "secondary"}
        disabled={busy}
        onClick={() => onBook(o)}
        aria-label={`Book this ride: ${o.tier}, ${formatPrice(o.price)}`}
      >
        Book this ride
      </Button>
    </article>
  );
}

export function CompareTable({
  shown,
  keys,
  onBook,
  busy,
}: {
  shown: ShownOption[];
  keys: PrefKey[];
  onBook: (o: RideOption) => void;
  busy: boolean;
}) {
  const head = "sticky left-0 z-10 bg-surface px-3 py-2.5 text-left text-xs font-semibold text-muted";
  const cell = "px-3 py-2.5 align-top";
  return (
    <div className="overflow-x-auto elevated rounded-[28px] border border-line bg-surface">
      <table className="num w-full min-w-[480px] border-collapse text-sm">
        <caption className="sr-only">Ride options compared attribute by attribute</caption>
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className={head}>
              <span className="sr-only">Attribute</span>
            </th>
            {shown.map(({ option: o, eligible, badges }) => (
              <th key={o.id} scope="col" className={cx(cell, "text-left")}>
                <span className="block font-display text-lg font-semibold">{o.tier}</span>
                {!eligible && <span className="block text-xs font-bold text-danger">Near miss</span>}
                {badges.length > 0 && <span className="block text-xs font-bold text-accent-soft-fg">{badges.join(" · ")}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          <Row label="Price" head={head} cell={cell} shown={shown} render={(o) => <strong>{formatPrice(o.price)}</strong>} />
          <Row label="Pickup in" head={head} cell={cell} shown={shown} render={(o) => `${o.etaMin} min`} />
          <Row label="Trip" head={head} cell={cell} shown={shown} render={(o) => `${o.durationMin} min`} />
          <Row label="Total time" head={head} cell={cell} shown={shown} render={(o) => `${totalTime(o)} min`} />
          <Row label="Vehicle" head={head} cell={cell} shown={shown} render={(o) => `${o.vehicle.make} ${o.vehicle.model}`} />
          <Row
            label="Match"
            head={head}
            cell={cell}
            shown={shown}
            render={(o) => (
              <strong>
                {o.matchScore}/{keys.length}
              </strong>
            )}
          />
          <tr className="bg-surface-2">
            <th scope="colgroup" colSpan={shown.length + 1} className="px-3 py-2 text-left text-xs font-bold tracking-wider text-muted uppercase">
              Your preferences
            </th>
          </tr>
          {keys.map((k) => (
            <Row
              key={k}
              label={`${PREF_SHORT[k]}${isHard(k) ? "" : " (nice-to-have)"}`}
              head={head}
              cell={cell}
              shown={shown}
              render={(o) => {
                const met = o.meets[k] === true;
                return (
                  <span className="flex items-start gap-1.5">
                    <MetMark met={met} size={12} />
                    <span>
                      <span className={cx("block text-xs font-bold uppercase", met ? "text-success" : "text-danger")}>
                        {met ? "Meets" : "Misses"}
                      </span>
                      <span className="block text-xs text-muted">{describeOffer(k, o)}</span>
                    </span>
                  </span>
                );
              }}
            />
          ))}
          <tr>
            <th scope="row" className={head}>
              <span className="sr-only">Book</span>
            </th>
            {shown.map(({ option: o, eligible }) => (
              <td key={o.id} className={cell}>
                <Button
                  variant={eligible ? "primary" : "secondary"}
                  className="w-full px-3 text-sm"
                  disabled={busy}
                  onClick={() => onBook(o)}
                  aria-label={`Book this ride: ${o.tier}, ${formatPrice(o.price)}`}
                >
                  Book
                </Button>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Row({
  label,
  head,
  cell,
  shown,
  render,
}: {
  label: string;
  head: string;
  cell: string;
  shown: ShownOption[];
  render: (o: RideOption) => React.ReactNode;
}) {
  return (
    <tr>
      <th scope="row" className={head}>
        {label}
      </th>
      {shown.map(({ option }) => (
        <td key={option.id} className={cell}>
          {render(option)}
        </td>
      ))}
    </tr>
  );
}
