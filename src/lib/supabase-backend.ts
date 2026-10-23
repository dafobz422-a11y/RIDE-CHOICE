import { createClient, type AuthError as SupabaseAuthError, type SupabaseClient, type User as AuthUser } from "@supabase/supabase-js";
import { AuthError, type AuthApi } from "./auth";
import type { DataStore } from "./store";
import type { Booking, Preferences, PublicUser, Rating, TripDraft } from "./types";

/**
 * Supabase-backed data and auth. Tables and row-level security live in
 * supabase/schema.sql; every row belongs to the signed-in rider, so the
 * `userId` arguments are also enforced by the database.
 */

export function createSupabase(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
}

/** Reads fail soft (the UI shows empty states); writes throw so callers notice. */
function check<T>(result: { data: T; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`Couldn't ${what}: ${result.error.message}`);
  return result.data;
}

function softRead<T>(result: { data: T | null; error: { message: string } | null }, what: string, fallback: T): T {
  if (result.error) {
    console.warn(`Couldn't ${what}:`, result.error.message);
    return fallback;
  }
  return result.data ?? fallback;
}

/** Booking ids are UUIDs; anything else can't exist, so skip the round trip (and the 400). */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class SupabaseStore implements DataStore {
  constructor(private sb: SupabaseClient) {}

  async getPreferences(userId: string) {
    const r = await this.sb.from("preferences").select("data").eq("user_id", userId).maybeSingle();
    return softRead(r, "load preferences", null)?.data as Preferences | null ?? null;
  }

  async savePreferences(userId: string, prefs: Preferences) {
    check(await this.sb.from("preferences").upsert({ user_id: userId, data: prefs, updated_at: new Date().toISOString() }), "save preferences");
  }

  async getDraft(userId: string) {
    const r = await this.sb.from("drafts").select("data").eq("user_id", userId).maybeSingle();
    return softRead(r, "load your last search", null)?.data as TripDraft | null ?? null;
  }

  async saveDraft(userId: string, draft: TripDraft) {
    check(await this.sb.from("drafts").upsert({ user_id: userId, data: draft, updated_at: new Date().toISOString() }), "save your search");
  }

  async createBooking(b: Booking) {
    check(
      await this.sb.from("bookings").insert({
        id: b.id,
        user_id: b.userId,
        status: b.status,
        scheduled_for: b.scheduledFor ?? null,
        data: b,
        created_at: b.createdAt,
      }),
      "save your booking",
    );
  }

  async getBooking(id: string) {
    if (!UUID_RE.test(id)) return null;
    const r = await this.sb.from("bookings").select("data").eq("id", id).maybeSingle();
    return (softRead(r, "load the ride", null)?.data as Booking | undefined) ?? null;
  }

  async updateBooking(id: string, patch: Partial<Booking>) {
    const current = await this.getBooking(id);
    if (!current) return null;
    const next: Booking = { ...current, ...patch, id };
    check(
      await this.sb
        .from("bookings")
        .update({ status: next.status, scheduled_for: next.scheduledFor ?? null, data: next })
        .eq("id", id),
      "update the ride",
    );
    return next;
  }

  async listBookings(userId: string) {
    const r = await this.sb.from("bookings").select("data").eq("user_id", userId).order("created_at", { ascending: false });
    return softRead(r, "load your rides", [] as { data: Booking }[]).map((row) => row.data);
  }

  async saveRating(rating: Rating) {
    const {
      data: { session },
    } = await this.sb.auth.getSession();
    if (!session) throw new Error("Couldn't save your rating: you're signed out.");
    check(
      await this.sb.from("ratings").upsert({ booking_id: rating.bookingId, user_id: session.user.id, data: rating, created_at: rating.createdAt }),
      "save your rating",
    );
  }

  async getRating(bookingId: string) {
    if (!UUID_RE.test(bookingId)) return null;
    const r = await this.sb.from("ratings").select("data").eq("booking_id", bookingId).maybeSingle();
    return (softRead(r, "load the rating", null)?.data as Rating | undefined) ?? null;
  }

  /** Deletes this rider's preferences, last search and rides (ratings cascade). The login stays. */
  async reset() {
    const {
      data: { session },
    } = await this.sb.auth.getSession();
    if (!session) return;
    const uid = session.user.id;
    for (const table of ["bookings", "preferences", "drafts"] as const) {
      check(await this.sb.from(table).delete().eq("user_id", uid), "delete your data");
    }
  }
}

/** Translate Supabase Auth errors into the messages and fields the forms show. */
export function toAuthError(e: Pick<SupabaseAuthError, "code" | "message">): AuthError {
  const code = e.code ?? "";
  if (code === "user_already_exists" || /already registered/i.test(e.message))
    return new AuthError("An account with this email already exists.", "email");
  if (code === "invalid_credentials" || /invalid login credentials/i.test(e.message))
    return new AuthError("Email or password is incorrect.", "password");
  if (code === "weak_password") return new AuthError(e.message, "password");
  if (code === "email_address_invalid") return new AuthError("Enter a valid email address.", "email");
  if (/rate limit|over_.*_rate_limit/i.test(code + e.message))
    return new AuthError("Too many attempts. Please wait a minute and try again.");
  return new AuthError(e.message || "Something went wrong. Try again.");
}

export function supabaseAuth(sb: SupabaseClient): AuthApi {
  async function profileFor(user: AuthUser): Promise<PublicUser> {
    const { data, error } = await sb.from("profiles").select("name, onboarded, created_at").eq("id", user.id).maybeSingle();
    const metaName = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "";
    if (error) console.warn("Couldn't load profile:", error.message);
    return {
      id: user.id,
      email: user.email ?? "",
      name: data?.name || metaName || (user.email ?? "Rider").split("@")[0],
      onboarded: data?.onboarded ?? false,
      createdAt: data?.created_at ?? user.created_at,
    };
  }

  return {
    kind: "supabase",

    async signup({ name, email, password }) {
      const { data, error } = await sb.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { name: name.trim() } },
      });
      if (error) throw toAuthError(error);
      // With "Confirm email" on there's no session until the rider clicks the link.
      if (!data.session || !data.user) {
        throw new AuthError("Check your inbox and confirm your email, then log in.", "email");
      }
      return profileFor(data.user);
    },

    async login(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) throw toAuthError(error);
      return profileFor(data.user);
    },

    async logout() {
      await sb.auth.signOut();
    },

    async currentUser() {
      const {
        data: { session },
      } = await sb.auth.getSession();
      return session ? profileFor(session.user) : null;
    },

    async completeOnboarding(userId) {
      check(await sb.from("profiles").update({ onboarded: true }).eq("id", userId), "finish setting up your account");
    },

    async requestPasswordReset(email, redirectTo) {
      const { error } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
      if (error) throw toAuthError(error);
    },

    async updatePassword(password) {
      const { error } = await sb.auth.updateUser({ password });
      if (error) throw toAuthError(error);
    },
  };
}
