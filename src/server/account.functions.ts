import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const deletionRequestSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "cancelled", "completed"]),
  requested_at: z.string(),
  cancelled_at: z.string().nullable(),
  completed_at: z.string().nullable(),
});

const noStore = () => {
  setResponseHeaders(
    new Headers({
      "Cache-Control": "private, no-store",
      Vary: "Cookie, Authorization",
    }),
  );
};

export const getAccountDeletionRequestFn = createServerFn({ method: "GET" }).handler(async () => {
  noStore();
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return null;

  const { data, error } = await supabase.rpc("get_my_account_deletion_request");
  if (error || !data) return null;

  const parsed = deletionRequestSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
});

export const requestAccountDeletionFn = createServerFn({ method: "POST" }).handler(async () => {
  noStore();
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false as const,
      code: "not_configured" as const,
      message: "Account controls are not configured for this environment yet.",
    };
  }

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return {
      ok: false as const,
      code: "unauthenticated" as const,
      message: "Sign in before changing account deletion settings.",
    };
  }

  const { data, error } = await supabase.rpc("request_account_deletion");
  if (error) {
    const activeActivity = error.message.toLowerCase().includes("active marketplace activity");
    return {
      ok: false as const,
      code: activeActivity ? "active_activity" as const : "request_failed" as const,
      message: activeActivity
        ? "Resolve active bookings before requesting account deletion."
        : "The deletion request could not be created. Please try again.",
    };
  }

  return {
    ok: true as const,
    requestId: String(data),
    message: "Your account deletion request has been recorded for Trust Operations review.",
  };
});

export const cancelAccountDeletionFn = createServerFn({ method: "POST" }).handler(async () => {
  noStore();
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false as const,
      message: "Account controls are not configured for this environment yet.",
    };
  }

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return { ok: false as const, message: "Sign in before changing account deletion settings." };
  }

  const { data, error } = await supabase.rpc("cancel_account_deletion");
  if (error) {
    return { ok: false as const, message: "The deletion request could not be cancelled." };
  }

  if (!data) {
    return { ok: false as const, message: "There is no pending deletion request to cancel." };
  }

  return { ok: true as const, message: "Your account deletion request has been cancelled." };
});
