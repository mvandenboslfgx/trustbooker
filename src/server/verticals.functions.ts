import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { jobDraftSchema, eventDraftSchema } from "@/config/verticals";

const searchSchema=z.object({ q:z.string().trim().max(120).optional(),country:z.string().trim().max(2).optional() });
const uuid=z.string().uuid();
const jobRow=z.object({
  id:uuid, title:z.string(),description:z.string(),country_code:z.string(),locality:z.string(),
  employment_type:z.string(),work_mode:z.string(),status:z.string(),created_at:z.string(),
});
const eventRow=z.object({
  id:uuid,title:z.string(),description:z.string(),country_code:z.string(),locality:z.string(),
  venue_name:z.string().nullable(),is_online:z.boolean(),starts_at:z.string(),ends_at:z.string(),
  admission_type:z.string(),status:z.string(),created_at:z.string(),
});
const noStore=()=>setResponseHeaders(new Headers({ "Cache-Control":"private, no-store",Vary:"Cookie, Authorization" }));

export const searchJobsFn=createServerFn({method:"GET"}).validator(searchSchema).handler(async ({data})=>{
  noStore();
  const supabase=getSupabaseServerClient();
  if(!supabase)return { configured:false as const, listings:[] as z.infer<typeof jobRow>[] };
  let query=supabase.from("job_posts").select("id,title,description,country_code,locality,employment_type,work_mode,status,created_at")
    .eq("status","published").order("created_at",{ascending:false}).limit(30);
  if(data.country)query=query.eq("country_code",data.country.toUpperCase());
  if(data.q)query=query.ilike("title",`%${data.q.replace(/[%_,]/g,"")}%`);
  const {data:rows,error}=await query;
  if(error)return {configured:false as const,listings:[] as z.infer<typeof jobRow>[]};
  const parsed=z.array(jobRow).safeParse(rows ?? []);
  return {configured:parsed.success,listings:parsed.success?parsed.data:[]};
});

export const searchEventsFn=createServerFn({method:"GET"}).validator(searchSchema).handler(async ({data})=>{
  noStore();
  const supabase=getSupabaseServerClient();
  if(!supabase)return {configured:false as const,listings:[] as z.infer<typeof eventRow>[]};
  let query=supabase.from("event_posts").select("id,title,description,country_code,locality,venue_name,is_online,starts_at,ends_at,admission_type,status,created_at")
    .eq("status","published").gte("starts_at",new Date().toISOString()).order("starts_at",{ascending:true}).limit(30);
  if(data.country)query=query.eq("country_code",data.country.toUpperCase());
  if(data.q)query=query.ilike("title",`%${data.q.replace(/[%_,]/g,"")}%`);
  const {data:rows,error}=await query;
  if(error)return {configured:false as const,listings:[] as z.infer<typeof eventRow>[]};
  const parsed=z.array(eventRow).safeParse(rows ?? []);
  return {configured:parsed.success,listings:parsed.success?parsed.data:[]};
});

export const createJobDraftFn=createServerFn({method:"POST"}).validator(jobDraftSchema).handler(async ({data})=>{
  noStore();
  const supabase=getSupabaseServerClient();
  if(!supabase)return {ok:false as const,message:"Draft publishing is temporarily unavailable."};
  const {data:auth,error:authError}=await supabase.auth.getUser();
  if(authError||!auth.user)return {ok:false as const,message:"Please sign in to create a job draft."};
  const {data:created,error}=await supabase.from("job_posts").insert({
    title:data.title,description:data.description,country_code:data.countryCode,locality:data.locality,
    employment_type:data.employmentType,work_mode:data.workMode
  }).select("id").single();
  if(error||!created)return {ok:false as const,message:"The job draft could not be saved. Please check the details."};
  return {ok:true as const,id:created.id,message:"Job saved privately as a draft. Public vacancy listings are not launched yet."};
});

export const createEventDraftFn=createServerFn({method:"POST"}).validator(eventDraftSchema).handler(async ({data})=>{
  noStore();
  const supabase=getSupabaseServerClient();
  if(!supabase)return {ok:false as const,message:"Event drafts are temporarily unavailable."};
  const {data:auth,error:authError}=await supabase.auth.getUser();
  if(authError||!auth.user)return {ok:false as const,message:"Please sign in to create an event draft."};
  if(Date.parse(data.startsAt)<=Date.now())return {ok:false as const,message:"Choose a future event start date."};
  const {data:created,error}=await supabase.from("event_posts").insert({
    title:data.title,description:data.description,country_code:data.countryCode,locality:data.locality,
    venue_name:data.isOnline?null:data.venueName,is_online:data.isOnline,
    starts_at:data.startsAt,ends_at:data.endsAt,capacity:data.capacity??null
  }).select("id").single();
  if(error||!created)return {ok:false as const,message:"The event draft could not be saved. Please check the details."};
  return {ok:true as const,id:created.id,message:"Event saved privately as a draft. Free registrations and ticketing are not live yet."};
});

export const getMyVerticalDraftsFn=createServerFn({method:"GET"}).handler(async ()=>{
  noStore();
  const supabase=getSupabaseServerClient();
  if(!supabase)return {jobs:[] as {id:string;title:string;status:string}[],events:[] as {id:string;title:string;status:string}[]};
  const {data:auth,error}=await supabase.auth.getUser();
  if(error||!auth.user)return {jobs:[],events:[]};
  const [jobs,events]=await Promise.all([
    supabase.from("job_posts").select("id,title,status").eq("employer_user_id",auth.user.id).order("created_at",{ascending:false}).limit(20),
    supabase.from("event_posts").select("id,title,status").eq("organizer_user_id",auth.user.id).order("created_at",{ascending:false}).limit(20)
  ]);
  return { jobs:jobs.error?[]:jobs.data??[], events:events.error?[]:events.data??[] };
});
