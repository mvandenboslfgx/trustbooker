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

async function createAuthenticatedClient(kind: "buyer" | "provider", suffix = "") {
  const email = `${kind}${suffix}-${runId}@example.test`;
  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `${kind}${suffix} ${runId}` },
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
      status: "booked",
    });

    const { count, error: countError } = await service
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("proposal_id", proposalId);

    expect(countError).toBeNull();
    expect(count).toBe(1);
  });

  it("blocks account deletion requests while marketplace activity is active", async () => {
    const { data, error } = await buyer.rpc("request_account_deletion");
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error?.message).toContain("active marketplace activity");
  });

  it("allows an idle user to request and cancel account deletion", async () => {
    const idle = await createAuthenticatedClient("buyer", "-idle");

    const requested = await idle.client.rpc("request_account_deletion");
    expect(requested.error).toBeNull();
    expect(typeof requested.data).toBe("string");

    const { data: pending, error: pendingError } = await idle.client
      .from("account_deletion_requests")
      .select("id,status,requested_at")
      .single();

    expect(pendingError).toBeNull();
    expect(pending?.status).toBe("pending");

    const cancelled = await idle.client.rpc("cancel_account_deletion");
    expect(cancelled.error).toBeNull();
    expect(cancelled.data).toBe(true);

    const { data: cancelledRow, error: cancelledError } = await idle.client
      .from("account_deletion_requests")
      .select("status,cancelled_at")
      .single();

    expect(cancelledError).toBeNull();
    expect(cancelledRow?.status).toBe("cancelled");
    expect(cancelledRow?.cancelled_at).toBeTruthy();
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

  it("prevents non-participants from reading a booking workspace or changing its state", async () => {
    const outsider = await createAuthenticatedClient("buyer", "-outsider");

    const outsiderView = await outsider.client.rpc("get_booking_workspace", {
      p_booking_id: bookingId,
    });
    expect(outsiderView.error).not.toBeNull();
    expect(outsiderView.data).toBeNull();

    const outsiderTransition = await outsider.client.rpc("transition_booking", {
      p_booking_id: bookingId,
      p_action: "start_work",
    });
    expect(outsiderTransition.error).not.toBeNull();

    const outsiderBookings = await outsider.client
      .from("bookings")
      .select("id")
      .eq("id", bookingId);
    expect(outsiderBookings.error).toBeNull();
    expect(outsiderBookings.data).toEqual([]);
  });

  it("creates a participant-only conversation and rejects outsider messages", async () => {
    const buyerView = await buyer.rpc("get_booking_workspace", { p_booking_id: bookingId });
    const providerView = await provider.rpc("get_booking_workspace", { p_booking_id: bookingId });

    expect(buyerView.error).toBeNull();
    expect(providerView.error).toBeNull();
    expect(buyerView.data?.actor_role).toBe("buyer");
    expect(providerView.data?.actor_role).toBe("provider");
    expect(buyerView.data?.conversation_id).toBeTruthy();
    expect(providerView.data?.conversation_id).toBe(buyerView.data?.conversation_id);

    const conversationId = buyerView.data.conversation_id as string;
    const outsider = await createAuthenticatedClient("buyer", "-chat-outsider");
    const outsiderRead = await outsider.client
      .from("messages").select("id").eq("conversation_id", conversationId);
    expect(outsiderRead.error).toBeNull();
    expect(outsiderRead.data).toEqual([]);

    const outsiderWrite = await outsider.client.from("messages").insert({
      conversation_id: conversationId,
      body: "Unauthorized message must never be accepted.",
    });
    expect(outsiderWrite.error).not.toBeNull();

    const sent = await buyer.from("messages").insert({
      conversation_id: conversationId,
      body: "Buyer has confirmed the agreed scope.",
    });
    expect(sent.error).toBeNull();

    const refreshed = await provider.rpc("get_booking_workspace", { p_booking_id: bookingId });
    expect(refreshed.error).toBeNull();
    expect(refreshed.data?.messages?.some((m: { body: string }) => m.body === "Buyer has confirmed the agreed scope.")).toBe(true);
  });

  it("requires provider start and buyer-confirmed completion, then allows exactly one review", async () => {
    const unauthorizedStart = await buyer.rpc("transition_booking", {
      p_booking_id: bookingId, p_action: "start_work",
    });
    expect(unauthorizedStart.error).not.toBeNull();

    const earlyReview = await buyer.from("reviews").insert({
      booking_id: bookingId,
      provider_id: providerProfileId,
      rating: 5,
      body: "This must be rejected before buyer-confirmed completion.",
    });
    expect(earlyReview.error).not.toBeNull();

    const started = await provider.rpc("transition_booking", {
      p_booking_id: bookingId, p_action: "start_work",
    });
    expect(started.error).toBeNull();
    expect(started.data).toBe("in_progress");

    const providerSelfConfirm = await provider.rpc("transition_booking", {
      p_booking_id: bookingId, p_action: "confirm_completion",
    });
    expect(providerSelfConfirm.error).not.toBeNull();

    const requested = await provider.rpc("transition_booking", {
      p_booking_id: bookingId, p_action: "request_completion",
    });
    expect(requested.error).toBeNull();
    expect(requested.data).toBe("completion_pending");

    const buyerCannotRequest = await buyer.rpc("transition_booking", {
      p_booking_id: bookingId, p_action: "request_completion",
    });
    expect(buyerCannotRequest.error).not.toBeNull();

    const confirmed = await buyer.rpc("transition_booking", {
      p_booking_id: bookingId, p_action: "confirm_completion",
    });
    expect(confirmed.error).toBeNull();
    expect(confirmed.data).toBe("completed");

    const repeatedConfirm = await buyer.rpc("transition_booking", {
      p_booking_id: bookingId, p_action: "confirm_completion",
    });
    expect(repeatedConfirm.error).not.toBeNull();

    const { data: providerTotals, error: totalsError } = await service
      .from("provider_profiles")
      .select("completed_jobs")
      .eq("id", providerProfileId)
      .single();
    expect(totalsError).toBeNull();
    expect(providerTotals?.completed_jobs).toBe(1);

    const submitted = await buyer.from("reviews").insert({
      booking_id: bookingId,
      provider_id: providerProfileId,
      rating: 5,
      body: "Work was completed and confirmed by the buyer.",
    }).select("id").single();
    expect(submitted.error).toBeNull();
    expect(submitted.data?.id).toBeTruthy();

    const publicReviews = await publicClient.from("reviews").select("id").eq("booking_id", bookingId);
    expect(publicReviews.error).toBeNull();
    expect(publicReviews.data).toEqual([]);

    const duplicate = await buyer.from("reviews").insert({
      booking_id: bookingId,
      provider_id: providerProfileId,
      rating: 4,
      body: "Duplicate submissions must be rejected for the same booking.",
    });
    expect(duplicate.error).not.toBeNull();

    const providerForgery = await provider.from("reviews").insert({
      booking_id: bookingId,
      provider_id: providerProfileId,
      rating: 5,
      body: "Providers must not be allowed to review their own bookings.",
    });
    expect(providerForgery.error).not.toBeNull();
  });

});
