import { newId, type Store } from "./store";
import type { PublicUser, User } from "./types";

export class AuthError extends Error {
  constructor(
    message: string,
    public field?: "name" | "email" | "password",
  ) {
    super(message);
  }
}

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256(input: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new AuthError("Secure crypto is unavailable in this browser.");
  return toHex(await subtle.digest("SHA-256", new TextEncoder().encode(input)));
}

export function hashPassword(password: string, salt: string): Promise<string> {
  return sha256(`${salt}:${password}`);
}

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SignupInput {
  name: string;
  email: string;
  password: string;
}

export function validateSignup(input: SignupInput): Partial<Record<keyof SignupInput, string>> {
  const errors: Partial<Record<keyof SignupInput, string>> = {};
  if (input.name.trim().length < 2) errors.name = "Enter your name (at least 2 characters).";
  if (!EMAIL_RE.test(input.email.trim())) errors.email = "Enter a valid email address.";
  if (input.password.length < 8) errors.password = "Use at least 8 characters.";
  else if (!/\d/.test(input.password) || !/[a-z]/i.test(input.password))
    errors.password = "Include at least one letter and one number.";
  return errors;
}

export function validateLogin(email: string, password: string) {
  const errors: { email?: string; password?: string } = {};
  if (!EMAIL_RE.test(email.trim())) errors.email = "Enter a valid email address.";
  if (!password) errors.password = "Enter your password.";
  return errors;
}

export function toPublic(user: User): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, salt, ...rest } = user;
  return rest;
}

export async function signup(store: Store, input: SignupInput): Promise<PublicUser> {
  const email = input.email.trim().toLowerCase();
  if (await store.findUserByEmail(email)) {
    throw new AuthError("An account with this email already exists.", "email");
  }
  const salt = randomSalt();
  const user: User = {
    id: newId(),
    name: input.name.trim(),
    email,
    salt,
    passwordHash: await hashPassword(input.password, salt),
    onboarded: false,
    createdAt: new Date().toISOString(),
  };
  await store.createUser(user);
  await store.setSession({ userId: user.id, createdAt: new Date().toISOString() });
  return toPublic(user);
}

export async function login(store: Store, email: string, password: string): Promise<PublicUser> {
  const user = await store.findUserByEmail(email);
  // Same message for unknown email and wrong password.
  if (!user || (await hashPassword(password, user.salt)) !== user.passwordHash) {
    throw new AuthError("Email or password is incorrect.", "password");
  }
  await store.setSession({ userId: user.id, createdAt: new Date().toISOString() });
  return toPublic(user);
}

export async function logout(store: Store): Promise<void> {
  await store.clearSession();
}

export async function currentUser(store: Store): Promise<PublicUser | null> {
  const session = await store.getSession();
  if (!session) return null;
  const user = await store.getUser(session.userId);
  return user ? toPublic(user) : null;
}

/**
 * What the UI needs from authentication. Implemented locally (browser-only
 * demo, below) and by Supabase Auth (src/lib/supabase-backend.ts).
 */
export interface AuthApi {
  kind: "local" | "supabase";
  signup(input: SignupInput): Promise<PublicUser>;
  login(email: string, password: string): Promise<PublicUser>;
  logout(): Promise<void>;
  currentUser(): Promise<PublicUser | null>;
  completeOnboarding(userId: string): Promise<void>;
  /** Emails a reset link that lands on `redirectTo`. */
  requestPasswordReset(email: string, redirectTo: string): Promise<void>;
  /** Sets a new password for the signed-in (or recovering) user. */
  updatePassword(password: string): Promise<void>;
}

export function localAuth(store: Store): AuthApi {
  return {
    kind: "local",
    signup: (input) => signup(store, input),
    login: (email, password) => login(store, email, password),
    logout: () => logout(store),
    currentUser: () => currentUser(store),
    async completeOnboarding(userId) {
      await store.updateUser(userId, { onboarded: true });
    },
    async requestPasswordReset() {
      throw new AuthError("Password reset needs the online version of RideChoice. In this demo, create a new account instead.", "email");
    },
    async updatePassword() {
      throw new AuthError("Password reset needs the online version of RideChoice.", "password");
    },
  };
}
