import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const outcome = z.enum(["complete", "cancel"]);
const noStore = () => setResponseHeaders(new Headers({ "Cache-Control": "private, no-store", Vary: "Cookie, Authorization" }));

const disputeQueueSchema = z.array(z.object({
  id: uuid,
  booking_id: uuid,
  provider_id: uuid,
  provider_name: z.string(),
  buyer_id: uuid,
  opened_by: uuid,
  status: z.string(),
  reason: z.string(),
  booking_status: z.string(),
  subtotal_minor: z.coerce.number(),
  currency: z.string(),
  created_at: z.string(),
}));

async function authenticatedClient() {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return supabase;
}

export const getOpenDisputesFn = createServerFn({ method: "GET" }).handler(async () => {
  noStore();
  const supabase = await authenticatedClient();
  if (!supabase) return { authorized: false as const, disputes: [] };

  const { data, error } = await supabase.rpc("list_open_disputes");
  if (error) return { authorized: false as const, disputes: [] };
  const parsed = disputeQueueSchema.safeParse(data ?? []);
  return { authorized: true as const, disputes: parsed.success ? parsed.data : [] };
});

export const resolveDisputeFn = createServerFn({ method: "POST" })
  .validator(z.object({
    disputeId: uuid,
    outcome,
    resolutionNote: z.string().trim().min(10).max(5_000),
  }))
  .handler(async ({ data }) => {
    noStore();
    const supabase = await authenticatedClient();
    if (!supabase) return { ok: false as const, message: "Staff authentication required." };

    const { data: status, error } = await supabase.rpc("resolve_dispute", {
      p_dispute_id: data.disputeId,
      p_outcome: data.outcome,
      p_resolution_note: data.resolutionNote,
    });

    if (error || typeof status !== "string") {
      return { ok: false as const, message: "The dispute resolution was rejected or is no longer applicable." };
    }
    return { ok: true as const, status };
  });
