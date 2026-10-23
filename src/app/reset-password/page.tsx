"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { authApi } from "@/lib/backend";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/feedback";
import { Button, EmptyState, Field, FullPageSpinner, LinkButton, PageHeader } from "@/components/ui";

/**
 * Landing page for the emailed reset link. Supabase reads the recovery token
 * from the URL and signs the rider in; here they choose the new password.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const toast = useToast();
  const { refresh } = useAuth();
  const [state, setState] = useState<"checking" | "ready" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    authApi.currentUser().then(
      (u) => setState(u ? "ready" : "invalid"),
      () => setState("invalid"),
    );
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8 || !/\d/.test(password) || !/[a-z]/i.test(password)) {
      setError("Use at least 8 characters, with a letter and a number.");
      return;
    }
    if (password !== confirm) {
      setError("The passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await authApi.updatePassword(password);
      await refresh();
      toast("Password updated");
      router.replace("/home");
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    }
  }

  if (state === "checking") return <FullPageSpinner />;
  if (state === "invalid") {
    return (
      <main className="flex flex-1 flex-col">
        <PageHeader title="Reset link expired" />
        <EmptyState
          title="This link no longer works"
          body="Reset links expire after a while and work once. Ask for a new one."
          action={<LinkButton href="/forgot-password" block>Send a new link</LinkButton>}
        />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title="Choose a new password" subtitle="You'll stay logged in on this device." />
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4 px-4 pb-8">
        <Field
          label="New password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(undefined);
          }}
          hint="At least 8 characters, with a letter and a number."
        />
        <Field
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            setError(undefined);
          }}
          error={error}
        />
        <Button type="submit" block disabled={busy}>
          {busy ? "Saving…" : "Save new password"}
        </Button>
        <p className="text-center text-sm text-muted">
          <Link href="/home" className="inline-flex min-h-11 items-center font-semibold text-accent-soft-fg underline underline-offset-4">
            Skip for now
          </Link>
        </p>
      </form>
    </main>
  );
}
