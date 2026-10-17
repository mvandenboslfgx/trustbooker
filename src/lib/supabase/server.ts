import { env as workerEnv } from "cloudflare:workers";
import { createServerClient } from "@supabase/ssr";
import { getCookies, setCookie } from "@tanstack/react-start/server";

/**
 * Cloudflare binds runtime settings to `cloudflare:workers`.
 * They are available reliably inside TanStack server functions, unlike
 * `process.env` which can be unset in an edge execution context.
 * The Node fallback preserves local development and non-Workers hosts.
 */
export function getSupabaseServerClient() {
  const url = workerEnv.SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = workerEnv.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return Object.entries(getCookies()).map(([name, value]) => ({ name, value }));
      },
      setAll(cookies) {
        cookies.forEach(({ name, value, options }) => {
          setCookie(name, value, options);
        });
      },
    },
  });
}
