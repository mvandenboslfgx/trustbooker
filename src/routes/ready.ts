import { createFileRoute } from "@tanstack/react-router";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const Route = createFileRoute("/ready")({
  server: {
    handlers: {
      GET: async () => {
        const supabase = getSupabaseServerClient();

        if (!supabase) {
          return Response.json(
            { status: "not_ready" },
            {
              status: 503,
              headers: { "Cache-Control": "no-store" },
            },
          );
        }

        const { error } = await supabase.from("country_launches").select("country_code").limit(1);

        if (error) {
          return Response.json(
            { status: "not_ready" },
            {
              status: 503,
              headers: { "Cache-Control": "no-store" },
            },
          );
        }

        return Response.json(
          { status: "ready" },
          {
            status: 200,
            headers: { "Cache-Control": "no-store" },
          },
        );
      },
    },
  },
});
