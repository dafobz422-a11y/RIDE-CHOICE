"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAsync } from "@/lib/hooks";
import { SAMPLE_ADDRESSES } from "@/lib/rides";
import { store } from "@/lib/store";
import { FlagIcon, PinIcon, SwapIcon } from "@/components/icons";
import { Button, Field, PageHeader, cx } from "@/components/ui";

type Target = "pickup" | "dropoff";

export default function NewRidePage() {
  const { user } = useAuth();
  const router = useRouter();
  const userId = user!.id;
  const [draft] = useAsync(() => store.getDraft(userId), [userId]);
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [target, setTarget] = useState<Target>("pickup");
  const [errors, setErrors] = useState<{ pickup?: string; dropoff?: string }>({});
  const [busy, setBusy] = useState(false);

  // Prefill the last search once it loads.
  useEffect(() => {
    if (draft) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPickup((p) => p || draft.pickup);
      setDropoff((d) => d || draft.dropoff);
    }
  }, [draft]);

  function quickPick(address: string) {
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
    setErrors(next);
    if (next.pickup || next.dropoff) return;
    setBusy(true);
    await store.saveDraft(userId, { pickup: pickup.trim(), dropoff: dropoff.trim() });
    router.push("/ride/compare");
  }

  return (
    <>
      <PageHeader title={`Where to, ${user!.name.split(" ")[0]}?`} subtitle="We'll compare rides against your preferences." />
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4 px-4">
        <div className="flex flex-col gap-1 rounded-3xl border border-line bg-surface p-4">
          <div onFocus={() => setTarget("pickup")}>
            <Field
              label="Pickup"
              name="pickup"
              placeholder="e.g. 50 Front St"
              autoComplete="off"
              value={pickup}
              onChange={(e) => {
                setPickup(e.target.value);
                setErrors((x) => ({ ...x, pickup: undefined }));
              }}
              error={errors.pickup}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="h-px flex-1 bg-line" />
            <button
              type="button"
              onClick={() => {
                setPickup(dropoff);
                setDropoff(pickup);
              }}
              aria-label="Swap pickup and destination"
              className="inline-flex size-11 items-center justify-center rounded-full border border-line bg-surface text-muted hover:text-ink"
            >
              <SwapIcon size={18} />
            </button>
          </div>
          <div onFocus={() => setTarget("dropoff")}>
            <Field
              label="Destination"
              name="dropoff"
              placeholder="e.g. Riverside Park"
              autoComplete="off"
              value={dropoff}
              onChange={(e) => {
                setDropoff(e.target.value);
                setErrors((x) => ({ ...x, dropoff: undefined }));
              }}
              error={errors.dropoff}
            />
          </div>
        </div>

        <section aria-labelledby="quick-picks">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="quick-picks" className="text-sm font-semibold">
              Quick picks
            </h2>
            <span className="text-sm text-muted">
              Filling: <strong className="text-ink">{target === "pickup" ? "Pickup" : "Destination"}</strong>
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {SAMPLE_ADDRESSES.map((a) => {
              const used = a === pickup ? "pickup" : a === dropoff ? "dropoff" : null;
              return (
                <li key={a}>
                  <button
                    type="button"
                    onClick={() => quickPick(a)}
                    className={cx(
                      "flex min-h-12 w-full items-center gap-3 rounded-2xl border px-4 text-left text-sm font-medium",
                      used ? "border-accent bg-accent-soft text-accent-soft-fg" : "border-line bg-surface hover:bg-surface-2",
                    )}
                  >
                    {used === "dropoff" ? <FlagIcon size={18} /> : <PinIcon size={18} />}
                    <span className="flex-1">{a}</span>
                    {used && <span className="text-xs font-bold uppercase">{used === "pickup" ? "Pickup" : "Destination"}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] -mx-4 bg-bg/95 px-4 py-3 backdrop-blur">
          <Button type="submit" block disabled={busy}>
            Find rides
          </Button>
        </div>
      </form>
    </>
  );
}
