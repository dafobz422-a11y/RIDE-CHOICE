"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAsync } from "@/lib/hooks";
import {
  DEFAULT_PREFERENCES,
  PRICE_MAX,
  PRICE_MIN,
  PRIORITY_LABEL,
  SIZE_LABEL,
  TEMP_LABEL,
  WAIT_MAX,
  WAIT_MIN,
} from "@/lib/prefs";
import { store } from "@/lib/store";
import type { Preferences, Priority, Temperature, VehicleSize } from "@/lib/types";
import { CheckIcon } from "@/components/icons";
import { Button, Card, FullPageSpinner, PageHeader, Segmented, Switch } from "@/components/ui";

function opts<T extends string>(labels: Record<T, string>) {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}

export default function PreferencesPage() {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const userId = user!.id;
  const onboarding = !user!.onboarded;
  const [loaded] = useAsync(() => store.getPreferences(userId), [userId]);
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (loaded !== undefined && prefs === null) setPrefs(loaded ?? DEFAULT_PREFERENCES);
  }, [loaded, prefs]);

  if (!prefs) return <FullPageSpinner />;

  const set = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setSaved(false);
    setPrefs({ ...prefs, [key]: value });
  };

  async function save() {
    setBusy(true);
    await store.savePreferences(userId, prefs!);
    if (onboarding) {
      await store.updateUser(userId, { onboarded: true });
      await refresh();
      router.push("/ride/new");
      return;
    }
    setBusy(false);
    setSaved(true);
  }

  return (
    <>
      <PageHeader
        title={onboarding ? "Set your ride preferences" : "Ride preferences"}
        subtitle={
          onboarding
            ? "We'll only show rides that fit, and check every preference for you. You can change these anytime."
            : "Applied to your next search. Past rides keep the preferences you had when you booked."
        }
      />
      <div className="flex flex-col gap-4 px-4">
        <Card className="flex flex-col gap-6">
          <h2 className="text-xs font-bold tracking-wider text-muted uppercase">Must-haves</h2>
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <label htmlFor="maxPrice" className="text-sm font-semibold">
                Max price
              </label>
              <span className="num font-display text-xl font-bold">${prefs.maxPrice}</span>
            </div>
            <input
              id="maxPrice"
              type="range"
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={1}
              value={prefs.maxPrice}
              onChange={(e) => set("maxPrice", Number(e.target.value))}
              className="h-11 w-full cursor-pointer"
              aria-valuetext={`$${prefs.maxPrice}`}
            />
            <div className="num flex justify-between text-xs text-muted">
              <span>${PRICE_MIN}</span>
              <span>${PRICE_MAX}</span>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <label htmlFor="maxWait" className="text-sm font-semibold">
                Max pickup wait
              </label>
              <span className="num font-display text-xl font-bold">{prefs.maxWaitMin} min</span>
            </div>
            <input
              id="maxWait"
              type="range"
              min={WAIT_MIN}
              max={WAIT_MAX}
              step={1}
              value={prefs.maxWaitMin}
              onChange={(e) => set("maxWaitMin", Number(e.target.value))}
              className="h-11 w-full cursor-pointer"
              aria-valuetext={`${prefs.maxWaitMin} minutes`}
            />
            <div className="num flex justify-between text-xs text-muted">
              <span>{WAIT_MIN} min</span>
              <span>{WAIT_MAX} min</span>
            </div>
          </div>

          <Segmented<VehicleSize>
            name="size"
            label="Vehicle size"
            value={prefs.vehicleSize}
            options={opts(SIZE_LABEL)}
            onChange={(v) => set("vehicleSize", v)}
          />

          <Switch
            label="Wheelchair accessible"
            description="Ramp or lift-equipped vehicle"
            checked={prefs.wheelchair}
            onChange={(v) => set("wheelchair", v)}
          />
        </Card>

        <Card className="flex flex-col gap-6">
          <h2 className="text-xs font-bold tracking-wider text-muted uppercase">Nice-to-haves</h2>
          <Switch
            label="Quiet ride"
            description="Driver keeps conversation and music low"
            checked={prefs.quiet}
            onChange={(v) => set("quiet", v)}
          />
          <Switch
            label="Eco vehicle"
            description="Electric or hybrid only counts as a match"
            checked={prefs.eco}
            onChange={(v) => set("eco", v)}
          />
          <Segmented<Temperature>
            name="temperature"
            label="Cabin temperature"
            value={prefs.temperature}
            options={opts(TEMP_LABEL)}
            onChange={(v) => set("temperature", v)}
          />
        </Card>

        <Card>
          <Segmented<Priority>
            name="priority"
            label="Sort rides by"
            value={prefs.priority}
            options={opts(PRIORITY_LABEL)}
            onChange={(v) => set("priority", v)}
          />
        </Card>

        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] -mx-4 flex flex-col gap-2 bg-bg/95 px-4 py-3 backdrop-blur">
          <p role="status" aria-live="polite" className="min-h-5 text-center text-sm font-medium text-success">
            {saved && (
              <span className="inline-flex items-center gap-1">
                <CheckIcon size={16} /> Preferences saved
              </span>
            )}
          </p>
          <Button block onClick={save} disabled={busy}>
            {onboarding ? "Save and plan a ride" : "Save preferences"}
          </Button>
          {saved && (
            <Button block variant="secondary" onClick={() => router.push("/ride/new")}>
              Plan a ride
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
