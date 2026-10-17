import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(128),
});

const noStore = () => {
  setResponseHeaders(
    new Headers({
      "Cache-Control": "private, no-store",
      Vary: "Cookie, Authorization",
    }),
  );
};

const unavailable = {
  ok: false as const,
  code: "not_configured" as const,
  message: "Authentication is not configured for this environment yet.",
};

export const getCurrentUserFn = createServerFn({ method: "GET" }).handler(async () => {
  noStore();
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  return {
    id: data.user.id,
    email: data.user.email ?? null,
  };
});

export const signInWithPasswordFn = createServerFn({ method: "POST" })
  .validator(credentialsSchema)
  .handler(async ({ data }) => {
    noStore();
    const supabase = getSupabaseServerClient();
    if (!supabase) return unavailable;

    const { error } = await supabase.auth.signInWithPassword(data);
    if (error) {
      return {
        ok: false as const,
        code: "invalid_credentials" as const,
        message: "Unable to sign in with those credentials.",
      };
    }

    return { ok: true as const };
  });

export const signUpWithPasswordFn = createServerFn({ method: "POST" })
  .validator(credentialsSchema)
  .handler(async ({ data }) => {
    noStore();
    const supabase = getSupabaseServerClient();
    if (!supabase) return unavailable;

    const { data: result, error } = await supabase.auth.signUp(data);
    if (error) {
      return {
        ok: false as const,
        code: "signup_failed" as const,
        message: "We could not create that account. Check the details and try again.",
      };
    }

    return {
      ok: true as const,
      requiresEmailConfirmation: !result.session,
    };
  });

export const signOutFn = createServerFn({ method: "POST" }).handler(async () => {
  noStore();
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: true as const };

  await supabase.auth.signOut();
  return { ok: true as const };
});
