"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { powertrainLabel } from "@/lib/describe";
import { useAsync } from "@/lib/hooks";
import { formatPrice } from "@/lib/prefs";
import { ASSIGN_BEFORE_MIN, buildIcs, calendarTile, formatSchedule, formatTime, timeUntil } from "@/lib/schedule";
import { store } from "@/lib/backend";
import { STAGES, STAGE_LABEL, tripProgress, tripStart } from "@/lib/trip";
import type { Booking, BookingStatus, Rating } from "@/lib/types";
import { CalendarIcon, CheckIcon, DownloadIcon, FlagIcon, PinIcon, PlayIcon, StarIcon, XIcon } from "@/components/icons";
import { haptic, Sheet, useToast } from "@/components/feedback";
import { RatingSummaryCard } from "@/components/rating-summary";
import { TripMap } from "@/components/trip-map";
import { Button, Card, EmptyState, FullPageSpinner, LinkButton, PageHeader, cx } from "@/components/ui";
import { VehicleArt } from "@/components/vehicle-art";

const STAGE_HINT: Partial<Record<BookingStatus, (b: Booking) => string>> = {
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
  return <RideView initial={data.booking} rating={data.rating} />;
}

function RideView({ initial, rating }: { initial: Booking; rating: Rating | null }) {
  const [booking, setBooking] = useState(initial);
  if (booking.status === "scheduled") return <ScheduledView booking={booking} onChange={setBooking} />;
  if (booking.status === "cancelled") return <CancelledView booking={booking} />;
  return <LiveView booking={booking} rating={rating} onChange={setBooking} />;
}

function confirmation(b: Booking) {
  return (
    <span className="num">
      <CheckIcon size={14} className="mr-1 inline align-[-2px] text-success" />
      Confirmed · #{b.id.slice(0, 6).toUpperCase()}
    </span>
  );
}

/** Vehicle art, driver, plate and route: shared by every booking state. */
function RideDetails({ booking }: { booking: Booking }) {
  const o = booking.option;
  const initials = o.driver.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">{o.tier}</h2>
          <p className="text-sm text-muted">
            {o.vehicle.color} {o.vehicle.make} {o.vehicle.model} · {powertrainLabel(o)}
          </p>
        </div>
        <p className="num text-2xl font-extrabold tracking-tight">{formatPrice(o.price)}</p>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-linear-to-b from-accent-soft/70 to-surface-2/40 px-4 py-3">
        <VehicleArt tier={o.tier} className="h-12 w-auto" />
        <span className="num rounded-lg border-2 border-ink/80 bg-surface px-2.5 py-1 font-mono text-sm font-bold tracking-[0.15em]">
          {o.vehicle.plate}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="btn-primary flex size-11 items-center justify-center rounded-full font-display text-base font-semibold text-accent-fg">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">{o.driver.name}</p>
          <p className="num flex items-center gap-1 text-sm text-muted">
            <StarIcon size={13} filled className="text-warn" /> {o.driver.rating.toFixed(2)} · {o.driver.trips.toLocaleString()} trips
          </p>
        </div>
      </div>
      <ol className="relative flex flex-col gap-3 text-sm">
        <span aria-hidden className="absolute top-4 bottom-4 left-[0.69rem] w-0.5 bg-line-strong" />
        <li className="relative flex items-center gap-3">
          <span className="flex size-6 items-center justify-center rounded-full bg-accent-soft text-accent-soft-fg">
            <PinIcon size={13} />
          </span>
          {booking.pickup}
        </li>
        <li className="relative flex items-center gap-3">
          <span className="flex size-6 items-center justify-center rounded-full bg-accent-soft text-accent-soft-fg">
            <FlagIcon size={13} />
          </span>
          {booking.dropoff}
        </li>
      </ol>
      <p className="num border-t border-line pt-3 text-sm text-muted">
        {booking.scheduledFor ? "Reserved pickup" : `${o.etaMin} min pickup`} · {o.durationMin} min trip · matched {o.matchScore}/
        {booking.activeKeys.length} preferences at booking
      </p>
    </Card>
  );
}

function ScheduledView({ booking, onChange }: { booking: Booking; onChange: (b: Booking) => void }) {
  const toast = useToast();
  const [now, setNow] = useState(() => new Date());
  const [confirmCancel, setConfirmCancel] = useState(false);
  const pickupAt = booking.scheduledFor!;
  const tile = calendarTile(pickupAt);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);

  // Pickup time reached: the trip starts on its own, timed from the pickup.
  useEffect(() => {
    if (now.getTime() >= Date.parse(pickupAt)) {
      void store.updateBooking(booking.id, { status: "assigned", startedAt: pickupAt }).then((b) => b && onChange(b));
    }
  }, [now, pickupAt, booking.id, onChange]);

  async function startNow() {
    haptic();
    const b = await store.updateBooking(booking.id, { status: "assigned", startedAt: new Date().toISOString() });
    if (b) onChange(b);
  }

  async function cancel() {
    const b = await store.updateBooking(booking.id, { status: "cancelled" });
    haptic([10, 30, 10]);
    toast("Ride cancelled");
    setConfirmCancel(false);
    if (b) onChange(b);
  }

  function addToCalendar() {
    const ics = buildIcs({
      id: booking.id,
      start: pickupAt,
      durationMin: booking.option.durationMin,
      title: `RideChoice: ${booking.option.tier} to ${booking.dropoff}`,
      location: booking.pickup,
      description: `${booking.option.tier} with ${booking.option.driver.name}, ${formatPrice(booking.option.price)}. Confirmation #${booking.id
        .slice(0, 6)
        .toUpperCase()}.`,
      now: new Date(),
    });
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `ridechoice-${booking.id.slice(0, 6)}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <>
      <PageHeader back="/history" title="Ride scheduled" subtitle={confirmation(booking)} />
      <div className="flex flex-col gap-4 px-4">
        <section aria-label="Pickup time" className="elevated-lg relative overflow-hidden rounded-[28px] border border-line bg-surface p-5">
          <div aria-hidden className="aurora absolute inset-0 opacity-80" />
          <div className="relative flex items-center gap-4">
            <div className="elevated flex w-[4.5rem] shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface text-center">
              <span className="btn-primary py-1 text-[0.65rem] font-bold tracking-[0.2em] text-accent-fg">{tile.month}</span>
              <span className="num pt-1 font-display text-3xl font-semibold leading-none">{tile.day}</span>
              <span className="pb-1.5 text-[0.7rem] font-bold text-muted">{tile.weekday}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-wider text-muted uppercase">Pickup</p>
              <p data-testid="scheduled-time" className="font-display text-2xl leading-tight font-semibold">
                {formatSchedule(pickupAt, now)}
              </p>
              <p className="num mt-1 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent-soft-fg">
                <span className="size-1.5 animate-pulse rounded-full bg-accent" /> {timeUntil(pickupAt, now)}
              </p>
            </div>
          </div>
          <p className="relative mt-4 text-sm text-muted">
            {booking.option.driver.name} is reserved for you. You&apos;ll get live tracking about {ASSIGN_BEFORE_MIN} minutes before
            pickup, at {formatTime(new Date(Date.parse(pickupAt) - ASSIGN_BEFORE_MIN * 60_000))}.
          </p>
        </section>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" className="px-3 text-sm whitespace-nowrap" onClick={addToCalendar}>
            <DownloadIcon size={18} /> Add to calendar
          </Button>
          <Button variant="danger" className="px-3 text-sm whitespace-nowrap" onClick={() => setConfirmCancel(true)}>
            <XIcon size={18} /> Cancel ride
          </Button>
        </div>

        <RideDetails booking={booking} />

        <Card className="flex flex-col gap-2 border-dashed">
          <p className="text-sm text-muted">
            <strong className="text-ink">Demo:</strong> skip the wait and run the trip now.
          </p>
          <Button variant="ghost" block onClick={startNow}>
            <PlayIcon size={16} /> Start ride now (demo)
          </Button>
        </Card>
      </div>

      <Sheet open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Cancel this ride?">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            Your {booking.option.tier} for <strong className="text-ink">{formatSchedule(pickupAt, now)}</strong> will be released. Cancelling
            is free until your driver is assigned.
          </p>
          <div className="flex flex-col gap-2">
            <Button block variant="danger" onClick={cancel}>
              Yes, cancel ride
            </Button>
            <Button block variant="secondary" onClick={() => setConfirmCancel(false)}>
              Keep my ride
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}

function CancelledView({ booking }: { booking: Booking }) {
  return (
    <>
      <PageHeader back="/history" title="Ride cancelled" subtitle={`#${booking.id.slice(0, 6).toUpperCase()}`} />
      <div className="flex flex-col gap-4 px-4">
        <Card className="flex items-start gap-3 bg-danger-soft">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-danger">
            <XIcon size={18} strokeWidth={3} />
          </span>
          <p className="text-sm font-medium text-danger">
            This ride was cancelled{booking.scheduledFor ? ` before its ${formatSchedule(booking.scheduledFor, new Date())} pickup` : ""}. You
            weren&apos;t charged.
          </p>
        </Card>
        <RideDetails booking={booking} />
        <LinkButton href="/ride/new" block>
          Book another ride
        </LinkButton>
      </div>
    </>
  );
}

function LiveView({ booking, rating, onChange }: { booking: Booking; rating: Rating | null; onChange: (b: Booking) => void }) {
  const [now, setNow] = useState(() => Date.now());
  const { stage, fraction, secondsLeft } = tripProgress(tripStart(booking), now, booking.status);
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
      void store.updateBooking(booking.id, { status: "completed" }).then((b) => b && onChange(b));
    }
  }, [done, booking, onChange]);

  const stageIndex = STAGES.indexOf(stage);
  const pct = Math.min(100, ((stageIndex + (done ? 0 : fraction)) / (STAGES.length - 1)) * 100);

  return (
    <>
      <PageHeader back="/history" title={done ? "Ride complete" : "Ride booked"} subtitle={confirmation(booking)} />
      <div className="flex flex-col gap-4 px-4">
        <div className="elevated overflow-hidden rounded-[28px] border border-line">
          <TripMap stage={stage} fraction={fraction} label={done ? "Arrived" : `${STAGE_LABEL[stage]} · next in ${secondsLeft}s`} />
        </div>
        <Card>
          <div
            className="mb-4 h-2 overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-label="Trip progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pct)}
          >
            <div className="btn-primary h-full rounded-full transition-[width] duration-300 ease-linear" style={{ width: `${pct}%` }} />
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
                        "flex size-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                        reached ? "btn-primary border-transparent text-accent-fg" : "border-line text-muted",
                        current && !done && "ring-4 ring-accent-soft",
                      )}
                    >
                      {i < stageIndex || done ? <CheckIcon size={14} strokeWidth={3} /> : i + 1}
                    </span>
                    {i < STAGES.length - 1 && <span className={cx("min-h-5 w-0.5 flex-1", i < stageIndex ? "bg-accent" : "bg-line")} />}
                  </div>
                  <div className="pb-4">
                    <p className={cx("font-semibold", !reached && "text-muted")}>
                      {STAGE_LABEL[s]}
                      {current && !done && <span className="sr-only"> (current)</span>}
                      {i < stageIndex && <span className="sr-only"> (done)</span>}
                    </p>
                    {current && <p className="text-sm text-muted">{STAGE_HINT[s]?.(booking)}</p>}
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
                if (b) onChange(b);
              }}
            >
              Skip to end
            </Button>
          )}
        </Card>

        {done && !rating && (
          <Card className="flex flex-col gap-3 border-accent/40 bg-accent-soft">
            <p className="font-display text-lg font-semibold text-accent-soft-fg">Did this ride deliver?</p>
            <p className="text-sm text-accent-soft-fg">Tell us whether each preference you set was met. It takes 30 seconds.</p>
            <LinkButton href={`/ride/${booking.id}/rate`} block>
              <StarIcon size={18} /> Rate this ride
            </LinkButton>
          </Card>
        )}

        {rating && <RatingSummaryCard booking={booking} rating={rating} />}

        <RideDetails booking={booking} />

        {booking.scheduledFor && (
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
            <CalendarIcon size={13} /> Scheduled for {formatSchedule(booking.scheduledFor, new Date())}
          </p>
        )}

        {done && (
          <LinkButton href="/ride/new" variant="secondary" block>
            Book another ride
          </LinkButton>
        )}
      </div>
    </>
  );
}
