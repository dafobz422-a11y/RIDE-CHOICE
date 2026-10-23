"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { powertrainLabel } from "@/lib/describe";
import { useAsync } from "@/lib/hooks";
import { formatPrice } from "@/lib/prefs";
import { store } from "@/lib/store";
import { STAGES, STAGE_LABEL, tripProgress } from "@/lib/trip";
import type { Booking, BookingStatus, Rating } from "@/lib/types";
import { CheckIcon, FlagIcon, PinIcon, StarIcon } from "@/components/icons";
import { haptic } from "@/components/feedback";
import { RatingSummaryCard } from "@/components/rating-summary";
import { TripMap } from "@/components/trip-map";
import { Button, Card, EmptyState, FullPageSpinner, LinkButton, PageHeader, cx } from "@/components/ui";

const STAGE_HINT: Record<BookingStatus, (b: Booking) => string> = {
  assigned: (b) => `${b.option.driver.name} accepted your ride.`,
  arriving: (b) => `${b.option.vehicle.color} ${b.option.vehicle.model} · ${b.option.vehicle.plate} is on the way.`,
  on_trip: (b) => `Heading to ${b.dropoff}.`,
  completed: (b) => `You arrived at ${b.dropoff}.`,
};

export default function RidePage() {
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
          title="We couldn't find that ride"
          body="It may have been cleared with the demo data."
          action={<LinkButton href="/ride/new" block>Plan a new ride</LinkButton>}
        />
      </>
    );
  }
  return <RideView booking={data.booking} rating={data.rating} />;
}

function RideView({ booking: initial, rating }: { booking: Booking; rating: Rating | null }) {
  const [booking, setBooking] = useState(initial);
  const [now, setNow] = useState(() => Date.now());
  const { stage, fraction, secondsLeft } = tripProgress(booking.createdAt, now, booking.status);
  const done = stage === "completed";
  const prevStage = useRef(stage);

  // A light buzz whenever the trip moves to its next stage.
  useEffect(() => {
    if (prevStage.current !== stage) haptic(stage === "completed" ? [15, 60, 15] : 10);
    prevStage.current = stage;
  }, [stage]);

  useEffect(() => {
    if (done) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [done]);

  // Persist completion once, whether reached by time or by skipping.
  useEffect(() => {
    if (done && booking.status !== "completed") {
      void store.updateBooking(booking.id, { status: "completed" }).then((b) => b && setBooking(b));
    }
  }, [done, booking]);

  const o = booking.option;
  const stageIndex = STAGES.indexOf(stage);

  return (
    <>
      <PageHeader
        back="/history"
        title={done ? "Ride complete" : "Ride booked"}
        subtitle={
          <span className="num">
            <CheckIcon size={14} className="mr-1 inline align-[-2px] text-success" />
            Confirmed · #{booking.id.slice(0, 6).toUpperCase()} ·{" "}
            {new Date(booking.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
          </span>
        }
      />
      <div className="flex flex-col gap-4 px-4">
        <TripMap stage={stage} fraction={fraction} label={done ? "Arrived" : `${STAGE_LABEL[stage]} · next in ${secondsLeft}s`} />
        <Card>
          <div
            className="mb-4 h-1.5 overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-label="Trip progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(((STAGES.indexOf(stage) + (done ? 0 : fraction)) / (STAGES.length - 1)) * 100)}
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300 ease-linear"
              style={{ width: `${Math.min(100, ((STAGES.indexOf(stage) + (done ? 0 : fraction)) / (STAGES.length - 1)) * 100)}%` }}
            />
          </div>
          <ol aria-label="Trip stages" className="flex flex-col gap-0">
            {STAGES.map((s, i) => {
              const reached = i <= stageIndex;
              const current = i === stageIndex;
              return (
                <li key={s} className="flex gap-3" aria-current={current ? "step" : undefined}>
                  <div className="flex flex-col items-center">
                    <span
                      className={cx(
                        "flex size-7 items-center justify-center rounded-full border-2 text-xs font-bold",
                        reached ? "border-accent bg-accent text-accent-fg" : "border-line text-muted",
                        current && !done && "ring-4 ring-accent-soft",
                      )}
                    >
                      {i < stageIndex || done ? <CheckIcon size={14} strokeWidth={3} /> : i + 1}
                    </span>
                    {i < STAGES.length - 1 && <span className={cx("w-0.5 flex-1 min-h-5", i < stageIndex ? "bg-accent" : "bg-line")} />}
                  </div>
                  <div className="pb-4">
                    <p className={cx("font-semibold", !reached && "text-muted")}>
                      {STAGE_LABEL[s]}
                      {current && !done && <span className="sr-only"> (current)</span>}
                      {i < stageIndex && <span className="sr-only"> (done)</span>}
                    </p>
                    {current && <p className="text-sm text-muted">{STAGE_HINT[s](booking)}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
          <p role="status" aria-live="polite" className="sr-only">
            {STAGE_LABEL[stage]}
          </p>
          {!done && (
            <Button
              variant="secondary"
              block
              onClick={async () => {
                const b = await store.updateBooking(booking.id, { status: "completed" });
                if (b) setBooking(b);
              }}
            >
              Skip to end
            </Button>
          )}
        </Card>

        {done && !rating && (
          <Card className="flex flex-col gap-3 border-accent bg-accent-soft">
            <p className="font-display text-lg font-semibold text-accent-soft-fg">Did this ride deliver?</p>
            <p className="text-sm text-accent-soft-fg">
              Tell us whether each preference you set was met. It takes 30 seconds.
            </p>
            <LinkButton href={`/ride/${booking.id}/rate`} block>
              <StarIcon size={18} /> Rate this ride
            </LinkButton>
          </Card>
        )}

        {rating && <RatingSummaryCard booking={booking} rating={rating} />}

        <Card className="flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">{o.tier}</h2>
              <p className="text-sm text-muted">
                {o.vehicle.color} {o.vehicle.make} {o.vehicle.model} · {powertrainLabel(o)}
              </p>
              <p className="num text-sm text-muted">Plate {o.vehicle.plate}</p>
            </div>
            <p className="num text-2xl font-extrabold tracking-tight">{formatPrice(o.price)}</p>
          </div>
          <p className="text-sm">
            Driver <span className="font-semibold">{o.driver.name}</span>{" "}
            <span className="num text-muted">
              · ★ {o.driver.rating.toFixed(2)} · {o.driver.trips.toLocaleString()} trips
            </span>
          </p>
          <ul className="flex flex-col gap-2 text-sm">
            <li className="flex items-center gap-2">
              <PinIcon size={16} className="text-accent" /> {booking.pickup}
            </li>
            <li className="flex items-center gap-2">
              <FlagIcon size={16} className="text-accent" /> {booking.dropoff}
            </li>
          </ul>
          <p className="num text-sm text-muted">
            {o.etaMin} min pickup · {o.durationMin} min trip · matched {o.matchScore}/{booking.activeKeys.length} preferences at booking
          </p>
        </Card>

        {done && (
          <LinkButton href="/ride/new" variant="secondary" block>
            Book another ride
          </LinkButton>
        )}
      </div>
    </>
  );
}
