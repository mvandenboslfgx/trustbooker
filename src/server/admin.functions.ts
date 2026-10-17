import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const roleSchema = z.enum(["buyer", "provider", "admin", "moderator", "support"]);
const providerDecisionSchema = z.enum(["approve", "reject", "suspend"]);
const reviewDecisionSchema = z.enum(["publish", "hide", "remove"]);
const noStore = () => setResponseHeaders(new Headers({ "Cache-Control": "private, no-store", Vary: "Cookie, Authorization" }));

const providerReviewQueueSchema = z.array(z.object({
  id: uuid,
  slug: z.string(),
  display_name: z.string(),
  headline: z.string(),
  description: z.string(),
  country_code: z.string(),
  locality: z.string(),
  identity_status: z.string(),
  business_status: z.string(),
  status: z.string(),
  created_at: z.string(),
  service_count: z.coerce.number(),
}));

const pendingReviewSchema = z.array(z.object({
  id: uuid,
  booking_id: uuid,
  provider_id: uuid,
  provider_name: z.string(),
  rating: z.coerce.number(),
  body: z.string(),
  status: z.string(),
  created_at: z.string(),
}));

async function getAuthenticatedClient() {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return supabase;
}

async function hasStaffRole(supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>) {
  const { data: roles, error } = await supabase.rpc("get_my_roles");
  const parsed = z.array(roleSchema).safeParse(roles ?? []);
  return !error && parsed.success && parsed.data.some((role) => role === "admin" || role === "moderator");
}

export const getMyRolesFn = createServerFn({ method: "GET" }).handler(async () => {
  noStore();
  const supabase = await getAuthenticatedClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("get_my_roles");
  if (error) return [];
  const parsed = z.array(roleSchema).safeParse(data ?? []);
  return parsed.success ? parsed.data : [];
});

export const getProviderReviewQueueFn = createServerFn({ method: "GET" }).handler(async () => {
  noStore();
  const supabase = await getAuthenticatedClient();
  if (!supabase) return { authorized: false as const, providers: [] };
  if (!(await hasStaffRole(supabase))) return { authorized: false as const, providers: [] };

  const { data, error } = await supabase.rpc("list_provider_review_queue");
  if (error) return { authorized: true as const, providers: [] };
  const parsed = providerReviewQueueSchema.safeParse(data ?? []);
  return { authorized: true as const, providers: parsed.success ? parsed.data : [] };
});

export const getPendingReviewsFn = createServerFn({ method: "GET" }).handler(async () => {
  noStore();
  const supabase = await getAuthenticatedClient();
  if (!supabase) return { authorized: false as const, reviews: [] };
  if (!(await hasStaffRole(supabase))) return { authorized: false as const, reviews: [] };

  const { data, error } = await supabase.rpc("list_pending_reviews");
  if (error) return { authorized: true as const, reviews: [] };
  const parsed = pendingReviewSchema.safeParse(data ?? []);
  return { authorized: true as const, reviews: parsed.success ? parsed.data : [] };
});

export const moderateProviderFn = createServerFn({ method: "POST" })
  .validator(z.object({ providerId: uuid, decision: providerDecisionSchema }))
  .handler(async ({ data }) => {
    noStore();
    const supabase = await getAuthenticatedClient();
    if (!supabase) return { ok: false as const, message: "Staff authentication required." };

    const { error } = await supabase.rpc("moderate_provider", {
      p_provider_id: data.providerId,
      p_decision: data.decision,
    });

    if (error) return { ok: false as const, message: "Moderation was rejected or the provider is no longer eligible." };
    return { ok: true as const };
  });

export const moderateReviewFn = createServerFn({ method: "POST" })
  .validator(z.object({ reviewId: uuid, decision: reviewDecisionSchema }))
  .handler(async ({ data }) => {
    noStore();
    const supabase = await getAuthenticatedClient();
    if (!supabase) return { ok: false as const, message: "Staff authentication required." };

    const { error } = await supabase.rpc("moderate_review", {
      p_review_id: data.reviewId,
      p_decision: data.decision,
    });

    if (error) return { ok: false as const, message: "Review moderation was rejected or the booking is not eligible." };
    return { ok: true as const };
  });
