import { describe, expect, it } from "vitest";
import { toAuthError } from "./supabase-backend";

describe("toAuthError", () => {
  it("maps Supabase auth errors to form fields and friendly messages", () => {
    expect(toAuthError({ code: "user_already_exists", message: "User already registered" })).toMatchObject({
      field: "email",
      message: "An account with this email already exists.",
    });
    expect(toAuthError({ code: "invalid_credentials", message: "Invalid login credentials" })).toMatchObject({
      field: "password",
      message: "Email or password is incorrect.",
    });
    expect(toAuthError({ code: "weak_password", message: "Password should be at least 8 characters." }).field).toBe("password");
    expect(toAuthError({ code: "over_email_send_rate_limit", message: "email rate limit exceeded" }).message).toMatch(/Too many attempts/);
  });

  it("falls back to the original message without a field", () => {
    const e = toAuthError({ code: undefined, message: "Database error saving new user" });
    expect(e.message).toBe("Database error saving new user");
    expect(e.field).toBeUndefined();
  });
});
