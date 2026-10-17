import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { createEventDraftFn,createJobDraftFn,getMyVerticalDraftsFn } from "@/server/verticals.functions";
import { employmentTypes,workModes } from "@/config/verticals";

const query=z.object({type:z.enum(["job","event"]).optional()});
export const Route=createFileRoute("/create")({
 validateSearch:query,
 loader:()=>getMyVerticalDraftsFn(),
 component:CreateOpportunity
});

const val=(data:FormData,key:string)=>String(data.get(key)??"").trim();
function CreateOpportunity(){
 const search=Route.useSearch(),router=useRouter(),saved=Route.useLoaderData();
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[online,setOnline]=useState(false);
 const type=search.type??"job";
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(busy)return;
  const form=e.currentTarget,fd=new FormData(form);setBusy(true);setMessage("");
  try{
   const result=type==="job"?
    await createJobDraftFn({data:{
      title:val(fd,"title"),description:val(fd,"description"),countryCode:val(fd,"countryCode"),
      locality:val(fd,"locality"),employmentType:val(fd,"employmentType") as "full_time"|"part_time"|"contract"|"internship"|"temporary",
      workMode:val(fd,"workMode") as "on_site"|"hybrid"|"remote"
    }}):
    await createEventDraftFn({data:{
      title:val(fd,"title"),description:val(fd,"description"),countryCode:val(fd,"countryCode"),
      locality:val(fd,"locality"),venueName:online?undefined:val(fd,"venueName"),
      isOnline:online,
      startsAt:new Date(val(fd,"startsAt")).toISOString(),endsAt:new Date(val(fd,"endsAt")).toISOString(),
      capacity:val(fd,"capacity")?Number(val(fd,"capacity")):undefined
    }});
   setMessage(result.message);
   if(result.ok){form.reset();setOnline(false);void router.invalidate().catch(()=>{});}
  }catch{setMessage("Could not confirm the draft. Check your saved drafts before attempting another submission.");}
  finally{setBusy(false);}
 }
 return <main className="page-space tb-composer"><div className="shell tb-composer-layout">
  <div className="tb-composer-aside"><span className="tb-section-kicker">YOUR OPPORTUNITIES / CONTROLLED ROLLOUT</span><h1>Bring your next<br/><em>idea to life.</em></h1><p>Start with a private draft. Your vacancy or event will not be publicly listed until the relevant country and product are launched.</p>
   <div className="tb-composer-note"><span>✓</span><strong>Your information stays private.</strong><p>Drafts are only accessible to your account. There are no publishing or payment actions on this screen.</p></div>
   <div className="tb-composer-drafts"><h2>Your saved drafts</h2>{saved.jobs.length===0&&saved.events.length===0?<p>No drafts created yet.</p>:<div>{saved.jobs.map(j=><p key={j.id}>↗ {j.title} <small>Job · {j.status}</small></p>)}{saved.events.map(ev=><p key={ev.id}>✳ {ev.title} <small>Event · {ev.status}</small></p>)}</div>}</div>
  </div>
  <section className="tb-composer-card">
   <nav className="tb-composer-tabs" aria-label="Choose opportunity"><Link to="/create" search={{type:"job"}} className={type==="job"?"active":""}>↗ Post a vacancy</Link><Link to="/create" search={{type:"event"}} className={type==="event"?"active":""}>✳ Create an event</Link></nav>
   <div className="tb-composer-content"><span className="tb-section-kicker">{type==="job"?"EMPLOYER WORKSPACE":"ORGANIZER WORKSPACE"}</span>
    <h2>{type==="job"?"Prepare a job listing":"Prepare an event"}</h2>
    <p>{type==="job"?"Describe the role and working arrangement clearly. All vacancy drafts remain private.":"Start with a free event. Ticket purchases and registrations aren't available yet."}</p>
    <form className="tb-composer-form" key={type} onSubmit={submit}>
      <label>{type==="job"?"Job title":"Event name"}<input name="title" minLength={5} maxLength={180} required placeholder={type==="job"?"e.g. Service coordinator":"e.g. Community business meetup"}/></label>
      <label>Description<textarea name="description" minLength={30} maxLength={10000} rows={5} required placeholder="Describe the opportunity, expectations and useful practical details."/></label>
      <div className="tb-composer-two">
       <label>Country code<input name="countryCode" maxLength={2} minLength={2} pattern="[a-zA-Z]{2}" defaultValue="NL" required/></label>
       <label>City / location<input name="locality" minLength={2} maxLength={160} required placeholder="e.g. Rotterdam"/></label>
      </div>
      {type==="job"?<div className="tb-composer-two">
        <label>Employment type<select name="employmentType">{employmentTypes.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
        <label>Work arrangement<select name="workMode">{workModes.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}</select></label>
       </div>:<>
       <label className="tb-check-option"><input type="checkbox" checked={online} onChange={e=>setOnline(e.target.checked)}/> This event is online</label>
       {!online&&<label>Venue name<input name="venueName" minLength={2} maxLength={160} required placeholder="e.g. Community centre"/></label>}
       <div className="tb-composer-two"><label>Starts<input type="datetime-local" name="startsAt" required/></label><label>Ends<input type="datetime-local" name="endsAt" required/></label></div>
       <label>Maximum attendees (optional)<input type="number" name="capacity" min={1} max={100000}/></label>
       <div className="tb-composer-free"><strong>Free admission only</strong><small>Paid ticket sales stay disabled.</small></div>
      </>}
      <button type="submit" className="button button-dark full" disabled={busy}>{busy?"Saving…":"Save private draft ↗"}</button>
      {message&&<div className="notice" role="status">{message}</div>}
    </form>
   </div>
  </section>
 </div></main>;
}
