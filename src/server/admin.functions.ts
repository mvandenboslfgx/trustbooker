import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const roleSchema = z.enum(["buyer", "provider", "admin", "moderator", "support"]);
const decisionSchema = z.enum(["approve", "reject", "suspend"]);
const noStore = () => setResponseHeaders(new Headers({ "Cache-Control": "private, no-store", Vary: "Cookie, Authorization" }));

const reviewQueueSchema = z.array(z.object({
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

async function getAuthenticatedClient() {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return supabase;
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

  const { data: roles, error: rolesError } = await supabase.rpc("get_my_roles");
  const parsedRoles = z.array(roleSchema).safeParse(roles ?? []);
  const authorized = !rolesError && parsedRoles.success && parsedRoles.data.some((role) => role === "admin" || role === "moderator");
  if (!authorized) return { authorized: false as const, providers: [] };

  const { data, error } = await supabase.rpc("list_provider_review_queue");
  if (error) return { authorized: true as const, providers: [] };
  const parsed = reviewQueueSchema.safeParse(data ?? []);
  return { authorized: true as const, providers: parsed.success ? parsed.data : [] };
});

export const moderateProviderFn = createServerFn({ method: "POST" })
  .validator(z.object({ providerId: uuid, decision: decisionSchema }))
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
