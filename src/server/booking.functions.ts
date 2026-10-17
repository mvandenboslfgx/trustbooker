import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const bookingStatus = z.enum([
  "draft",
  "awaiting_provider",
  "accepted",
  "payment_pending",
  "booked",
  "in_progress",
  "completion_pending",
  "completed",
  "disputed",
  "cancelled",
]);
const bookingAction = z.enum(["start_work", "request_completion", "confirm_completion", "cancel"]);
const noStore = () => setResponseHeaders(new Headers({ "Cache-Control": "private, no-store", Vary: "Cookie, Authorization" }));

const bookingListSchema = z.array(z.object({
  id: uuid,
  status: bookingStatus,
  subtotal_minor: z.coerce.number(),
  marketplace_fee_minor: z.coerce.number(),
  currency: z.string(),
  provider_id: uuid,
  buyer_id: uuid,
  created_at: z.string(),
  updated_at: z.string(),
}));

const bookingScopeSchema = z.object({
  request_title: z.string().optional(),
  request_description: z.string().optional(),
  proposal_message: z.string().optional(),
  accepted_at: z.string().optional(),
});

const workspaceSchema = z.object({
  actor_role: z.enum(["buyer", "provider"]),
  booking: z.object({
    id: uuid,
    status: bookingStatus,
    subtotal_minor: z.coerce.number(),
    marketplace_fee_minor: z.coerce.number(),
    currency: z.string(),
    scope_snapshot: bookingScopeSchema,
    created_at: z.string(),
    updated_at: z.string(),
  }),
  provider: z.object({
    id: uuid,
    slug: z.string(),
    display_name: z.string(),
    headline: z.string(),
    trust_score: z.coerce.number(),
    rating: z.coerce.number().nullable(),
  }),
  conversation_id: uuid.nullable(),
  messages: z.array(z.object({
    id: z.coerce.number(),
    sender_user_id: uuid,
    body: z.string(),
    created_at: z.string(),
  })),
  dispute: z.object({
    id: uuid,
    status: z.string(),
    reason: z.string(),
    resolution_note: z.string().nullable(),
    created_at: z.string(),
    resolved_at: z.string().nullable(),
  }).nullable(),
});

async function requireUser() {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return supabase;
}

export const getMyBookingsFn = createServerFn({ method: "GET" }).handler(async () => {
  noStore();
  const supabase = await requireUser();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("bookings")
    .select("id,status,subtotal_minor,marketplace_fee_minor,currency,provider_id,buyer_id,created_at,updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) return [];
  const parsed = bookingListSchema.safeParse(data ?? []);
  return parsed.success ? parsed.data : [];
});

export const getBookingWorkspaceFn = createServerFn({ method: "GET" })
  .validator(z.object({ bookingId: uuid }))
  .handler(async ({ data }) => {
    noStore();
    const supabase = await requireUser();
    if (!supabase) return null;
    const { data: workspace, error } = await supabase.rpc("get_booking_workspace", {
      p_booking_id: data.bookingId,
    });
    if (error || workspace == null) return null;
    const parsed = workspaceSchema.safeParse(workspace);
    return parsed.success ? parsed.data : null;
  });

export const transitionBookingFn = createServerFn({ method: "POST" })
  .validator(z.object({ bookingId: uuid, action: bookingAction }))
  .handler(async ({ data }) => {
    noStore();
    const supabase = await requireUser();
    if (!supabase) return { ok: false as const, message: "Sign in to manage this booking." };
    const { data: status, error } = await supabase.rpc("transition_booking", {
      p_booking_id: data.bookingId,
      p_action: data.action,
    });
    const parsed = bookingStatus.safeParse(status);
    if (error || !parsed.success) return { ok: false as const, message: "This booking action is not allowed in its current state." };
    return { ok: true as const, status: parsed.data };
  });

export const openBookingDisputeFn = createServerFn({ method: "POST" })
  .validator(z.object({ bookingId: uuid, reason: z.string().trim().min(10).max(5_000) }))
  .handler(async ({ data }) => {
    noStore();
    const supabase = await requireUser();
    if (!supabase) return { ok: false as const, message: "Sign in to open a dispute." };
    const { data: disputeId, error } = await supabase.rpc("open_booking_dispute", {
      p_booking_id: data.bookingId,
      p_reason: data.reason,
    });
    if (error || typeof disputeId !== "string") return { ok: false as const, message: "A dispute cannot be opened for this booking or market yet." };
    return { ok: true as const, disputeId };
  });
