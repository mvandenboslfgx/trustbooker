import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const country = z.string().trim().length(2).transform((v) => v.toUpperCase());
const asNoStore = () => setResponseHeaders(new Headers({ "Cache-Control": "private, no-store", "Vary": "Cookie, Authorization" }));
const errorResult = (message: string) => ({ ok: false as const, message });

const jobInput = z.object({
  title: z.string().trim().min(5).max(180),
  companyName: z.string().trim().min(2).max(120),
  description: z.string().trim().min(30).max(10000),
  city: z.string().trim().min(2).max(120),
  countryCode: country,
  employmentType: z.enum(["full_time","part_time","contract","temporary","internship"]),
  workMode: z.enum(["on_site","hybrid","remote"]),
});
const eventInput = z.object({
  title: z.string().trim().min(5).max(180),
  organizerName: z.string().trim().min(2).max(120),
  description: z.string().trim().min(30).max(10000),
  venue: z.string().trim().min(2).max(180),
  city: z.string().trim().min(2).max(120),
  countryCode: country,
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  capacity: z.number().int().min(1).max(100000),
}).refine((v) => new Date(v.endsAt)>new Date(v.startsAt) && new Date(v.startsAt)>new Date(), { message: "Choose a future event with an end time after the start." });

async function getAuthenticatedClient() {
  const db = getSupabaseServerClient();
  if (!db) return null;
  const { data, error } = await db.auth.getUser();
  return error || !data.user ? null : { db, user: data.user };
}

export const listPublicJobsFn = createServerFn({ method: "GET" }).handler(async () => {
  asNoStore();
  const db = getSupabaseServerClient();
  if (!db) return { ready: false as const, items: [] };
  const { data, error } = await db.from("job_listings")
    .select("id,title,company_name,description,city,country_code,employment_type,work_mode,created_at")
    .eq("status", "published").order("created_at", { ascending: false }).limit(36);
  return { ready: !error, items: error ? [] : data ?? [] };
});

export const listMyJobsFn = createServerFn({ method: "GET" }).handler(async () => {
  asNoStore();
  const auth = await getAuthenticatedClient();
  if (!auth) return [];
  const { data, error } = await auth.db.from("job_listings")
    .select("id,title,company_name,status,country_code,created_at")
    .eq("owner_user_id", auth.user.id).order("created_at", { ascending: false }).limit(30);
  return error ? [] : data ?? [];
});

export const createJobFn = createServerFn({ method: "POST" }).validator(jobInput).handler(async ({ data }) => {
  asNoStore();
  const auth = await getAuthenticatedClient();
  if (!auth) return errorResult("Sign in before creating a vacancy.");
  const { data: job, error } = await auth.db.from("job_listings").insert({
    title:data.title,company_name:data.companyName,description:data.description,
    city:data.city,country_code:data.countryCode,employment_type:data.employmentType,
    work_mode:data.workMode,
  }).select("id,status").single();
  if (error || !job) return errorResult("We could not save the vacancy draft. Please try again.");
  return { ok:true as const, id:job.id, status:job.status };
});

export const applyJobFn = createServerFn({ method: "POST" }).validator(z.object({
  jobId: uuid, coverNote: z.string().trim().min(20).max(5000), shareAccountEmail: z.literal(true),
})).handler(async ({ data }) => {
  asNoStore();
  const auth = await getAuthenticatedClient();
  if (!auth) return errorResult("Sign in to apply for a vacancy.");
  if (!auth.user.email) return errorResult("A verified account email is required to apply.");
  const { error } = await auth.db.from("job_applications").insert({
    job_id:data.jobId, cover_note:data.coverNote, contact_email:auth.user.email,
  });
  if (error) return errorResult("The application could not be submitted. You may already have applied or the vacancy is unavailable.");
  return { ok:true as const };
});

export const listPublicEventsFn = createServerFn({ method: "GET" }).handler(async () => {
  asNoStore();
  const db=getSupabaseServerClient();
  if(!db) return { ready:false as const, items:[] };
  const { data,error } = await db.from("event_listings")
    .select("id,title,organizer_name,description,venue,city,country_code,starts_at,ends_at,capacity")
    .eq("status","published").gt("starts_at",new Date().toISOString())
    .order("starts_at",{ascending:true}).limit(36);
  return { ready:!error, items:error ? [] : data ?? [] };
});

export const listMyEventsFn = createServerFn({ method:"GET" }).handler(async () => {
  asNoStore();
  const auth=await getAuthenticatedClient();
  if (!auth) return [];
  const {data,error} = await auth.db.from("event_listings")
    .select("id,title,organizer_name,starts_at,status,country_code")
    .eq("organizer_user_id",auth.user.id).order("created_at",{ascending:false}).limit(30);
  return error ? [] : data ?? [];
});

export const createEventFn = createServerFn({ method:"POST" }).validator(eventInput).handler(async ({data}) => {
  asNoStore();
  const auth=await getAuthenticatedClient();
  if(!auth) return errorResult("Sign in before creating an event.");
  const {data:ev,error}=await auth.db.from("event_listings").insert({
    title:data.title,organizer_name:data.organizerName,description:data.description,
    venue:data.venue,city:data.city,country_code:data.countryCode,
    starts_at:data.startsAt,ends_at:data.endsAt,capacity:data.capacity,
  }).select("id,status").single();
  if(error||!ev) return errorResult("We could not create the event draft. Check the dates and try again.");
  return {ok:true as const,id:ev.id,status:ev.status};
});

export const registerForEventFn = createServerFn({method:"POST"}).validator(z.object({eventId:uuid})).handler(async ({data}) => {
  asNoStore();
  const auth=await getAuthenticatedClient();
  if(!auth) return errorResult("Sign in to reserve a free event spot.");
  const {data:id,error}=await auth.db.rpc("register_free_event",{p_event_id:data.eventId});
  if(error || !id) return errorResult("Registration is not available. The event may be full or not open in your country.");
  return {ok:true as const,registrationId:id};
});

export const getMyOpportunitiesFn = createServerFn({method:"GET"}).handler(async () => {
  asNoStore();
  const auth=await getAuthenticatedClient();
  if(!auth) return {authenticated:false as const,applications:[],registrations:[]};
  const [apps,registrations]=await Promise.all([
    auth.db.from("job_applications").select("id,job_id,status,created_at").eq("applicant_user_id",auth.user.id).order("created_at",{ascending:false}).limit(30),
    auth.db.from("event_registrations").select("id,event_id,status,created_at").eq("attendee_user_id",auth.user.id).order("created_at",{ascending:false}).limit(30),
  ]);
  return {authenticated:true as const,applications:apps.error ? [] : apps.data ?? [],registrations:registrations.error ? [] : registrations.data ?? []};
});


export const getEmployerApplicationsFn = createServerFn({method:"GET"}).handler(async()=>{
 asNoStore();const auth=await getAuthenticatedClient();
 if(!auth)return [];
 const {data:jobs,error:jobsError}=await auth.db.from("job_listings")
  .select("id,title").eq("owner_user_id",auth.user.id).order("created_at",{ascending:false}).limit(40);
 if(jobsError||!jobs?.length)return [];
 const names=new Map(jobs.map(job=>[job.id,job.title]));
 const {data,error}=await auth.db.from("job_applications")
  .select("id,job_id,cover_note,contact_email,status,created_at")
  .in("job_id",jobs.map(job=>job.id)).order("created_at",{ascending:false}).limit(100);
 if(error||!data)return [];
 return data.map(row=>({...row,job_title:names.get(row.job_id)??"Your vacancy"}));
});

export const getOrganizerAttendanceFn = createServerFn({method:"GET"}).handler(async()=>{
 asNoStore();const auth=await getAuthenticatedClient();
 if(!auth)return [];
 const {data:events,error:evError}=await auth.db.from("event_listings")
  .select("id,title,capacity").eq("organizer_user_id",auth.user.id)
  .order("created_at",{ascending:false}).limit(40);
 if(evError||!events?.length)return [];
 const {data:regs,error}=await auth.db.from("event_registrations")
  .select("event_id,status").in("event_id",events.map(ev=>ev.id)).limit(1000);
 if(error)return [];
 return events.map(ev=>({
  id:ev.id,title:ev.title,capacity:ev.capacity,
  registered:(regs??[]).filter(r=>r.event_id===ev.id&&r.status==="registered").length,
 }));
});

export const submitVerticalFn = createServerFn({method:"POST"}).validator(z.object({
 kind:z.enum(["job","event"]),id:uuid,
})).handler(async ({data}) => {
  asNoStore();
  const auth=await getAuthenticatedClient();
  if(!auth) return errorResult("Sign in to submit a listing.");
  const {data:ok,error}=await auth.db.rpc("submit_vertical_listing",{p_kind:data.kind,p_id:data.id});
  if(error || !ok) return errorResult("The draft could not be submitted. Check its status and event dates.");
  return {ok:true as const};
});

export const listVerticalModerationFn = createServerFn({method:"GET"}).handler(async () => {
  asNoStore();
  const auth=await getAuthenticatedClient();
  if(!auth) return {authorized:false as const,jobs:[],events:[]};
  const {data:role}=await auth.db.rpc("get_my_roles");
  if(!Array.isArray(role) || !role.includes("admin")) return {authorized:false as const,jobs:[],events:[]};
  const [jobs,events]=await Promise.all([
    auth.db.from("job_listings").select("id,title,company_name,country_code,city,description,created_at").eq("status","pending").order("created_at",{ascending:true}).limit(40),
    auth.db.from("event_listings").select("id,title,organizer_name,country_code,city,starts_at,description,created_at").eq("status","pending").order("created_at",{ascending:true}).limit(40),
  ]);
  return {authorized:true as const,jobs:jobs.error ? [] : jobs.data ?? [],events:events.error ? [] : events.data ?? []};
});

export const moderateVerticalFn = createServerFn({method:"POST"}).validator(z.object({
 kind:z.enum(["job","event"]),id:uuid,decision:z.enum(["approve","reject"])
})).handler(async ({data}) => {
  asNoStore();
  const auth=await getAuthenticatedClient();
  if(!auth) return errorResult("Administrator sign-in required.");
  const {data:ok,error}=await auth.db.rpc("moderate_vertical_listing",{p_kind:data.kind,p_id:data.id,p_decision:data.decision});
  if(error || !ok) return errorResult("The moderation action was not completed.");
  return {ok:true as const};
});
