"use client";

import { useParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAsync } from "@/lib/hooks";
import { askedFor } from "@/lib/describe";
import { PREF_SHORT } from "@/lib/prefs";
import { ANSWER_LABEL, isRatingComplete, summarizeRating } from "@/lib/rating";
import { store } from "@/lib/backend";
import type { Booking, PrefAnswer, PrefKey, Rating } from "@/lib/types";
import { StarIcon } from "@/components/icons";
import { haptic, useToast } from "@/components/feedback";
import { ANSWER_STYLE, AnswerIcon, RatingSummaryCard } from "@/components/rating-summary";
import { Button, Card, EmptyState, FullPageSpinner, LinkButton, PageHeader, cx } from "@/components/ui";

const ANSWERS: PrefAnswer[] = ["yes", "partly", "no"];

export default function RatePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [data] = useAsync(
    async () => {
      const booking = await store.getBooking(id);
      if (!booking || booking.userId !== user!.id) return null;
      return { booking, rating: await store.getRating(id) };
    },
    [id, user!.id],
  );

  if (data === undefined) return <FullPageSpinner />;
  if (data === null) {
    return (
      <>
        <PageHeader title="Ride not found" back="/history" />
        <EmptyState
          title="Nothing to rate"
          body="We couldn't find this ride. It may have been cleared with the demo data."
          action={<LinkButton href="/history" block>Go to history</LinkButton>}
        />
      </>
    );
  }
  if (data.booking.status !== "completed") {
    return (
      <>
        <PageHeader title="Rate your ride" back={`/ride/${id}`} />
        <EmptyState
          title="Ride still in progress"
          body="You can rate it once the trip is complete."
          action={<LinkButton href={`/ride/${id}`} block>Back to trip</LinkButton>}
        />
      </>
    );
  }
  return <RateForm booking={data.booking} existing={data.rating} />;
}

function RateForm({ booking, existing }: { booking: Booking; existing: Rating | null }) {
  const toast = useToast();
  const keys = booking.activeKeys;
  const [answers, setAnswers] = useState<Partial<Record<PrefKey, PrefAnswer>>>(existing?.perPreference ?? {});
  const [notes, setNotes] = useState<Partial<Record<PrefKey, string>>>(existing?.notes ?? {});
  const [stars, setStars] = useState(existing?.stars ?? 0);
  const [submitted, setSubmitted] = useState<Rating | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);

  const complete = isRatingComplete(answers, keys, stars);
  const missing = keys.filter((k) => !answers[k]);
  const answered = keys.length - missing.length;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!complete) {
      setShowErrors(true);
      return;
    }
    setBusy(true);
    const trimmed = Object.fromEntries(
      Object.entries(notes)
        .map(([k, v]) => [k, (v ?? "").trim()])
        .filter(([k, v]) => v && keys.includes(k as PrefKey)),
    ) as Rating["notes"];
    const rating: Rating = {
      bookingId: booking.id,
      perPreference: Object.fromEntries(keys.map((k) => [k, answers[k]])) as Rating["perPreference"],
      notes: trimmed,
      stars,
      createdAt: new Date().toISOString(),
    };
    await store.saveRating(rating);
    haptic([10, 40, 20]);
    toast("Rating saved");
    setSubmitted(rating);
    window.scrollTo({ top: 0 });
  }

  if (submitted) {
    const summary = summarizeRating(submitted.perPreference, keys);
    return (
      <>
        <PageHeader title="Thanks for rating" subtitle={`${booking.option.tier} · ${booking.pickup} → ${booking.dropoff}`} />
        <div className="flex flex-col gap-4 px-4">
          <p role="status" className="sr-only">
            Rating saved. {summary.label}.
          </p>
          <RatingSummaryCard booking={booking} rating={submitted} />
          <LinkButton href="/history" block>
            View ride history
          </LinkButton>
          <LinkButton href="/ride/new" variant="secondary" block>
            Book another ride
          </LinkButton>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        back={`/ride/${booking.id}`}
        title="Did it meet your preferences?"
        subtitle={`These are the ${keys.length} preferences you had set when you booked ${booking.option.tier}.`}
      />
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-3 px-4">
        {keys.map((k) => {
          const value = answers[k];
          const invalid = showErrors && !value;
          return (
            <Card key={k} className={cx("flex flex-col gap-3", invalid && "border-danger")}>
              <fieldset aria-describedby={invalid ? `err-${k}` : undefined}>
                <legend className="mb-0.5 font-semibold">{PREF_SHORT[k]}</legend>
                <p className="mb-3 text-sm text-muted">You asked: {askedFor(k, booking)}</p>
                <div className="grid grid-cols-3 gap-2">
                  {ANSWERS.map((a) => {
                    const checked = value === a;
                    return (
                      <label
                        key={a}
                        className={cx(
                          "flex min-h-12 cursor-pointer items-center justify-center gap-1.5 rounded-2xl border text-sm font-semibold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--ring)]",
                          checked ? cx("border-transparent", ANSWER_STYLE[a]) : "border-line bg-surface text-ink hover:bg-surface-2",
                        )}
                      >
                        <input
                          type="radio"
                          name={`answer-${k}`}
                          value={a}
                          checked={checked}
                          onChange={() => {
                            haptic(5);
                            setAnswers((s) => ({ ...s, [k]: a }));
                          }}
                          className="sr-only"
                        />
                        {checked && <AnswerIcon answer={a} />}
                        {ANSWER_LABEL[a]}
                      </label>
                    );
                  })}
                </div>
                {invalid && (
                  <p id={`err-${k}`} className="mt-2 text-sm font-medium text-danger">
                    Choose Yes, Partly or No.
                  </p>
                )}
              </fieldset>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted">Note (optional)</span>
                <input
                  value={notes[k] ?? ""}
                  onChange={(e) => setNotes((s) => ({ ...s, [k]: e.target.value }))}
                  maxLength={200}
                  placeholder="What happened?"
                  className="min-h-11 rounded-xl border border-line bg-surface px-3 text-base placeholder:text-muted"
                />
              </label>
            </Card>
          );
        })}

        <Card className={cx(showErrors && stars === 0 && "border-danger")}>
          <fieldset>
            <legend className="mb-2 font-semibold">Overall</legend>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <label
                  key={n}
                  className="flex size-11 cursor-pointer items-center justify-center rounded-xl text-warn hover:bg-surface-2 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-[var(--ring)]"
                >
                  <input
                    type="radio"
                    name="stars"
                    value={n}
                    checked={stars === n}
                    onChange={() => {
                      haptic(5);
                      setStars(n);
                    }}
                    className="sr-only"
                    aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  />
                  <span key={n === stars ? `on-${stars}` : n} className={n === stars ? "animate-pop inline-flex" : "inline-flex"}>
                    <StarIcon size={30} filled={n <= stars} />
                  </span>
                </label>
              ))}
              <span className="num ml-2 self-center text-sm font-semibold whitespace-nowrap text-muted">{stars ? `${stars}/5` : "Not set"}</span>
            </div>
            {showErrors && stars === 0 && <p className="mt-2 text-sm font-medium text-danger">Pick 1 to 5 stars.</p>}
          </fieldset>
        </Card>

        <div className="sticky bottom-[calc(5.7rem+env(safe-area-inset-bottom))] -mx-4 flex flex-col gap-1 bg-linear-to-t from-bg from-60% to-bg/0 px-4 pt-6 pb-3">
          {showErrors && !complete && (
            <p role="alert" className="text-center text-sm font-medium text-danger">
              {missing.length > 0 ? `Answer ${missing.length} more preference${missing.length === 1 ? "" : "s"}` : "Add a star rating"}
              {missing.length > 0 && stars === 0 ? " and add a star rating" : ""}.
            </p>
          )}
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-300"
                style={{ width: `${((answered + (stars ? 1 : 0)) / (keys.length + 1)) * 100}%` }}
              />
            </div>
            <span className="num">
              {answered}/{keys.length} answered{stars ? " · stars set" : ""}
            </span>
          </div>
          <Button type="submit" block disabled={busy}>
            Submit rating
          </Button>
        </div>
      </form>
    </>
  );
}
