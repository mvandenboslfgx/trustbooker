import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const input = z.object({
  q: z.string().trim().max(120).optional(),
  location: z.string().trim().max(160).optional(),
});
const providerSchema = z.object({
  id: z.string().uuid(), slug: z.string(), display_name: z.string(), headline: z.string(),
  locality: z.string(),country_code:z.string(),review_count:z.coerce.number(),
  rating:z.coerce.number().nullable(),trust_score:z.coerce.number(),identity_status:z.string(),business_status:z.string(),
});

export const searchEverythingFn = createServerFn({ method: "GET" }).validator(input).handler(async ({data}) => {
  setResponseHeaders(new Headers({"Cache-Control":"private, no-store","Vary":"Cookie, Authorization"}));
  const db=getSupabaseServerClient();
  if(!db)return {ready:false as const,professionals:[],jobs:[],events:[]};
  const safeLike=(value:string) => "%" + value.replace(/[\\%_]/g,"\\$&") + "%";
  const jobQuery=db.from("job_listings")
    .select("id,title,company_name,city,country_code,work_mode,employment_type,description")
    .eq("status","published").order("created_at",{ascending:false}).limit(20);
  const eventQuery=db.from("event_listings")
    .select("id,title,organizer_name,city,country_code,starts_at,venue,description")
    .eq("status","published").gt("starts_at",new Date().toISOString())
    .order("starts_at",{ascending:true}).limit(20);
  if(data.q){jobQuery.ilike("title",safeLike(data.q));eventQuery.ilike("title",safeLike(data.q));}
  if(data.location){jobQuery.ilike("city",safeLike(data.location));eventQuery.ilike("city",safeLike(data.location));}
  const [providers,jobs,events]=await Promise.all([
    db.rpc("search_marketplace",{p_query:data.q||null,p_location:data.location||null,p_limit:20,p_offset:0}),
    jobQuery,eventQuery,
  ]);
  const parsed=z.array(providerSchema).safeParse(providers.data ?? []);
  return {
    ready:!(providers.error||jobs.error||events.error),
    professionals:providers.error||!parsed.success ? [] : parsed.data,
    jobs:jobs.error?[]:jobs.data??[],
    events:events.error?[]:events.data??[],
  };
});
