import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

const apiUrl = process.env.API_URL ?? process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey = process.env.ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!anonKey || !serviceRoleKey) {
  throw new Error("Rate-limit integration tests require local Supabase anon and service-role keys.");
}

const options = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
} as const;

const service = createClient(apiUrl, serviceRoleKey, options);

describe("authenticated write rate limits", () => {
  it("allows the configured report allowance and blocks the next write", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const email = `rate-limit-${suffix}@example.test`;
    const password = `TrustBooker-${suffix}-Aa1!`;

    const { data: created, error: createError } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: `Rate Limit ${suffix}` },
    });

    expect(createError).toBeNull();
    expect(created.user).not.toBeNull();

    const client = createClient(apiUrl, anonKey, options);
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    expect(signInError).toBeNull();

    const allowedRows = Array.from({ length: 20 }, (_, index) => ({
      target_type: "user",
      target_id: `integration-rate-target-${suffix}-${index}`,
      reason: "Integration abuse-control verification report.",
    }));

    const { error: allowedError } = await client.from("reports").insert(allowedRows);
    expect(allowedError).toBeNull();

    const { error: blockedError } = await client.from("reports").insert({
      target_type: "user",
      target_id: `integration-rate-target-${suffix}-blocked`,
      reason: "This report must be rejected by the database rate limiter.",
    });

    expect(blockedError).not.toBeNull();
    expect(blockedError?.message).toContain("rate limit exceeded");
  });
});
