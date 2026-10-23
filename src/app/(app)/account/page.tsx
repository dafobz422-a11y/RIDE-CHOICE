"use client";

import { useState } from "react";
import { logout } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";
import { store } from "@/lib/store";
import { Button, Card, PageHeader } from "@/components/ui";

export default function AccountPage() {
  const { user } = useAuth();
  const [confirmReset, setConfirmReset] = useState(false);

  // Full navigation (not a client transition) so the protected-route guard
  // doesn't race us to /login, and all in-memory state starts fresh.
  async function onLogout() {
    await logout(store);
    window.location.replace("/");
  }

  async function onReset() {
    await store.reset();
    window.location.replace("/");
  }

  return (
    <>
      <PageHeader title="Account" />
      <div className="flex flex-col gap-4 px-4">
        <Card className="flex items-center gap-3">
          <span className="btn-primary flex size-14 items-center justify-center rounded-[18px] font-display text-2xl font-semibold text-accent-fg">
            {user!.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="font-semibold">{user!.name}</p>
            <p className="truncate text-sm text-muted">{user!.email}</p>
          </div>
        </Card>

        <Button variant="secondary" block onClick={onLogout}>
          Log out
        </Button>

        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold">Reset demo data</h2>
          <p className="text-sm text-muted">
            Deletes every account, preference, ride and rating stored in this browser, and logs you out.
          </p>
          {confirmReset ? (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setConfirmReset(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={onReset}>
                Yes, reset
              </Button>
            </div>
          ) : (
            <Button variant="danger" block onClick={() => setConfirmReset(true)}>
              Reset demo data
            </Button>
          )}
        </Card>

        <p className="text-center text-xs text-muted">
          RideChoice is a demo. Rides, drivers and prices are simulated; data never leaves this browser.
        </p>
      </div>
    </>
  );
}
