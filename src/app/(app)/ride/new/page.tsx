"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAsync } from "@/lib/hooks";
import { SAMPLE_ADDRESSES } from "@/lib/rides";
import { formatSchedule, isValidSchedule } from "@/lib/schedule";
import { store } from "@/lib/store";
import { haptic } from "@/components/feedback";
import { CalendarIcon, ClockIcon, FlagIcon, PinIcon, SwapIcon, XIcon } from "@/components/icons";
import { SchedulePicker } from "@/components/schedule-picker";
import { Button, PageHeader, cx } from "@/components/ui";

type Target = "pickup" | "dropoff";
type When = "now" | "later";

/** One leg of the route card: a dot on the connector line and a borderless input. */
function RouteInput({
  label,
  value,
  onChange,
  onFocus,
  placeholder,
  error,
  active,
  marker,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onFocus: () => void;
  placeholder: string;
  error?: string;
  active: boolean;
  marker: "start" | "end";
}) {
  const id = useId();
  return (
    <div className="relative flex gap-3">
      <span
        aria-hidden
        className={cx(
          "relative z-10 mt-[2.35rem] flex size-4 shrink-0 items-center justify-center",
          marker === "start" ? "rounded-full border-[3px] border-accent bg-surface" : "rounded-[5px] bg-accent",
        )}
      />
      <div className="min-w-0 flex-1 pr-12">
        <label htmlFor={id} className="text-xs font-bold tracking-wider text-muted uppercase">
          {label}
        </label>
        <div
          className={cx(
            "mt-1 flex items-center rounded-2xl border bg-surface-2/60 pr-1 transition-colors",
            error ? "border-danger" : active ? "border-accent" : "border-transparent",
          )}
        >
          <input
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={onFocus}
            placeholder={placeholder}
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-err` : undefined}
            className="min-h-12 min-w-0 flex-1 bg-transparent px-4 text-base font-semibold text-ink outline-none placeholder:font-medium placeholder:text-muted"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label={`Clear ${label.toLowerCase()}`}
              className="inline-flex size-10 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink"
            >
              <XIcon size={16} />
            </button>
          )}
        </div>
        {error && (
          <p id={`${id}-err`} className="mt-1 flex items-center gap-1 text-sm font-medium text-danger">
            <XIcon size={14} /> {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default function NewRidePage() {
  const { user } = useAuth();
  const router = useRouter();
  const userId = user!.id;
  const [now] = useState(() => new Date());
  const [draft] = useAsync(() => store.getDraft(userId), [userId]);
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [target, setTarget] = useState<Target>("pickup");
  const [when, setWhen] = useState<When>("now");
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ pickup?: string; dropoff?: string; when?: string }>({});
  const [busy, setBusy] = useState(false);

  // Prefill the last search once it loads; drop a schedule that has gone stale.
  useEffect(() => {
    if (!draft) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPickup((p) => p || draft.pickup);
    setDropoff((d) => d || draft.dropoff);
    if (draft.scheduledFor && isValidSchedule(draft.scheduledFor, new Date())) {
      setWhen("later");
      setScheduledFor(draft.scheduledFor);
    }
  }, [draft]);

  function quickPick(address: string) {
    haptic(5);
    if (target === "pickup") {
      setPickup(address);
      setErrors((e) => ({ ...e, pickup: undefined }));
      if (!dropoff) setTarget("dropoff");
    } else {
      setDropoff(address);
      setErrors((e) => ({ ...e, dropoff: undefined }));
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (pickup.trim().length < 3) next.pickup = "Enter a pickup address.";
    if (dropoff.trim().length < 3) next.dropoff = "Enter a destination.";
    if (!next.pickup && !next.dropoff && pickup.trim().toLowerCase() === dropoff.trim().toLowerCase())
      next.dropoff = "Destination must differ from pickup.";
    if (when === "later" && (!scheduledFor || !isValidSchedule(scheduledFor, new Date())))
      next.when = "Choose a pickup time at least 30 minutes from now.";
    setErrors(next);
    if (next.pickup || next.dropoff || next.when) return;
    setBusy(true);
    await store.saveDraft(userId, {
      pickup: pickup.trim(),
      dropoff: dropoff.trim(),
      scheduledFor: when === "later" ? scheduledFor : null,
    });
    router.push("/ride/compare");
  }

  return (
    <>
      <PageHeader title={`Where to, ${user!.name.split(" ")[0]}?`} subtitle="Ride now or schedule ahead. We'll compare every option against your preferences." />
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4 px-4">
        <div role="radiogroup" aria-label="When" className="grid grid-cols-2 gap-1 rounded-full bg-surface-2 p-1">
          {(
            [
              ["now", "Ride now", ClockIcon],
              ["later", "Schedule", CalendarIcon],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={when === value}
              onClick={() => {
                haptic(5);
                setWhen(value);
                setErrors((x) => ({ ...x, when: undefined }));
              }}
              className={cx(
                "flex min-h-11 items-center justify-center gap-2 rounded-full text-sm font-bold transition-all",
                when === value ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-muted hover:text-ink",
              )}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        <div className="elevated relative rounded-[28px] border border-line bg-surface p-4">
          {/* Dashed connector between the two route markers. */}
          <span
            aria-hidden
            className="absolute top-[3.5rem] bottom-[3.5rem] left-[1.47rem] w-0.5 bg-[repeating-linear-gradient(to_bottom,var(--border-strong)_0_4px,transparent_4px_8px)]"
          />
          <div className="flex flex-col gap-3">
            <RouteInput
              label="Pickup"
              marker="start"
              value={pickup}
              onChange={(v) => {
                setPickup(v);
                setErrors((x) => ({ ...x, pickup: undefined }));
              }}
              onFocus={() => setTarget("pickup")}
              placeholder="e.g. 50 Front St"
              error={errors.pickup}
              active={target === "pickup"}
            />
            <RouteInput
              label="Destination"
              marker="end"
              value={dropoff}
              onChange={(v) => {
                setDropoff(v);
                setErrors((x) => ({ ...x, dropoff: undefined }));
              }}
              onFocus={() => setTarget("dropoff")}
              placeholder="e.g. Riverside Park"
              error={errors.dropoff}
              active={target === "dropoff"}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              haptic(5);
              setPickup(dropoff);
              setDropoff(pickup);
            }}
            aria-label="Swap pickup and destination"
            className="elevated absolute top-1/2 right-4 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface text-muted transition-transform duration-300 hover:text-ink active:rotate-180"
          >
            <SwapIcon size={18} />
          </button>
        </div>

        {when === "later" && (
          <section
            aria-labelledby="schedule-title"
            className={cx("animate-rise elevated rounded-[28px] border bg-surface p-4", errors.when ? "border-danger" : "border-line")}
          >
            <h2 id="schedule-title" className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
              <CalendarIcon size={18} className="text-accent" /> Pickup time
            </h2>
            <SchedulePicker
              value={scheduledFor}
              onChange={(iso) => {
                setScheduledFor(iso);
                setErrors((x) => ({ ...x, when: undefined }));
              }}
              now={now}
            />
            {errors.when && (
              <p role="alert" className="mt-2 flex items-center gap-1 text-sm font-medium text-danger">
                <XIcon size={14} /> {errors.when}
              </p>
            )}
          </section>
        )}

        <section aria-labelledby="quick-picks">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="quick-picks" className="text-xs font-bold tracking-wider text-muted uppercase">
              Quick picks
            </h2>
            <span className="text-xs text-muted">
              Filling <strong className="text-ink">{target === "pickup" ? "pickup" : "destination"}</strong>
            </span>
          </div>
          <ul className="elevated divide-y divide-line overflow-hidden rounded-[24px] border border-line bg-surface">
            {SAMPLE_ADDRESSES.map((a) => {
              const used = a === pickup ? "pickup" : a === dropoff ? "dropoff" : null;
              return (
                <li key={a}>
                  <button
                    type="button"
                    onClick={() => quickPick(a)}
                    className={cx(
                      "flex min-h-13 w-full items-center gap-3 px-4 text-left text-sm font-semibold transition-colors",
                      used ? "bg-accent-soft text-accent-soft-fg" : "hover:bg-surface-2",
                    )}
                  >
                    <span
                      className={cx(
                        "flex size-8 shrink-0 items-center justify-center rounded-full",
                        used ? "bg-surface" : "bg-surface-2 text-muted",
                      )}
                    >
                      {used === "dropoff" ? <FlagIcon size={15} /> : <PinIcon size={15} />}
                    </span>
                    <span className="flex-1">{a}</span>
                    {used && (
                      <span className="text-[0.65rem] font-bold tracking-wider uppercase">{used === "pickup" ? "Pickup" : "Destination"}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="sticky bottom-[calc(5.7rem+env(safe-area-inset-bottom))] -mx-4 bg-linear-to-t from-bg from-60% to-bg/0 px-4 pt-6 pb-3">
          <Button type="submit" block disabled={busy}>
            {when === "later" && scheduledFor ? `Find rides for ${formatSchedule(scheduledFor, now)}` : "Find rides"}
          </Button>
        </div>
      </form>
    </>
  );
}
