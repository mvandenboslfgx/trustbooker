import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z
  .object({
    category: z.string().trim().min(2).max(80),
    title: z.string().trim().min(5).max(180),
    description: z.string().trim().min(20).max(10_000),
    countryCode: z.string().trim().length(2).transform((value) => value.toUpperCase()),
    locality: z.string().trim().min(2).max(160),
    budgetMinMinor: z.number().int().nonnegative().optional(),
    budgetMaxMinor: z.number().int().nonnegative().optional(),
  })
  .refine(
    (value) =>
      value.budgetMinMinor == null ||
      value.budgetMaxMinor == null ||
      value.budgetMaxMinor >= value.budgetMinMinor,
    { message: "Maximum budget must be greater than or equal to minimum budget." },
  );

const noStore = () => {
  setResponseHeaders(
    new Headers({
      "Cache-Control": "private, no-store",
      Vary: "Cookie, Authorization",
    }),
  );
};

export const createServiceRequestFn = createServerFn({ method: "POST" })
  .validator(requestSchema)
  .handler(async ({ data }) => {
    noStore();
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return {
        ok: false as const,
        code: "not_configured" as const,
        message: "Marketplace writes are not configured for this environment yet.",
      };
    }

    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      return {
        ok: false as const,
        code: "unauthenticated" as const,
        message: "Sign in before posting a job.",
      };
    }

    const { data: launch, error: launchError } = await supabase
      .from("country_launches")
      .select("requests_enabled")
      .eq("country_code", data.countryCode)
      .maybeSingle();

    if (launchError) {
      return {
        ok: false as const,
        code: "market_check_failed" as const,
        message: "We could not verify marketplace availability. Please try again.",
      };
    }

    if (!launch?.requests_enabled) {
      return {
        ok: false as const,
        code: "market_closed" as const,
        message: "Job requests are not open in that country yet.",
      };
    }

    const { data: created, error } = await supabase
      .from("service_requests")
      .insert({
        category_slug: data.category,
        title: data.title,
        description: data.description,
        country_code: data.countryCode,
        locality: data.locality,
        budget_min_minor: data.budgetMinMinor ?? null,
        budget_max_minor: data.budgetMaxMinor ?? null,
      })
      .select("id,status")
      .single();

    if (error || !created) {
      return {
        ok: false as const,
        code: "request_failed" as const,
        message: "We could not post that job. Please check the details and try again.",
      };
    }

    return {
      ok: true as const,
      requestId: created.id,
      status: created.status,
    };
  });

export const getDashboardSummaryFn = createServerFn({ method: "GET" }).handler(async () => {
  noStore();
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return null;

  const [requests, activeBookings, completedBookings] = await Promise.all([
    supabase
      .from("service_requests")
      .select("id", { count: "exact", head: true })
      .in("status", ["draft", "open", "matched"]),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .in("status", ["accepted", "payment_pending", "booked", "in_progress", "disputed"]),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed"),
  ]);

  if (requests.error || activeBookings.error || completedBookings.error) return null;

  return {
    openRequests: requests.count ?? 0,
    activeBookings: activeBookings.count ?? 0,
    completedBookings: completedBookings.count ?? 0,
  };
});
