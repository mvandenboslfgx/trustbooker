import { z } from "zod";

export const verticals = [
  { id: "services", label: "Services & trades", eyebrow: "FIND SOMEONE GREAT", title: "Get the job done", detail: "Trusted tradespeople, skilled freelancers and local services.", icon: "⌂", href: "/marketplace" },
  { id: "jobs", label: "Jobs & careers", eyebrow: "THE NEXT OPPORTUNITY", title: "Find meaningful work", detail: "Work, careers and employers, all in one place.", icon: "↗", href: "/jobs" },
  { id: "events", label: "Events & experiences", eyebrow: "MAKE SOMETHING HAPPEN", title: "Discover what’s on", detail: "Events, meet-ups and experiences worth showing up for.", icon: "✳", href: "/events" },
] as const;

export const countryCodeSchema = z.string().trim().regex(/^[a-zA-Z]{2}$/).transform((code)=>code.toUpperCase());
export const employmentTypes = [
 { value:"full_time", label:"Full-time" },
 { value:"part_time", label:"Part-time" },
 { value:"contract", label:"Contract / freelance" },
 { value:"internship", label:"Internship" },
 { value:"temporary", label:"Temporary" },
] as const;
export const workModes = [
 { value:"on_site", label:"On-site" },
 { value:"hybrid", label:"Hybrid" },
 { value:"remote", label:"Remote" },
] as const;
export const jobDraftSchema = z.object({
  title:z.string().trim().min(5).max(180),
  description:z.string().trim().min(30).max(10000),
  countryCode:countryCodeSchema,
  locality:z.string().trim().min(2).max(160),
  employmentType:z.enum(["full_time","part_time","contract","internship","temporary"]),
  workMode:z.enum(["on_site","hybrid","remote"]),
});
export const eventDraftSchema=z.object({
  title:z.string().trim().min(5).max(180),
  description:z.string().trim().min(30).max(10000),
  countryCode:countryCodeSchema,
  locality:z.string().trim().min(2).max(160),
  venueName:z.string().trim().min(2).max(160).optional(),
  isOnline:z.boolean(),
  startsAt:z.string().datetime({offset:true}),
  endsAt:z.string().datetime({offset:true}),
  capacity:z.number().int().positive().max(100000).optional(),
}).superRefine((data,ctx)=>{
  if(Date.parse(data.endsAt)<=Date.parse(data.startsAt))ctx.addIssue({code:"custom",path:["endsAt"],message:"The event must end after it starts."});
  if(!data.isOnline&&!data.venueName)ctx.addIssue({code:"custom",path:["venueName"],message:"A venue is required for in-person events."});
});
