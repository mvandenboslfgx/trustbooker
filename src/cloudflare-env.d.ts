// Minimal runtime binding declaration for typechecking without exposing values.
// Wrangler typegen may replace this with generated, environment-specific bindings.
declare module "cloudflare:workers" {
  export const env: {
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
  };
}
