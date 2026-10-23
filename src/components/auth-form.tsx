"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AuthError, validateLogin, validateSignup } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";
import { backendKind } from "@/lib/backend";
import { CarBackdrop } from "./car-backdrop";
import { Button, Field, PageHeader } from "./ui";

type Mode = "signup" | "login";
type Errors = { name?: string; email?: string; password?: string; form?: string };

export function AuthForm({ mode }: { mode: Mode }) {
  const { user, ready, signup, login } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  // Already signed in: skip the form.
  useEffect(() => {
    if (ready && user && !busy) router.replace(user.onboarded ? "/home" : "/preferences");
  }, [ready, user, busy, router]);

  const validate = (): Errors =>
    mode === "signup" ? validateSignup({ name, email, password }) : validateLogin(email, password);

  // Inline validation once a field has been visited.
  const live = validate();
  const shown: Errors = {
    name: touched.name ? (errors.name ?? live.name) : errors.name,
    email: touched.email ? (errors.email ?? live.email) : errors.email,
    password: touched.password ? (errors.password ?? live.password) : errors.password,
  };

  const blur = (field: string) => () => setTouched((t) => ({ ...t, [field]: true }));
  const clearServerError = (field: keyof Errors) => setErrors((e) => ({ ...e, [field]: undefined, form: undefined }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const v = validate();
    setTouched({ name: true, email: true, password: true });
    if (Object.keys(v).length) {
      setErrors(v);
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        await signup({ name, email, password });
        router.push("/preferences");
      } else {
        const u = await login(email, password);
        router.push(u.onboarded ? "/home" : "/preferences");
      }
    } catch (err) {
      setBusy(false);
      if (err instanceof AuthError && err.field) setErrors({ [err.field]: err.message });
      else setErrors({ form: err instanceof Error ? err.message : "Something went wrong. Try again." });
    }
  }

  const isSignup = mode === "signup";

  return (
    <main className="flex flex-1 flex-col">
      <CarBackdrop compact className="-mb-6" />
      <PageHeader
        back="/"
        title={isSignup ? "Create your account" : "Welcome back"}
        subtitle={
          isSignup
            ? backendKind === "supabase"
              ? "Takes 20 seconds. Your rides sync across your devices."
              : "Takes 20 seconds. Your data stays in this browser."
            : "Log in to compare and book rides."
        }
      />
      <form noValidate onSubmit={onSubmit} className="flex flex-1 flex-col gap-4 px-4 pb-8">
        {isSignup && (
          <Field
            label="Name"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearServerError("name");
            }}
            onBlur={blur("name")}
            error={shown.name}
          />
        )}
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
            clearServerError("email");
          }}
          onBlur={blur("email")}
          error={shown.email}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            clearServerError("password");
          }}
          onBlur={blur("password")}
          error={shown.password}
          hint={isSignup ? "At least 8 characters, with a letter and a number." : undefined}
        />
        {!isSignup && (
          <Link
            href="/forgot-password"
            className="-mt-2 inline-flex min-h-11 items-center self-end text-sm font-semibold text-accent-soft-fg underline underline-offset-4"
          >
            Forgot password?
          </Link>
        )}
        {errors.form && (
          <p role="alert" className="rounded-2xl bg-danger-soft p-3 text-sm font-medium text-danger">
            {errors.form}
          </p>
        )}
        <div className="mt-auto flex flex-col gap-3 pt-4">
          <Button type="submit" block disabled={busy}>
            {busy ? "Please wait…" : isSignup ? "Create account" : "Log in"}
          </Button>
          <p className="text-center text-sm text-muted">
            {isSignup ? "Already have an account? " : "New to RideChoice? "}
            <Link
              href={isSignup ? "/login" : "/signup"}
              className="inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4"
            >
              {isSignup ? "Log in" : "Create an account"}
            </Link>
          </p>
        </div>
      </form>
    </main>
  );
}
