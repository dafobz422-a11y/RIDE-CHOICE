import { describe, expect, it } from "vitest";
import { login, logout, currentUser, signup, validateSignup } from "./auth";
import { createMemoryStore, LocalStore, newId } from "./store";
import { DEFAULT_PREFERENCES } from "./prefs";

describe("LocalStore", () => {
  it("falls back to memory when localStorage is unavailable (node)", async () => {
    const s = new LocalStore();
    await s.savePreferences("u1", DEFAULT_PREFERENCES);
    expect(await s.getPreferences("u1")).toEqual(DEFAULT_PREFERENCES);
  });

  it("survives a backend that throws on every call", async () => {
    const broken = {
      get: () => {
        throw new Error("boom");
      },
      set: () => {
        throw new Error("boom");
      },
      remove: () => {
        throw new Error("boom");
      },
      keys: () => {
        throw new Error("boom");
      },
    };
    const s = new LocalStore(broken);
    await expect(s.getSession()).resolves.toBeNull();
    await expect(s.savePreferences("u", DEFAULT_PREFERENCES)).resolves.toBeUndefined();
    await expect(s.reset()).resolves.toBeUndefined();
  });

  it("tolerates corrupt JSON", async () => {
    const kv = new Map<string, string>([["ridechoice:v1:bookings", "{not json"]]);
    const s = new LocalStore({
      get: (k) => kv.get(k) ?? null,
      set: (k, v) => void kv.set(k, v),
      remove: (k) => void kv.delete(k),
      keys: () => [...kv.keys()],
    });
    expect(await s.listBookings("u")).toEqual([]);
  });

  it("reset clears everything", async () => {
    const s = createMemoryStore();
    await s.setSession({ userId: "u", createdAt: "x" });
    await s.saveDraft("u", { pickup: "a", dropoff: "b" });
    await s.reset();
    expect(await s.getSession()).toBeNull();
    expect(await s.getDraft("u")).toBeNull();
  });
});

describe("auth", () => {
  const input = { name: "Ada Rider", email: "Ada@Example.com", password: "ride1234" };

  it("signs up with a hashed password and starts a session", async () => {
    const s = createMemoryStore();
    const user = await signup(s, input);
    expect(user.email).toBe("ada@example.com");
    expect(user).not.toHaveProperty("passwordHash");
    const stored = await s.findUserByEmail("ada@example.com");
    expect(stored?.passwordHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored?.passwordHash).not.toContain("ride1234");
    expect((await currentUser(s))?.id).toBe(user.id);
  });

  it("rejects duplicate emails and wrong passwords", async () => {
    const s = createMemoryStore();
    await signup(s, input);
    await expect(signup(s, input)).rejects.toThrow(/already exists/);
    await logout(s);
    expect(await currentUser(s)).toBeNull();
    await expect(login(s, "ada@example.com", "wrong1234")).rejects.toThrow(/incorrect/);
    await expect(login(s, "nobody@example.com", "ride1234")).rejects.toThrow(/incorrect/);
    const u = await login(s, "ADA@example.com", "ride1234");
    expect(u.name).toBe("Ada Rider");
  });

  it("validates signup fields", () => {
    expect(validateSignup({ name: "A", email: "nope", password: "short" })).toEqual({
      name: expect.any(String),
      email: expect.any(String),
      password: expect.any(String),
    });
    expect(validateSignup({ name: "Al", email: "a@b.co", password: "letters only" }).password).toMatch(/number/);
    expect(validateSignup(input)).toEqual({});
  });
});

describe("newId", () => {
  it("returns a v4 UUID, with or without crypto.randomUUID", () => {
    const re = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(newId()).toMatch(re);
    const original = globalThis.crypto.randomUUID;
    try {
      // Simulate an insecure context, where randomUUID is unavailable.
      Object.defineProperty(globalThis.crypto, "randomUUID", { value: undefined, configurable: true });
      for (let i = 0; i < 20; i++) expect(newId()).toMatch(re);
    } finally {
      Object.defineProperty(globalThis.crypto, "randomUUID", { value: original, configurable: true });
    }
  });
});
