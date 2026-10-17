import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const slug = z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const currency = z.string().trim().length(3).transform((value) => value.toUpperCase());
const noStore = () => setResponseHeaders(new Headers({ "Cache-Control": "private, no-store", Vary: "Cookie, Authorization" }));
const publicCache = () => setResponseHeaders(new Headers({ "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" }));

const providerSchema = z.object({
  slug,
  displayName: z.string().trim().min(2).max(120),
  headline: z.string().trim().min(5).max(180),
  description: z.string().trim().max(10_000).default(""),
  countryCode: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  locality: z.string().trim().min(2).max(160),
});

const providerUpdateSchema = providerSchema.omit({ slug: true }).extend({ providerId: uuid });

const serviceSchema = z.object({
  providerId: uuid,
  categorySlug: z.string().trim().min(2).max(80),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(10_000),
  startingPriceMinor: z.number().int().nonnegative().optional(),
  currency,
});

const providerRecordSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  display_name: z.string(),
  headline: z.string(),
  description: z.string(),
  country_code: z.string(),
  locality: z.string(),
  status: z.enum(["draft", "active", "paused", "suspended"]),
  identity_status: z.enum(["unverified", "pending", "verified", "failed", "expired"]),
  business_status: z.enum(["unverified", "pending", "verified", "failed", "expired"]),
  trust_score: z.coerce.number(),
  rating: z.coerce.number().nullable(),
  review_count: z.coerce.number(),
  completed_jobs: z.coerce.number(),
  response_minutes: z.coerce.number().nullable(),
});

const publicProfileSchema = z.object({
  provider: z.object({
    id: z.string().uuid(),
    slug: z.string(),
    display_name: z.string(),
    headline: z.string(),
    description: z.string(),
    country_code: z.string(),
    locality: z.string(),
    identity_status: z.string(),
    business_status: z.string(),
    trust_score: z.coerce.number(),
    rating: z.coerce.number().nullable(),
    review_count: z.coerce.number(),
    completed_jobs: z.coerce.number(),
    response_minutes: z.coerce.number().nullable(),
  }),
  services: z.array(z.object({
    id: z.string().uuid(),
    category_slug: z.string(),
    title: z.string(),
    description: z.string(),
    starting_price_minor: z.coerce.number().nullable(),
    currency: z.string(),
  })),
  reviews: z.array(z.object({
    id: z.string().uuid(),
    rating: z.coerce.number(),
    body: z.string(),
    verified_booking: z.boolean(),
    created_at: z.string(),
  })),
});

const myServiceSchema = z.object({
  id: z.string().uuid(),
  provider_id: z.string().uuid(),
  category_slug: z.string(),
  title: z.string(),
  description: z.string(),
  starting_price_minor: z.coerce.number().nullable(),
  currency: z.string(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

async function requireUser() {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { supabase: null, userId: null } as const;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, userId: null } as const;
  return { supabase, userId: data.user.id } as const;
}

export const getPublicProviderProfileFn = createServerFn({ method: "GET" })
  .validator(z.object({ slug }))
  .handler(async ({ data }) => {
    publicCache();
    const supabase = getSupabaseServerClient();
    if (!supabase) return { configured: false as const, profile: null };

    const { data: profile, error } = await supabase.rpc("get_public_provider_profile", {
      p_slug: data.slug,
    });
    if (error || profile == null) return { configured: true as const, profile: null };

    const parsed = publicProfileSchema.safeParse(profile);
    return {
      configured: true as const,
      profile: parsed.success ? parsed.data : null,
    };
  });

export const getMyProviderProfileFn = createServerFn({ method: "GET" }).handler(async () => {
  noStore();
  const auth = await requireUser();
  if (!auth.userId || !auth.supabase) return null;

  const { data, error } = await auth.supabase.rpc("get_my_provider_profile");
  if (error || data == null) return null;

  const parsed = providerRecordSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
});

export const getMyProviderServicesFn = createServerFn({ method: "GET" }).handler(async () => {
  noStore();
  const auth = await requireUser();
  if (!auth.userId || !auth.supabase) return [];

  const { data: profileData, error: profileError } = await auth.supabase.rpc("get_my_provider_profile");
  const profile = providerRecordSchema.safeParse(profileData);
  if (profileError || !profile.success) return [];

  const { data, error } = await auth.supabase
    .from("services")
    .select("id,provider_id,category_slug,title,description,starting_price_minor,currency,is_active,created_at,updated_at")
    .eq("provider_id", profile.data.id)
    .order("created_at", { ascending: false });

  if (error) return [];
  const parsed = z.array(myServiceSchema).safeParse(data ?? []);
  return parsed.success ? parsed.data : [];
});

export const bootstrapProviderProfileFn = createServerFn({ method: "POST" })
  .validator(providerSchema)
  .handler(async ({ data }) => {
    noStore();
    const auth = await requireUser();
    if (!auth.userId || !auth.supabase) return { ok: false as const, message: "Sign in before creating a professional profile." };

    const { data: providerId, error } = await auth.supabase.rpc("bootstrap_provider_profile", {
      p_slug: data.slug,
      p_display_name: data.displayName,
      p_headline: data.headline,
      p_description: data.description,
      p_country_code: data.countryCode,
      p_locality: data.locality,
    });

    if (error || typeof providerId !== "string") {
      return { ok: false as const, message: "We could not create that professional profile. The slug may already be in use." };
    }

    return { ok: true as const, providerId };
  });

export const updateMyProviderProfileFn = createServerFn({ method: "POST" })
  .validator(providerUpdateSchema)
  .handler(async ({ data }) => {
    noStore();
    const auth = await requireUser();
    if (!auth.userId || !auth.supabase) return { ok: false as const, message: "Sign in to edit your profile." };

    const { error } = await auth.supabase.rpc("update_my_provider_profile", {
      p_provider_id: data.providerId,
      p_display_name: data.displayName,
      p_headline: data.headline,
      p_description: data.description,
      p_country_code: data.countryCode,
      p_locality: data.locality,
    });

    if (error) return { ok: false as const, message: "The profile could not be updated." };
    return { ok: true as const };
  });

export const createProviderServiceFn = createServerFn({ method: "POST" })
  .validator(serviceSchema)
  .handler(async ({ data }) => {
    noStore();
    const auth = await requireUser();
    if (!auth.userId || !auth.supabase) return { ok: false as const, message: "Sign in to add a service." };

    const { data: serviceId, error } = await auth.supabase.rpc("create_provider_service", {
      p_provider_id: data.providerId,
      p_category_slug: data.categorySlug,
      p_title: data.title,
      p_description: data.description,
      p_starting_price_minor: data.startingPriceMinor ?? null,
      p_currency: data.currency,
    });

    if (error || typeof serviceId !== "string") {
      return { ok: false as const, message: "The service could not be created." };
    }
    return { ok: true as const, serviceId };
  });

export const setProviderServiceActiveFn = createServerFn({ method: "POST" })
  .validator(z.object({ serviceId: uuid, active: z.boolean() }))
  .handler(async ({ data }) => {
    noStore();
    const auth = await requireUser();
    if (!auth.userId || !auth.supabase) return { ok: false as const, message: "Sign in to manage this service." };

    const { error } = await auth.supabase.rpc("set_provider_service_active", {
      p_service_id: data.serviceId,
      p_active: data.active,
    });
    if (error) return { ok: false as const, message: data.active ? "The service cannot be published yet." : "The service could not be unpublished." };
    return { ok: true as const };
  });

export const submitProviderForReviewFn = createServerFn({ method: "POST" })
  .validator(z.object({ providerId: uuid }))
  .handler(async ({ data }) => {
    noStore();
    const auth = await requireUser();
    if (!auth.userId || !auth.supabase) return { ok: false as const, message: "Sign in to submit your profile." };

    const { error } = await auth.supabase.rpc("submit_provider_for_review", {
      p_provider_id: data.providerId,
    });
    if (error) return { ok: false as const, message: "Add at least one service and make sure the profile is eligible for review." };
    return { ok: true as const };
  });
