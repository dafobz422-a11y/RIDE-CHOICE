"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAsync } from "@/lib/hooks";
import { DEFAULT_PREFERENCES, PRIORITY_LABEL, TEMP_LABEL } from "@/lib/prefs";
import { authApi, store } from "@/lib/backend";
import type { Preferences, Priority, Temperature } from "@/lib/types";
import { haptic, useToast } from "@/components/feedback";
import { FitPreview, SAMPLE_TRIP } from "@/components/fit-preview";
import { MustHaveControls, opts } from "@/components/pref-controls";
import { Button, Card, FullPageSpinner, PageHeader, Segmented, Switch } from "@/components/ui";

export default function PreferencesPage() {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const userId = user!.id;
  const onboarding = !user!.onboarded;
  const [loaded] = useAsync(
    async () => ({ prefs: await store.getPreferences(userId), draft: await store.getDraft(userId) }),
    [userId],
  );
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (loaded !== undefined && prefs === null) setPrefs(loaded.prefs ?? DEFAULT_PREFERENCES);
  }, [loaded, prefs]);

  if (!prefs || !loaded) return <FullPageSpinner />;

  const set = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setDirty(true);
    setPrefs({ ...prefs, [key]: value });
  };

  async function save() {
    setBusy(true);
    await store.savePreferences(userId, prefs!);
    haptic();
    if (onboarding) {
      await authApi.completeOnboarding(userId);
      await refresh();
      toast("Preferences saved");
      router.push("/ride/new");
      return;
    }
    setBusy(false);
    setDirty(false);
    toast("Preferences saved");
  }

  return (
    <>
      <PageHeader
        title={onboarding ? "Set your ride preferences" : "Ride preferences"}
        back={onboarding ? undefined : "/account"}
        subtitle={
          onboarding
            ? "We'll only show rides that fit, and check every preference for you. You can change these anytime."
            : "Applied to your next search. Past rides keep the preferences you had when you booked."
        }
      />
      <div className="flex flex-col gap-4 px-4">
        <FitPreview prefs={prefs} trip={loaded.draft ?? SAMPLE_TRIP} />

        <Card className="flex flex-col gap-6">
          <h2 className="text-xs font-bold tracking-wider text-muted uppercase">Must-haves</h2>
          <MustHaveControls prefs={prefs} set={set} idPrefix="prefs" />
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

        <div className="sticky bottom-[calc(5.7rem+env(safe-area-inset-bottom))] -mx-4 flex flex-col gap-2 bg-linear-to-t from-bg from-60% to-bg/0 px-4 pt-6 pb-3">
          {onboarding || dirty ? (
            <Button block onClick={save} disabled={busy}>
              {onboarding ? "Save and plan a ride" : "Save preferences"}
            </Button>
          ) : (
            <Button block variant="secondary" onClick={() => router.push("/ride/new")}>
              Plan a ride
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
