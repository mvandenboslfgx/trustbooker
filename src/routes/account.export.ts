import { createFileRoute } from "@tanstack/react-router";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const jsonHeaders = {
  "Cache-Control": "private, no-store",
  "Content-Type": "application/json; charset=utf-8",
} as const;

function errorResponse(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: jsonHeaders,
  });
}

function uniqueById<T extends { id: string }>(rows: T[]): T[] {
  return [...new Map(rows.map((row) => [row.id, row])).values()];
}

export const Route = createFileRoute("/account/export")({
  server: {
    handlers: {
      GET: async () => {
        const supabase = getSupabaseServerClient();
        if (!supabase) return errorResponse(503, "Account export is not configured for this environment.");

        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError || !auth.user) return errorResponse(401, "Authentication required.");

        const userId = auth.user.id;

        const [profileResult, rolesResult, providerResult, requestsResult, buyerBookingsResult, membershipsResult, reportsResult, deletionResult] = await Promise.all([
          supabase.from("profiles").select("id,display_name,locale,country_code,avatar_path,created_at,updated_at").eq("id", userId).maybeSingle(),
          supabase.rpc("get_my_roles"),
          supabase.rpc("get_my_provider_profile"),
          supabase.from("service_requests").select("*").eq("buyer_id", userId).order("created_at", { ascending: true }),
          supabase.from("bookings").select("*").eq("buyer_id", userId).order("created_at", { ascending: true }),
          supabase.from("conversation_members").select("conversation_id,joined_at").eq("user_id", userId).order("joined_at", { ascending: true }),
          supabase.from("reports").select("*").eq("reporter_user_id", userId).order("created_at", { ascending: true }),
          supabase.rpc("get_my_account_deletion_request"),
        ]);

        if (
          profileResult.error ||
          rolesResult.error ||
          providerResult.error ||
          requestsResult.error ||
          buyerBookingsResult.error ||
          membershipsResult.error ||
          reportsResult.error ||
          deletionResult.error
        ) {
          return errorResponse(500, "The account export could not be assembled safely.");
        }

        const provider = (providerResult.data ?? null) as { id?: string } | null;
        const providerId = provider?.id ?? null;
        const requestIds = (requestsResult.data ?? []).map((row) => row.id);
        const conversationIds = (membershipsResult.data ?? []).map((row) => row.conversation_id);

        const buyerProposalsResult = requestIds.length
          ? await supabase.from("proposals").select("*").in("request_id", requestIds).order("created_at", { ascending: true })
          : { data: [], error: null };
        const providerProposalsResult = providerId
          ? await supabase.from("proposals").select("*").eq("provider_id", providerId).order("created_at", { ascending: true })
          : { data: [], error: null };
        const providerBookingsResult = providerId
          ? await supabase.from("bookings").select("*").eq("provider_id", providerId).order("created_at", { ascending: true })
          : { data: [], error: null };
        const servicesResult = providerId
          ? await supabase
              .from("services")
              .select("id,provider_id,category_slug,title,description,starting_price_minor,currency,is_active,created_at,updated_at")
              .eq("provider_id", providerId)
              .order("created_at", { ascending: true })
          : { data: [], error: null };

        if (buyerProposalsResult.error || providerProposalsResult.error || providerBookingsResult.error || servicesResult.error) {
          return errorResponse(500, "The account export could not be assembled safely.");
        }

        const proposals = uniqueById([
          ...((buyerProposalsResult.data ?? []) as Array<{ id: string }>),
          ...((providerProposalsResult.data ?? []) as Array<{ id: string }>),
        ]);
        const bookings = uniqueById([
          ...((buyerBookingsResult.data ?? []) as Array<{ id: string }>),
          ...((providerBookingsResult.data ?? []) as Array<{ id: string }>),
        ]);
        const bookingIds = bookings.map((booking) => booking.id);

        const bookingEventsResult = bookingIds.length
          ? await supabase.from("booking_events").select("*").in("booking_id", bookingIds).order("created_at", { ascending: true })
          : { data: [], error: null };
        const disputesResult = bookingIds.length
          ? await supabase.from("disputes").select("*").in("booking_id", bookingIds).order("created_at", { ascending: true })
          : { data: [], error: null };
        const buyerReviewsResult = bookingIds.length
          ? await supabase
              .from("reviews")
              .select("id,booking_id,provider_id,rating,body,status,verified_booking,created_at,updated_at")
              .in("booking_id", bookingIds)
              .order("created_at", { ascending: true })
          : { data: [], error: null };
        const providerReviewsResult = providerId
          ? await supabase
              .from("reviews")
              .select("id,booking_id,provider_id,rating,body,status,verified_booking,created_at,updated_at")
              .eq("provider_id", providerId)
              .order("created_at", { ascending: true })
          : { data: [], error: null };
        const conversationsResult = conversationIds.length
          ? await supabase.from("conversations").select("*").in("id", conversationIds).order("created_at", { ascending: true })
          : { data: [], error: null };
        const messagesResult = conversationIds.length
          ? await supabase.from("messages").select("*").in("conversation_id", conversationIds).order("created_at", { ascending: true })
          : { data: [], error: null };

        if (
          bookingEventsResult.error ||
          disputesResult.error ||
          buyerReviewsResult.error ||
          providerReviewsResult.error ||
          conversationsResult.error ||
          messagesResult.error
        ) {
          return errorResponse(500, "The account export could not be assembled safely.");
        }

        const reviews = uniqueById([
          ...((buyerReviewsResult.data ?? []) as Array<{ id: string }>),
          ...((providerReviewsResult.data ?? []) as Array<{ id: string }>),
        ]);

        const payload = {
          schemaVersion: 1,
          generatedAt: new Date().toISOString(),
          account: {
            id: userId,
            email: auth.user.email ?? null,
            profile: profileResult.data ?? null,
            roles: rolesResult.data ?? [],
            deletionRequest: deletionResult.data ?? null,
          },
          professional: {
            profile: providerResult.data ?? null,
            services: servicesResult.data ?? [],
          },
          marketplace: {
            requests: requestsResult.data ?? [],
            proposals,
            bookings,
            bookingEvents: bookingEventsResult.data ?? [],
            reviews,
            disputes: disputesResult.data ?? [],
            conversations: conversationsResult.data ?? [],
            conversationMemberships: membershipsResult.data ?? [],
            messages: messagesResult.data ?? [],
            reports: reportsResult.data ?? [],
          },
        };

        const date = new Date().toISOString().slice(0, 10);
        return new Response(JSON.stringify(payload, null, 2), {
          status: 200,
          headers: {
            ...jsonHeaders,
            "Content-Disposition": `attachment; filename="trustbooker-data-export-${date}.json"`,
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
