import type {
  Booking,
  Preferences,
  Rating,
  Session,
  TripDraft,
  User,
} from "./types";

/**
 * Persistence boundary for ride data. Every method is async so it can be
 * backed by the browser (LocalStore) or a network database (SupabaseStore in
 * src/lib/supabase-backend.ts) without touching the UI. Pick one in backend.ts.
 */
export interface DataStore {
  getPreferences(userId: string): Promise<Preferences | null>;
  savePreferences(userId: string, prefs: Preferences): Promise<void>;

  getDraft(userId: string): Promise<TripDraft | null>;
  saveDraft(userId: string, draft: TripDraft): Promise<void>;

  createBooking(booking: Booking): Promise<void>;
  getBooking(id: string): Promise<Booking | null>;
  updateBooking(id: string, patch: Partial<Booking>): Promise<Booking | null>;
  listBookings(userId: string): Promise<Booking[]>;

  saveRating(rating: Rating): Promise<void>;
  getRating(bookingId: string): Promise<Rating | null>;

  /** Delete this rider's ride data (locally: every RideChoice key, including the session). */
  reset(): Promise<void>;
}

/** The browser-only demo also keeps accounts and the session itself. */
export interface Store extends DataStore {
  findUserByEmail(email: string): Promise<User | null>;
  getUser(id: string): Promise<User | null>;
  createUser(user: User): Promise<void>;
  updateUser(id: string, patch: Partial<User>): Promise<User | null>;

  getSession(): Promise<Session | null>;
  setSession(session: Session): Promise<void>;
  clearSession(): Promise<void>;
}

/** Minimal key-value backend so storage can fail over cleanly. */
interface KV {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  keys(): string[];
}

class MemoryKV implements KV {
  private data = new Map<string, string>();
  get(key: string) {
    return this.data.has(key) ? (this.data.get(key) as string) : null;
  }
  set(key: string, value: string) {
    this.data.set(key, value);
  }
  remove(key: string) {
    this.data.delete(key);
  }
  keys() {
    return [...this.data.keys()];
  }
}

/**
 * localStorage with a per-call in-memory fallback: if any access throws
 * (private mode, quota, disabled storage, SSR) the value is served from memory.
 */
class SafeLocalKV implements KV {
  private memory = new MemoryKV();

  private ls(): globalThis.Storage | null {
    try {
      return typeof window !== "undefined" ? window.localStorage : null;
    } catch {
      return null;
    }
  }

  get(key: string) {
    try {
      const ls = this.ls();
      if (ls) return ls.getItem(key);
    } catch {
      /* fall through to memory */
    }
    return this.memory.get(key);
  }

  set(key: string, value: string) {
    this.memory.set(key, value);
    try {
      this.ls()?.setItem(key, value);
    } catch {
      /* memory copy already written */
    }
  }

  remove(key: string) {
    this.memory.remove(key);
    try {
      this.ls()?.removeItem(key);
    } catch {
      /* ignore */
    }
  }

  keys() {
    try {
      const ls = this.ls();
      if (ls) {
        const out: string[] = [];
        for (let i = 0; i < ls.length; i++) {
          const k = ls.key(i);
          if (k !== null) out.push(k);
        }
        return out;
      }
    } catch {
      /* fall through */
    }
    return this.memory.keys();
  }
}

const PREFIX = "ridechoice:v1:";
const K = {
  users: `${PREFIX}users`,
  session: `${PREFIX}session`,
  prefs: (userId: string) => `${PREFIX}prefs:${userId}`,
  draft: (userId: string) => `${PREFIX}draft:${userId}`,
  bookings: `${PREFIX}bookings`,
  ratings: `${PREFIX}ratings`,
};

export class LocalStore implements Store {
  constructor(private kv: KV = new SafeLocalKV()) {}

  private read<T>(key: string, fallback: T): T {
    try {
      const raw = this.kv.get(key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  }

  private write(key: string, value: unknown): void {
    try {
      this.kv.set(key, JSON.stringify(value));
    } catch {
      /* serialization failure: nothing sensible to persist */
    }
  }

  private users(): User[] {
    return this.read<User[]>(K.users, []);
  }

  async findUserByEmail(email: string) {
    const needle = email.trim().toLowerCase();
    return this.users().find((u) => u.email === needle) ?? null;
  }

  async getUser(id: string) {
    return this.users().find((u) => u.id === id) ?? null;
  }

  async createUser(user: User) {
    this.write(K.users, [...this.users(), user]);
  }

  async updateUser(id: string, patch: Partial<User>) {
    let updated: User | null = null;
    const next = this.users().map((u) => {
      if (u.id !== id) return u;
      updated = { ...u, ...patch, id };
      return updated;
    });
    this.write(K.users, next);
    return updated;
  }

  async getSession() {
    return this.read<Session | null>(K.session, null);
  }

  async setSession(session: Session) {
    this.write(K.session, session);
  }

  async clearSession() {
    try {
      this.kv.remove(K.session);
    } catch {
      /* ignore */
    }
  }

  async getPreferences(userId: string) {
    return this.read<Preferences | null>(K.prefs(userId), null);
  }

  async savePreferences(userId: string, prefs: Preferences) {
    this.write(K.prefs(userId), prefs);
  }

  async getDraft(userId: string) {
    return this.read<TripDraft | null>(K.draft(userId), null);
  }

  async saveDraft(userId: string, draft: TripDraft) {
    this.write(K.draft(userId), draft);
  }

  private bookings(): Booking[] {
    return this.read<Booking[]>(K.bookings, []);
  }

  async createBooking(booking: Booking) {
    this.write(K.bookings, [...this.bookings(), booking]);
  }

  async getBooking(id: string) {
    return this.bookings().find((b) => b.id === id) ?? null;
  }

  async updateBooking(id: string, patch: Partial<Booking>) {
    let updated: Booking | null = null;
    const next = this.bookings().map((b) => {
      if (b.id !== id) return b;
      updated = { ...b, ...patch, id };
      return updated;
    });
    this.write(K.bookings, next);
    return updated;
  }

  async listBookings(userId: string) {
    return this.bookings()
      .filter((b) => b.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private ratings(): Record<string, Rating> {
    return this.read<Record<string, Rating>>(K.ratings, {});
  }

  async saveRating(rating: Rating) {
    this.write(K.ratings, { ...this.ratings(), [rating.bookingId]: rating });
  }

  async getRating(bookingId: string) {
    return this.ratings()[bookingId] ?? null;
  }

  async reset() {
    try {
      for (const key of this.kv.keys()) {
        if (key.startsWith(PREFIX)) this.kv.remove(key);
      }
    } catch {
      /* ignore */
    }
  }
}

export function createMemoryStore(): Store {
  return new LocalStore(new MemoryKV());
}

/** The browser-only store; backend.ts decides whether the app uses it. */
export const localStore: Store = new LocalStore();

export function newId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* insecure context */
  }
  // Still a v4 UUID, so ids fit the database's uuid columns.
  const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16));
  hex[12] = "4";
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const h = hex.join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
