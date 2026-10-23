import { localAuth, type AuthApi } from "./auth";
import { localStore, type DataStore } from "./store";
import { createSupabase, SupabaseStore, supabaseAuth } from "./supabase-backend";

/**
 * Picks the backend once, at load. With both Supabase variables set the app
 * uses Supabase; without them (local dev, CI, unit tests) it runs as the
 * browser-only demo. Next.js inlines NEXT_PUBLIC_* values at build time, so
 * they must be read by their literal names here.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const sb = url && key ? createSupabase(url, key) : null;

export const store: DataStore = sb ? new SupabaseStore(sb) : localStore;
export const authApi: AuthApi = sb ? supabaseAuth(sb) : localAuth(localStore);
export const backendKind: AuthApi["kind"] = authApi.kind;
