import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const slug = z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
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
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return null;

  const { data, error } = await supabase.rpc("get_my_provider_profile");
  if (error || data == null) return null;

  const parsed = providerRecordSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
});

export const bootstrapProviderProfileFn = createServerFn({ method: "POST" })
  .validator(providerSchema)
  .handler(async ({ data }) => {
    noStore();
    const supabase = getSupabaseServerClient();
    if (!supabase) return { ok: false as const, message: "Provider onboarding is not configured in this environment." };

    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) return { ok: false as const, message: "Sign in before creating a professional profile." };

    const { data: providerId, error } = await supabase.rpc("bootstrap_provider_profile", {
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
