import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const currency = z.string().trim().length(3).transform((value) => value.toUpperCase());

const noStore = () => {
  setResponseHeaders(new Headers({ "Cache-Control": "private, no-store", Vary: "Cookie, Authorization" }));
};

async function requireUser() {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { supabase: null, userId: null, error: "Marketplace services are not configured in this environment." } as const;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, userId: null, error: "Sign in to continue." } as const;
  return { supabase, userId: data.user.id, error: null } as const;
}

export const submitProposalFn = createServerFn({ method: "POST" })
  .validator(z.object({ requestId: uuid, providerId: uuid, amountMinor: z.number().int().nonnegative(), currency, message: z.string().trim().max(10_000).default("") }))
  .handler(async ({ data }) => {
    noStore();
    const auth = await requireUser();
    if (!auth.userId || !auth.supabase) return { ok: false as const, message: auth.error ?? "Not authorized." };

    const { data: proposal, error } = await auth.supabase
      .from("proposals")
      .insert({ request_id: data.requestId, provider_id: data.providerId, amount_minor: data.amountMinor, currency: data.currency, message: data.message })
      .select("id,status")
      .single();

    if (error || !proposal) return { ok: false as const, message: "The proposal could not be submitted." };
    return { ok: true as const, proposalId: proposal.id, status: proposal.status };
  });

export const acceptProposalFn = createServerFn({ method: "POST" })
  .validator(z.object({ proposalId: uuid }))
  .handler(async ({ data }) => {
    noStore();
    const auth = await requireUser();
    if (!auth.userId || !auth.supabase) return { ok: false as const, message: auth.error ?? "Not authorized." };

    const { data: bookingId, error } = await auth.supabase.rpc("accept_proposal_and_create_booking", {
      p_proposal_id: data.proposalId,
    });

    if (error || typeof bookingId !== "string") {
      return {
        ok: false as const,
        message: "This proposal could not be accepted. It may no longer be available or bookings may still be gated in your country.",
      };
    }

    return { ok: true as const, bookingId };
  });

export const submitReviewFn = createServerFn({ method: "POST" })
  .validator(z.object({ bookingId: uuid, providerId: uuid, rating: z.number().int().min(1).max(5), body: z.string().trim().min(10).max(5_000) }))
  .handler(async ({ data }) => {
    noStore();
    const auth = await requireUser();
    if (!auth.userId || !auth.supabase) return { ok: false as const, message: auth.error ?? "Not authorized." };

    const { data: review, error } = await auth.supabase
      .from("reviews")
      .insert({ booking_id: data.bookingId, provider_id: data.providerId, rating: data.rating, body: data.body })
      .select("id,status,verified_booking")
      .single();

    if (error || !review) return { ok: false as const, message: "The review could not be submitted. Only eligible completed bookings can be reviewed." };
    return { ok: true as const, reviewId: review.id, status: review.status };
  });

export const sendMessageFn = createServerFn({ method: "POST" })
  .validator(z.object({ conversationId: uuid, body: z.string().trim().min(1).max(10_000) }))
  .handler(async ({ data }) => {
    noStore();
    const auth = await requireUser();
    if (!auth.userId || !auth.supabase) return { ok: false as const, message: auth.error ?? "Not authorized." };

    const { data: message, error } = await auth.supabase
      .from("messages")
      .insert({ conversation_id: data.conversationId, body: data.body })
      .select("id,created_at")
      .single();

    if (error || !message) return { ok: false as const, message: "The message could not be sent." };
    return { ok: true as const, messageId: String(message.id), createdAt: message.created_at };
  });

export const submitReportFn = createServerFn({ method: "POST" })
  .validator(z.object({ targetType: z.enum(["provider", "review", "message", "user"]), targetId: z.string().trim().min(1).max(200), reason: z.string().trim().min(10).max(5_000) }))
  .handler(async ({ data }) => {
    noStore();
    const auth = await requireUser();
    if (!auth.userId || !auth.supabase) return { ok: false as const, message: auth.error ?? "Not authorized." };

    const { data: report, error } = await auth.supabase
      .from("reports")
      .insert({ target_type: data.targetType, target_id: data.targetId, reason: data.reason })
      .select("id,status")
      .single();

    if (error || !report) return { ok: false as const, message: "The report could not be submitted." };
    return { ok: true as const, reportId: report.id, status: report.status };
  });
