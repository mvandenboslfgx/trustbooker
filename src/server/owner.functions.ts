import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { adminOverviewSchema } from "@/lib/admin-overview";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const getAdminOperationsOverviewFn = createServerFn({ method: "GET" }).handler(async () => {
  setResponseHeaders(new Headers({
    "Cache-Control": "private, no-store",
    Vary: "Cookie, Authorization",
  }));

  const supabase = getSupabaseServerClient();
  if (!supabase) return { status: "unavailable" as const };
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return { status: "unauthorized" as const };

  // The database RPC independently enforces admin-only access (defense in depth).
  const { data, error } = await supabase.rpc("get_admin_operations_snapshot");
  if (error) {
    if (error.code === "42501") return { status: "unauthorized" as const };
    return { status: "unavailable" as const };
  }

  const parsed = adminOverviewSchema.safeParse(data);
  if (!parsed.success) return { status: "unavailable" as const };
  return { status: "ready" as const, overview: parsed.data };
});
