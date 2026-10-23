"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthError } from "@/lib/auth";
import { authApi } from "@/lib/backend";
import { CheckIcon } from "@/components/icons";
import { Button, Card, Field, PageHeader } from "@/components/ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      await authApi.requestPasswordReset(email, `${window.location.origin}/reset-password`);
      setSent(true);
    } catch (err) {
      setError(err instanceof AuthError || err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader back="/login" title="Reset your password" subtitle="We'll email you a link to choose a new one." />
      <div className="flex flex-1 flex-col gap-4 px-4 pb-8">
        {sent ? (
          <Card className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
              <CheckIcon size={18} strokeWidth={3} />
            </span>
            <p role="status" className="text-sm">
              If an account exists for <strong>{email.trim()}</strong>, a reset link is on its way. Open it on this device to set a new
              password.
            </p>
          </Card>
        ) : (
          <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
            <Field
              label="Email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(undefined);
              }}
              error={error}
            />
            <Button type="submit" block disabled={busy}>
              {busy ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}
        <p className="text-center text-sm text-muted">
          Remembered it?{" "}
          <Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-accent-soft-fg underline underline-offset-4">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
