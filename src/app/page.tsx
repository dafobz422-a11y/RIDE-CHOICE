"use client";

import { useAuth } from "@/lib/auth-context";
import { CheckIcon, ClockIcon, ColumnsIcon, StarIcon, XIcon } from "@/components/icons";
import { LinkButton, cx } from "@/components/ui";

const STEPS = [
  { Icon: CheckIcon, title: "Say what matters", body: "Budget, wait, quiet, temperature, accessibility, eco." },
  { Icon: ColumnsIcon, title: "Compare side by side", body: "Only rides that fit, with every preference checked." },
  { Icon: StarIcon, title: "Hold them to it", body: "Rate whether each preference was actually met." },
];

/** Decorative preview of the compare screen; hidden from assistive tech. */
function HeroPreview() {
  const cards = [
    { tier: "Comfort", price: "$24.10", eta: 4, score: "5/5", checks: [true, true, true, true, true], best: true },
    { tier: "Economy", price: "$17.85", eta: 3, score: "3/5", checks: [true, true, false, true, false], best: false },
  ];
  return (
    <div aria-hidden className="relative mx-auto mt-10 h-64 w-full max-w-[340px] select-none">
      {cards.map((c, i) => (
        <div
          key={c.tier}
          className={cx(
            "animate-rise absolute top-0 w-[62%] rounded-[24px] border border-line bg-surface p-3.5",
            i === 0 ? "elevated-lg left-0 z-10 -rotate-3" : "elevated right-0 top-6 rotate-3 opacity-95",
          )}
          style={{ animationDelay: `${150 + i * 120}ms` }}
        >
          {c.best && (
            <span className="btn-primary mb-2 inline-block rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold text-accent-fg">Best match</span>
          )}
          {!c.best && <span className="mb-2 inline-block rounded-full bg-accent-soft px-2.5 py-0.5 text-[0.65rem] font-bold text-accent-soft-fg">Cheapest</span>}
          <div className="flex items-baseline justify-between">
            <span className="font-display text-lg font-semibold">{c.tier}</span>
            <span className="num text-base font-extrabold">{c.price}</span>
          </div>
          <p className="num mt-0.5 flex items-center gap-1 text-[0.7rem] text-muted">
            <ClockIcon size={11} /> {c.eta} min away
          </p>
          <div className="mt-2.5 flex gap-1">
            {c.checks.map((ok, j) => (
              <span
                key={j}
                className={cx(
                  "flex size-5 items-center justify-center rounded-full",
                  ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
                )}
              >
                {ok ? <CheckIcon size={11} strokeWidth={3.5} /> : <XIcon size={11} strokeWidth={3.5} />}
              </span>
            ))}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5">
            <div className="h-1.5 flex-1 rounded-full bg-surface-2">
              <div className="btn-primary h-full rounded-full" style={{ width: c.best ? "100%" : "60%" }} />
            </div>
            <span className="num text-[0.65rem] font-bold">{c.score}</span>
          </div>
        </div>
      ))}
      <div
        className="animate-rise elevated absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-xs font-bold whitespace-nowrap"
        style={{ animationDelay: "420ms" }}
      >
        <span className="flex size-5 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckIcon size={12} strokeWidth={3.5} />
        </span>
        Met 5 of 5 preferences
        <span className="text-warn">★★★★★</span>
      </div>
    </div>
  );
}

export default function Landing() {
  const { user, ready } = useAuth();

  return (
    <main className="pt-safe pb-safe flex flex-1 flex-col px-5">
      <div className="flex items-center gap-2.5 pt-6">
        <span className="btn-primary flex size-10 items-center justify-center rounded-[14px] font-display text-xl font-semibold text-accent-fg">
          R
        </span>
        <span className="font-display text-xl font-semibold">RideChoice</span>
      </div>

      <section className="mt-10 flex-1">
        <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1 text-xs font-bold text-accent-soft-fg backdrop-blur">
          <span className="size-1.5 rounded-full bg-accent" /> Ride on your terms
        </p>
        <h1 className="mt-4 font-display text-[2.55rem] leading-[1.04] font-bold">
          Compare rides by what you <span className="text-gradient">actually</span> care about.
        </h1>
        <p className="mt-4 text-[1.05rem] leading-relaxed text-muted">
          Set your preferences once. See the 3–4 rides that fit, side by side, then book the one you want.
        </p>

        <HeroPreview />

        <ul className="mt-8 flex flex-col gap-3">
          {STEPS.map(({ Icon, title, body }, i) => (
            <li key={title} className="elevated flex items-center gap-4 rounded-[24px] border border-line bg-surface p-4">
              <span className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-soft-fg">
                <Icon size={20} />
                <span className="num absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-ink text-[0.65rem] font-bold text-bg">
                  {i + 1}
                </span>
              </span>
              <span>
                <span className="block font-bold">{title}</span>
                <span className="block text-sm text-muted">{body}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="sticky bottom-0 -mx-5 flex flex-col gap-3 bg-linear-to-t from-bg from-70% to-bg/0 px-5 pt-8 pb-6">
        {ready && user ? (
          <LinkButton href="/ride/new" block>
            Continue as {user.name.split(" ")[0]}
          </LinkButton>
        ) : (
          <>
            <LinkButton href="/signup" block>
              Create account
            </LinkButton>
            <LinkButton href="/login" variant="secondary" block>
              Log in
            </LinkButton>
          </>
        )}
      </div>
    </main>
  );
}
