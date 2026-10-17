import { z } from "zod";

const publicEnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().url().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  VITE_APP_URL: z.string().url().default("http://localhost:3000"),
  VITE_DEFAULT_LOCALE: z.string().default("en-GB"),
});

export const publicEnv = publicEnvSchema.parse({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || undefined,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || undefined,
  VITE_APP_URL: import.meta.env.VITE_APP_URL || "http://localhost:3000",
  VITE_DEFAULT_LOCALE: import.meta.env.VITE_DEFAULT_LOCALE || "en-GB",
});
