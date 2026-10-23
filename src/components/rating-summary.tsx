import { describePref, PREF_SHORT } from "@/lib/prefs";
import { ANSWER_LABEL, summarizeRating } from "@/lib/rating";
import type { Booking, PrefAnswer, Rating } from "@/lib/types";
import { CheckIcon, MinusIcon, StarIcon, XIcon } from "./icons";
import { Card, cx } from "./ui";

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-warn" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} size={size} filled={n <= value} />
      ))}
    </span>
  );
}

export const ANSWER_STYLE: Record<PrefAnswer, string> = {
  yes: "bg-success-soft text-success",
  partly: "bg-warn-soft text-warn",
  no: "bg-danger-soft text-danger",
};

export function AnswerIcon({ answer, size = 14 }: { answer: PrefAnswer; size?: number }) {
  if (answer === "yes") return <CheckIcon size={size} strokeWidth={3} />;
  if (answer === "partly") return <MinusIcon size={size} strokeWidth={3} />;
  return <XIcon size={size} strokeWidth={3} />;
}

export function RatingSummaryCard({ booking, rating }: { booking: Booking; rating: Rating }) {
  const summary = summarizeRating(rating.perPreference, booking.activeKeys);
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 data-testid="rating-summary" className="font-display text-xl font-bold">
          {summary.label}
        </h2>
        <Stars value={rating.stars} />
      </div>
      {summary.partly > 0 && <p className="text-sm text-muted">{summary.partly} partly met</p>}
      <ul className="divide-y divide-line">
        {booking.activeKeys.map((k) => {
          const a = rating.perPreference[k];
          return (
            <li key={k} className="flex items-start gap-3 py-2.5">
              {a && (
                <span className={cx("mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full", ANSWER_STYLE[a])}>
                  <AnswerIcon answer={a} />
                </span>
              )}
              <span className="min-w-0 flex-1 text-sm">
                <span className="flex justify-between gap-2">
                  <span className="font-semibold">{PREF_SHORT[k]}</span>
                  <span className="font-bold">{a ? ANSWER_LABEL[a] : "Not rated"}</span>
                </span>
                <span className="block text-muted">You asked: {describePref(k, booking.preferencesSnapshot)}</span>
                {rating.notes[k] && <span className="mt-1 block italic">“{rating.notes[k]}”</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
