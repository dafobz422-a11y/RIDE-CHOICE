# RideChoice

A mobile-first web app where a rider sets ride preferences, compares the 3–4 rides
that fit **side by side** (every preference checked ✓/✗), books one, watches a
simulated trip, and then rates whether the ride actually met each preference.

**Live:** https://ridechoice-sigma.vercel.app

Built with Next.js 16 (App Router), TypeScript (strict) and Tailwind CSS 4. No
paid services or API keys: everything runs in the browser.

## The path

1. `/` landing → **Create account** (`/signup`) or **Log in** (`/login`)
2. `/preferences`: max price, max pickup wait, vehicle size, wheelchair access,
   quiet ride, cabin temperature, eco vehicle, sort priority (shown at sign-up, editable later
   from Account)
3. `/home` (after logging in): greeting, a **Where to?** search, Ride now / Schedule
   shortcuts, any live or upcoming ride, a prompt to rate your last ride, a live map
   of nearby cars (tap a car to select its ride type), a swipeable ride-type carousel
   synced with the map, your recent places (one tap to rebook) and your must-haves
4. `/ride/new`: pickup and destination, with sample-address quick picks, and
   **Ride now** or **Schedule** (pick a day, part of day and 30-minute slot)
5. `/ride/compare`: ~600 ms skeleton, then 3–4 options in snap-scrolling columns,
   or an attribute-per-row table. Each option has ✓/✗ plus a text label for every
   preference, a match score, Best match / Cheapest / Fastest badges and its own
   **Book this ride** button. **Fare & details** expands an itemised fare (base,
   distance, time, ride type & demand, booking fee) and the vehicle's features
6. `/ride/[id]`: confirmation and simulated trip (Driver assigned → Arriving →
   On trip → Completed, 3 s each) with **Skip to end**. A scheduled ride shows
   its pickup time and a countdown, with **Add to calendar** (.ics), **Cancel ride**
   and **Start ride now (demo)**
7. `/ride/[id]/rate`: Yes / Partly / No and an optional note for each preference
   snapshotted at booking, 1–5 stars, then a summary ("Met 4 of 5 preferences")
8. `/history`: upcoming rides first, then past rides with their rating summary;
   filter by All / Upcoming / Rated / To rate; tap one for details
9. `/account`: profile and ride stats, ride preferences (edit), history and schedule
   shortcuts, log out, reset demo data

The tab bar is **Home · Book · History · Account**. Preferences live under Account.

## Run locally

Requires Node 20.9+ (developed on Node 24).

```bash
npm install
npm run dev        # http://localhost:3000
```

Production build: `npm run build && npm start`.

## Test

```bash
npm run lint
npx tsc --noEmit
npm test                      # Vitest unit tests for src/lib (matching, scoring, rides, rating, store, auth)
npx playwright install chromium   # first time only
npx playwright test           # e2e happy path at an iPhone 13 viewport
```

The Playwright config builds the app and serves it on port 3100. To run the e2e
suite against a deployment instead, run `E2E_BASE_URL=https://your-url npx playwright test`.

The e2e test (`e2e/happy-path.spec.ts`) signs up, sets preferences, plans a ride,
asserts 3–4 options are visible, books, skips to the end, rates every preference,
and checks that History shows the right "Met X of Y". It also reloads mid-flow
to check that state persists, logs out and back in, and fails if the browser
console logs any error.

## Deploy (Vercel)

```bash
npx vercel login
npx vercel --prod --yes
```

No environment variables are needed. Any static-capable Node host works too
(`npm run build && npm start`).

## Project layout

```
src/lib/types.ts         data model (User, Preferences, RideOption, Booking, Rating)
src/lib/store.ts         Store interface + LocalStore (localStorage → in-memory fallback)
src/lib/auth.ts          sign up / log in / log out, SHA-256 password hashing (Web Crypto)
src/lib/rides.ts         deterministic ride engine (seeded by pickup + dropoff), 6 tiers
src/lib/matching.ts      evaluate, filter, sort by priority, near misses, badges
src/lib/rating.ts        rating summary ("Met X of Y")
src/lib/trip.ts          simulated trip stages
src/lib/schedule.ts      pickup slots, validation, formatting, .ics export
src/app/(app)/…          protected screens (client-side guard → /login)
e2e/happy-path.spec.ts   Playwright end-to-end test
```

See `PLAN.md` for the data flow.

## Assumptions and defaults

- **Mock auth, real hashing.** Passwords are salted (per user, random 16 bytes)
  and hashed with SHA-256 via Web Crypto. Accounts and the session live in this
  browser's localStorage. This is a demo, not production security: a real
  backend should use a slow KDF (Argon2/bcrypt) on the server.
- **Protected routes are guarded client-side.** All data lives in the browser,
  so there is nothing for the server to protect. Signed-out visitors to any app
  screen are sent to `/login`.
- **Hard and soft preferences.** Max price, max pickup wait, vehicle size (when
  not "Any") and wheelchair access (when on) are hard filters. Quiet ride (when
  on), temperature (when not "Neutral") and eco (when on) only affect the match
  score. Priority sorts and is not scored.
- **Which preferences count.** Price and wait always count. The others count only
  when the rider asks for them, so a rider who wants nothing special sees "2/2".
  The rating screen asks about exactly these, as snapshotted at booking.
- **Match score** = active preferences met / active preferences.
- **Near misses.** If fewer than 3 rides pass the hard filters, the closest misses
  (fewest failed must-haves, then smallest overshoot) fill up to 3. They are
  labeled "Near miss — Doesn't meet: price" and can still be booked.
- **At most 4 options** are shown, sorted by priority: Cheapest = price,
  Fastest = pickup wait + trip time, Comfort = tier comfort, then match score.
- **Badges** go only to eligible options: Best match = highest score; Cheapest;
  Fastest = earliest arrival. Ties go to the higher-sorted option.
- **Vehicle size:** "Standard" means a standard car (XL doesn't count); "XL"
  means 6-seat vehicles. The Access tier is a ramp-equipped van (XL size).
- **Eco** = EV or hybrid. **Temperature** is met when the vehicle has climate
  control the driver sets to your preference.
- **Ride engine.** One option per tier (Economy, Comfort, XL, Green EV, Access,
  Premium). The same pickup and dropoff (ignoring case and spacing) always gives the
  same prices, ETAs, drivers and vehicles. Fares: $2.50 base + $0.95/km + $0.26/min,
  times a tier multiplier, plus a $1.75 booking fee.
- **Defaults:** max price $50, max wait 10 min, any size, nothing else, sort by cheapest.
- **Trip progress** is computed from when the trip started, so reloading mid-trip
  keeps the current stage. "Skip to end" marks the ride completed.
- **Scheduling:** pickups are 30-minute slots from 5:00 AM to 11:30 PM, at least
  30 minutes ahead and up to 7 days out (local time). A scheduled ride reserves
  its driver, so the pickup-wait preference counts as met and "Fastest" ranks by
  trip time alone; the rating asks whether the pickup was on time instead. When
  the pickup time arrives the trip starts on its own (timed from the pickup), or
  you can start it early for the demo. Cancelling is free and the ride stays in
  History as cancelled. If a saved search's time has passed, Compare falls back to
  "now" and says so. Prices are the same as riding now.
- **Re-rating:** opening the rate screen for a rated ride pre-fills the answers,
  and submitting again replaces the rating.
- **Reset demo data** wipes every RideChoice key in this browser's localStorage.
- **Design:** Sora (geometric sans, for headlines) and Plus Jakarta Sans (body,
  prices and times, with tabular numbers) via `next/font`. One violet accent with
  neutrals tinted toward it, a soft aurora wash behind page tops, tinted shadows
  instead of hard borders, pill buttons and a floating tab bar. Light and dark mode
  follow `prefers-color-scheme`. Every text/background
  pair is at least 4.5:1, touch targets are at least 44 px, focus rings are visible,
  and state is always shown with an icon and text as well as color.
- **Next.js config:** the scaffold enables Cache Components and partial
  prefetching. They are turned off because this app is fully client-rendered.
- **E2E browser:** the iPhone 13 profile (viewport, DPR, touch, mobile UA) runs
  in Chromium so the suite works the same on Windows, macOS and Linux CI.

## Swapping localStorage for a real database

All persistence goes through the async `Store` interface in `src/lib/store.ts`.
The UI only imports the `store` instance, so changing backends means one new
class and a one-line swap:

```ts
// src/lib/store.ts
export const store: Store = new LocalStore();      // today
export const store: Store = new SupabaseStore(sb); // later
```

**Supabase.** Create tables `users` (or use Supabase Auth), `preferences
(user_id pk, data jsonb)`, `drafts (user_id pk, data jsonb)`, `bookings (id pk,
user_id, data jsonb, status, created_at)` and `ratings (booking_id pk, data jsonb)`,
with row-level security on `user_id = auth.uid()`. Then implement each `Store`
method with the Supabase client, for example
`getBooking: (id) => sb.from("bookings").select("data").eq("id", id).maybeSingle()`.
Replace `src/lib/auth.ts` with Supabase Auth (`signUp`, `signInWithPassword`,
`signOut`) and have `getSession` read `sb.auth.getSession()`.

**Prisma.** Model the same tables in `schema.prisma`. Expose them through route
handlers (`src/app/api/*/route.ts`) or Server Functions, and write an
`ApiStore implements Store` that calls them with `fetch`. Move password hashing to the
server with bcrypt or Argon2, keep the session in an httpOnly cookie, and enforce
protected routes in `proxy.ts` as well.

`createMemoryStore()` stays useful for unit tests either way.
