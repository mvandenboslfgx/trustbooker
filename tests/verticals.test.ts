import { describe, expect, it } from "vitest";
import { eventDraftSchema, jobDraftSchema, verticals } from "../src/config/verticals";

describe("TrustBooker horizontal marketplace taxonomy",()=>{
 it("has distinct legal workflows for services, employment and events",()=>expect(verticals.map(v=>v.id)).toEqual(["services","jobs","events"]));
 it("normalizes employer country codes",()=>{
 const input={title:"Office administrator",description:"We are looking for a motivated administrator to support the wider operations team.",countryCode:"nl",locality:"Rotterdam",employmentType:"full_time",workMode:"hybrid"};
 expect(jobDraftSchema.parse(input).countryCode).toBe("NL");
 });
 it("does not allow invalid or ambiguous event dates",()=>{
 const input={title:"Business meetup",description:"A friendly meet-up for professionals to network and exchange ideas.",countryCode:"NL",locality:"Rotterdam",venueName:"City Hall",isOnline:false,startsAt:"2026-11-05T19:00:00+01:00",endsAt:"2026-11-05T18:00:00+01:00"};
 expect(eventDraftSchema.safeParse(input).success).toBe(false);
 expect(eventDraftSchema.safeParse({...input,endsAt:"2026-11-05T21:00:00+01:00"}).success).toBe(true);
 });
 it("requires a real venue for in-person events",()=>{
 const input={title:"Business meetup",description:"A friendly meet-up for professionals to network and exchange ideas.",countryCode:"NL",locality:"Rotterdam",isOnline:false,startsAt:"2026-11-05T19:00:00+01:00",endsAt:"2026-11-05T21:00:00+01:00"};
 expect(eventDraftSchema.safeParse(input).success).toBe(false);
 expect(eventDraftSchema.safeParse({...input,isOnline:true}).success).toBe(true);
 });
});
