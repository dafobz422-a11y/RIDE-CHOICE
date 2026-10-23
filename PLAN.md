# RideChoice — build plan

## Shape
Fully client-side Next.js (App Router) app. All data lives in the browser behind
an async, typed `Store` interface so it can be swapped for a real backend.

```
src/
  app/
    layout.tsx            fonts, theme tokens, <AuthProvider>
    page.tsx              / landing
    login/ signup/        public auth forms (redirect to /ride/new if signed in)
    (app)/layout.tsx      <AuthGate> (redirects to /login) + <TabBar>
    (app)/preferences     onboarding + edit
    (app)/ride/new        pickup / destination + quick picks → saves a TripDraft
    (app)/ride/compare    600ms skeleton → side-by-side columns | table toggle
    (app)/ride/[id]       confirmation + simulated trip, rating summary when rated
    (app)/ride/[id]/rate  per-preference Yes/Partly/No + notes + stars
    (app)/history         bookings + ratings → tap to /ride/[id]
    (app)/account         profile, log out, reset demo data
  components/             ui primitives (Button, Field, Segmented, Toggle, Stars,
                          PrefCheck, OptionCard, CompareTable, TabBar, Skeleton…)
  lib/
    types.ts              User, Preferences, RideOption, Booking, Rating, PrefKey
    store.ts              Store interface + LocalStore (localStorage → memory fallback)
    auth.ts               SHA-256 (Web Crypto) hashing, signup/login/logout
    auth-context.tsx      React context over auth + current user
    prefs.ts              defaults, labels, active preference keys, describe()
    rides.ts              seeded PRNG, 6-tier option generator
    matching.ts           evaluate (meets/score), filter, sort, badges, pick 3–4
    trip.ts               simulated trip stage from elapsed time
    rating.ts             rating summary ("Met 5 of 6")
    *.test.ts             Vitest unit tests for the pure logic
e2e/happy-path.spec.ts    Playwright, iPhone 13 viewport
```

## Data flow
1. Sign up → `auth.signup` hashes password, `store.createUser`, `store.setSession`.
2. Preferences saved per user (`store.savePreferences`), `user.onboarded = true`.
3. /ride/new saves a `TripDraft { pickup, dropoff }` → /ride/compare.
4. Compare: `generateOptions(pickup, dropoff)` (deterministic) →
   `selectOptions(options, prefs)` → eligible ones sorted by priority, padded with
   nearest misses when fewer than 3 qualify. Badges computed over the shown set.
5. Book → `store.createBooking` with `preferencesSnapshot` + `activeKeys` at that moment.
6. Trip stage derived from `startedAt` (3s per stage) so a reload keeps progress;
   "Skip to end" persists `status: 'completed'`.
7. Rate → `store.saveRating`; summary from `summarizeRating(rating, activeKeys)`.
8. History lists bookings with their summaries.

## Preference model
Hard (filter): max price, max wait, vehicle size (when not "any"), wheelchair access (when on).
Soft (scored only): quiet (when on), temperature (when not neutral), eco (when on).
Priority only sorts. Match score = met / active preferences.
