"use client";

import { useAuth } from "@/lib/auth-context";
import { CheckIcon, ColumnsIcon, StarIcon } from "@/components/icons";
import { LinkButton } from "@/components/ui";

const STEPS = [
  { Icon: CheckIcon, title: "Say what matters", body: "Budget, wait, quiet, temperature, accessibility, eco." },
  { Icon: ColumnsIcon, title: "Compare side by side", body: "Only rides that fit, with every preference checked." },
  { Icon: StarIcon, title: "Hold them to it", body: "Rate whether each preference was actually met." },
];

export default function Landing() {
  const { user, ready } = useAuth();

  return (
    <main className="pt-safe pb-safe flex flex-1 flex-col px-5">
      <div className="flex items-center gap-2 pt-6">
        <span className="flex size-9 items-center justify-center rounded-xl bg-accent font-display text-lg font-extrabold text-accent-fg">
          R
        </span>
        <span className="font-display text-lg font-bold">RideChoice</span>
      </div>

      <section className="mt-12 flex-1">
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">Ride on your terms</p>
        <h1 className="mt-3 font-display text-[2.6rem] leading-[1.05] font-extrabold tracking-tight">
          Compare rides by what you actually care about.
        </h1>
        <p className="mt-4 text-lg text-muted">
          Set your preferences once. See the 3–4 rides that fit, side by side, then book the one you want.
        </p>

        <ul className="mt-8 flex flex-col gap-3">
          {STEPS.map(({ Icon, title, body }) => (
            <li key={title} className="flex gap-3 rounded-2xl border border-line bg-surface p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-fg">
                <Icon size={20} />
              </span>
              <span>
                <span className="block font-semibold">{title}</span>
                <span className="block text-sm text-muted">{body}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="sticky bottom-0 flex flex-col gap-3 bg-bg py-6">
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
