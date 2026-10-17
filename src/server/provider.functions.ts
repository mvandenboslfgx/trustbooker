import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const slug = z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const noStore = () => setResponseHeaders(new Headers({ "Cache-Control": "private, no-store", Vary: "Cookie, Authorization" }));

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
  trust_score: z.number(),
  rating: z.number().nullable(),
  review_count: z.number(),
  completed_jobs: z.number(),
  response_minutes: z.number().nullable(),
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
