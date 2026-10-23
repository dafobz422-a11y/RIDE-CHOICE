"use client";

import Link from "next/link";
import { useEffect, useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { ArrowLeftIcon, CarIcon, CheckIcon, MinusIcon, XIcon } from "./icons";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT: Record<Variant, string> = {
  primary: "btn-primary text-accent-fg",
  secondary: "elevated bg-surface text-ink border border-line hover:border-line-strong hover:bg-surface-2",
  ghost: "bg-transparent text-accent-soft-fg hover:bg-accent-soft",
  danger: "bg-surface text-danger border border-line hover:bg-danger-soft",
};

const BTN =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[0.95rem] font-bold tracking-tight transition-[background-color,border-color,transform] duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100";

export function Button({
  variant = "primary",
  block,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; block?: boolean }) {
  return <button className={cx(BTN, VARIANT[variant], block && "w-full", className)} {...rest} />;
}

export function LinkButton({
  href,
  variant = "primary",
  block,
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  block?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cx(BTN, VARIANT[variant], block && "w-full", className)}>
      {children}
    </Link>
  );
}

export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  back?: string;
  action?: ReactNode;
}) {
  // Frost the header once content scrolls beneath it.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cx(
        "sticky top-0 z-30 border-b px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-3 transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled ? "border-line bg-bg/90 backdrop-blur-xl backdrop-saturate-150" : "border-transparent",
      )}
    >
      <div className="flex items-start gap-3">
        {back && (
          <Link
            href={back}
            aria-label="Back"
            className="elevated mt-0.5 inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink transition-transform hover:bg-surface-2 active:scale-95"
          >
            <ArrowLeftIcon />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[2rem] leading-[1.08] font-semibold">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm leading-relaxed text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("elevated rounded-[28px] border border-line bg-surface p-4", className)}>{children}</div>;
}

export function Field({
  label,
  error,
  hint,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(
          "elevated min-h-13 rounded-2xl border bg-surface px-4 text-base text-ink transition-colors placeholder:text-muted focus:border-accent",
          error ? "border-danger" : "border-line",
        )}
        {...input}
      />
      {error ? (
        <p id={`${id}-err`} className="flex items-center gap-1 text-sm font-medium text-danger">
          <XIcon size={14} /> {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-sm text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** Radio group styled as a segmented control. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  name,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  name: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{label}</legend>
      <div className="grid gap-1 rounded-2xl bg-surface-2 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => {
          const checked = o.value === value;
          return (
            <label
              key={o.value}
              className={cx(
                "relative flex min-h-11 cursor-pointer items-center justify-center gap-1 rounded-xl px-2 text-sm font-semibold transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-[var(--ring)]",
                checked ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-muted hover:text-ink",
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              {checked && <CheckIcon size={14} />}
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Switch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex min-h-12 items-center justify-between gap-4">
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-base font-semibold">{label}</span>
        {description && <span className="block text-sm text-muted">{description}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border-2 transition-colors",
          checked ? "border-accent bg-accent" : "border-line bg-surface-2",
        )}
      >
        <span
          className={cx(
            "inline-flex size-6 items-center justify-center rounded-full bg-surface shadow transition-transform",
            checked ? "translate-x-6 text-accent" : "translate-x-0.5 text-muted",
          )}
        >
          {checked ? <CheckIcon size={14} /> : <MinusIcon size={14} />}
        </span>
        <span className="sr-only">{checked ? "On" : "Off"}</span>
      </button>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx("shimmer rounded-xl", className)} />;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: ReactNode;
}) {
  return (
    <div className="elevated mx-4 flex flex-col items-center gap-3 rounded-[28px] border border-line bg-surface px-6 py-10 text-center">
      <span aria-hidden className="btn-primary mb-1 flex size-16 items-center justify-center rounded-[22px] text-accent-fg">
        <CarIcon size={30} />
      </span>
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      <p className="max-w-[28ch] text-sm text-muted">{body}</p>
      <div className="mt-2 w-full max-w-60">{action}</div>
    </div>
  );
}

export function FullPageSpinner({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="flex flex-1 items-center justify-center p-10 text-muted">
      <span className="mr-3 size-5 animate-spin rounded-full border-2 border-line border-t-accent" />
      {label}…
    </div>
  );
}
