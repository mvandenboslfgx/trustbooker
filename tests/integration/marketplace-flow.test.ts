import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const apiUrl = process.env.API_URL ?? process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey = process.env.ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!anonKey || !serviceRoleKey) {
  throw new Error(
    "Integration tests require ANON_KEY/SUPABASE_ANON_KEY and SERVICE_ROLE_KEY/SUPABASE_SERVICE_ROLE_KEY from a running local Supabase stack.",
  );
}

const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
} as const;

const service = createClient(apiUrl, serviceRoleKey, clientOptions);
const publicClient = createClient(apiUrl, anonKey, clientOptions);

let buyer: SupabaseClient;
let provider: SupabaseClient;
let buyerId = "";
let providerId = "";
let providerProfileId = "";
let requestId = "";
let proposalId = "";
let bookingId = "";

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const password = `TrustBooker-${runId}-Aa1!`;

async function createAuthenticatedClient(kind: "buyer" | "provider") {
  const email = `${kind}-${runId}@example.test`;
  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `${kind} ${runId}` },
  });

  expect(createError).toBeNull();
  expect(created.user).not.toBeNull();

  const client = createClient(apiUrl, anonKey, clientOptions);
  const { data: signedIn, error: signInError } = await client.auth.signInWithPassword({ email, password });

  expect(signInError).toBeNull();
  expect(signedIn.user?.id).toBe(created.user!.id);

  return { client, userId: created.user!.id };
}

beforeAll(async () => {
  const buyerAccount = await createAuthenticatedClient("buyer");
  buyer = buyerAccount.client;
  buyerId = buyerAccount.userId;

  const providerAccount = await createAuthenticatedClient("provider");
  provider = providerAccount.client;
  providerId = providerAccount.userId;

  const { data: profile, error: profileError } = await service
    .from("provider_profiles")
    .insert({
      owner_user_id: providerId,
      slug: `integration-provider-${runId}`,
      display_name: "Integration Provider",
      headline: "Verified integration testing provider",
      description: "A provider created only inside the disposable local integration database.",
      country_code: "GB",
      locality: "London",
      status: "active",
      identity_status: "verified",
      business_status: "verified",
    })
    .select("id")
    .single();

  expect(profileError).toBeNull();
  providerProfileId = profile!.id;
});

describe("local Supabase marketplace flow", () => {
  it("bootstraps every auth user with a private profile and buyer role", async () => {
    const { data: profile, error: profileError } = await buyer
      .from("profiles")
      .select("id,display_name")
      .eq("id", buyerId)
      .single();

    expect(profileError).toBeNull();
    expect(profile?.id).toBe(buyerId);

    const { data: roles, error: rolesError } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", buyerId);

    expect(rolesError).toBeNull();
    expect(roles?.map((row) => row.role)).toContain("buyer");
  });

  it("prevents authenticated users from self-promoting to staff", async () => {
    const { error } = await buyer.from("user_roles").insert({ user_id: buyerId, role: "admin" });
    expect(error).not.toBeNull();
  });

  it("enforces country discovery gates at RLS level", async () => {
    const closedSlug = `closed-provider-${runId}`;
    const { error: insertError } = await service.from("provider_profiles").insert({
      owner_user_id: providerId,
      slug: closedSlug,
      display_name: "Closed Market Provider",
      headline: "Provider in a market that is not launched",
      description: "This row must remain invisible to anonymous marketplace discovery.",
      country_code: "NL",
      locality: "Amsterdam",
      status: "active",
    });
    expect(insertError).toBeNull();

    const { data, error } = await publicClient
      .from("provider_profiles")
      .select("slug")
      .eq("slug", closedSlug);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("creates a request and proposal through authenticated least-privilege clients", async () => {
    const { data: request, error: requestError } = await buyer
      .from("service_requests")
      .insert({
        category_slug: "home-cleaning",
        title: "Integration test cleaning request",
        description: "This request validates the buyer to provider marketplace transaction path.",
        country_code: "GB",
        locality: "London",
        budget_min_minor: 10_000,
        budget_max_minor: 20_000,
      })
      .select("id")
      .single();

    expect(requestError).toBeNull();
    requestId = request!.id;

    const { data: proposal, error: proposalError } = await provider
      .from("proposals")
      .insert({
        request_id: requestId,
        provider_id: providerProfileId,
        amount_minor: 12_345,
        currency: "GBP",
        message: "Integration proposal for the requested work.",
      })
      .select("id")
      .single();

    expect(proposalError).toBeNull();
    proposalId = proposal!.id;
  });

  it("creates exactly one booking with the server-calculated 10% fee", async () => {
    expect(proposalId).not.toBe("");

    const first = await buyer.rpc("accept_proposal_and_create_booking", {
      p_proposal_id: proposalId,
    });
    expect(first.error).toBeNull();
    expect(typeof first.data).toBe("string");
    bookingId = first.data as string;

    const retry = await buyer.rpc("accept_proposal_and_create_booking", {
      p_proposal_id: proposalId,
    });
    expect(retry.error).toBeNull();
    expect(retry.data).toBe(bookingId);

    const { data: booking, error: bookingError } = await buyer
      .from("bookings")
      .select("id,buyer_id,subtotal_minor,marketplace_fee_minor,currency,status")
      .eq("id", bookingId)
      .single();

    expect(bookingError).toBeNull();
    expect(booking).toMatchObject({
      id: bookingId,
      buyer_id: buyerId,
      subtotal_minor: 12_345,
      marketplace_fee_minor: 1_235,
      currency: "GBP",
      status: "accepted",
    });

    const { count, error: countError } = await service
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("proposal_id", proposalId);

    expect(countError).toBeNull();
    expect(count).toBe(1);
  });

  it("blocks direct client manipulation of booking money state", async () => {
    const { error } = await buyer.from("bookings").insert({
      buyer_id: buyerId,
      provider_id: providerProfileId,
      request_id: requestId,
      subtotal_minor: 1,
      marketplace_fee_minor: 0,
      currency: "GBP",
      status: "completed",
    });

    expect(error).not.toBeNull();
  });

  it("keeps financial evidence inaccessible to browser roles", async () => {
    const { error } = await buyer.from("financial_events").insert({
      booking_id: bookingId,
      event_type: "client.forged_payment",
      amount_minor: 12_345,
      currency: "GBP",
    });

    expect(error).not.toBeNull();
  });
});
