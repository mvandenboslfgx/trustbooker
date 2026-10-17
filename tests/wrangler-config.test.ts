import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const wrangler = JSON.parse(
  readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
);

describe("Cloudflare Worker runtime configuration", () => {
  it("keeps dashboard variables across source deployments", () => {
    expect(wrangler.keep_vars).toBe(true);
  });

  it("always points the deployed Worker at TrustBooker's own Supabase project", () => {
    expect(wrangler.vars.SUPABASE_URL).toBe("https://iwsyaljlmwnzuqjyolaj.supabase.co");
  });

  it("never checks the Supabase API key into Worker configuration", () => {
    expect(wrangler.vars).not.toHaveProperty("SUPABASE_ANON_KEY");
    expect(JSON.stringify(wrangler)).not.toMatch(/sb_(?:secret|publishable)_|service_role/i);
  });

  it("keeps the secure custom TanStack Start entrypoint", () => {
    expect(wrangler.main).toBe("src/server.ts");
  });
});
