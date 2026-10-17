import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { getCurrentUserFn } from "@/server/auth.functions";
import { listPublicEventsFn, listMyEventsFn, createEventFn, submitVerticalFn, registerForEventFn } from "@/server/verticals.functions";

export const Route=createFileRoute("/events")({
 loader:async()=>{const [publicEvents,myEvents,user]=await Promise.all([listPublicEventsFn(),listMyEventsFn(),getCurrentUserFn()]);return {publicEvents,myEvents,user};},
 component:Events,
});
function Events(){
 const {publicEvents,myEvents,user}=Route.useLoaderData();
 const router=useRouter();const [busy,setBusy]=useState(false);const [notice,setNotice]=useState("");
 async function create(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const form=e.currentTarget;const f=new FormData(form);setBusy(true);setNotice("");
  try{
   const r=await createEventFn({data:{
    title:String(f.get("title")||""),organizerName:String(f.get("organizer")||""),
    description:String(f.get("description")||""),venue:String(f.get("venue")||""),
    city:String(f.get("city")||""),countryCode:String(f.get("country")||"GB"),
    startsAt:new Date(String(f.get("starts"))).toISOString(),
    endsAt:new Date(String(f.get("ends"))).toISOString(),
    capacity:Number(f.get("capacity")||0),
   }});
   if(r.ok){form.reset();setNotice("Private event draft saved. Review before publishing.");await router.invalidate();}
   else setNotice(r.message);
  }catch{setNotice("Unable to save event. Check dates and details.");}finally{setBusy(false);}
 }
 async function submit(id:string){setBusy(true);try{const r=await submitVerticalFn({data:{kind:"event",id}});setNotice(r.ok?"Event submitted to staff for review.":r.message);if(r.ok)await router.invalidate();}catch{setNotice("Could not submit this event.");}finally{setBusy(false);}}
 async function register(eventId:string){setBusy(true);try{const r=await registerForEventFn({data:{eventId}});setNotice(r.ok?"Free event registration confirmed. View My activity.":r.message);}catch{setNotice("Registration could not be confirmed.");}finally{setBusy(false);}}
 return <main className="page-space tb-vertical"><div className="shell">
   <section className="tb-vertical-hero tb-events-hero"><span className="tb-section-kicker">TRUSTBOOKER / EVENTS</span><h1>More to do.<br/><em>More to remember.</em></h1><p>Find inspiring experiences and bring people together. Free event registrations will open market by market.</p><div className="tb-vertical-pill-row"><span>Music & culture</span><span>Community</span><span>Meetups & networking</span></div></section>
   {notice&&<div className="notice" role="status">{notice}</div>}
   <div className="tb-vertical-grid">
     <section><div className="tb-vertical-heading"><div><span className="tb-section-kicker">WHAT'S ON</span><h2>Upcoming experiences.</h2></div><span>{publicEvents.items.length} upcoming</span></div>
       {!publicEvents.ready&&<p className="notice">Events are temporarily unavailable.</p>}
       {!publicEvents.items.length?<div className="tb-vertical-empty"><div className="tb-empty-symbol">◎</div><h3>The next chapter starts soon.</h3><p>We will show real, approved events once local registration becomes available. No fictional events or paid tickets.</p></div>:
       <div className="tb-vertical-cards">{publicEvents.items.map(ev=><article className="tb-listing" key={ev.id}>
         <span className="tb-section-kicker">{ev.organizer_name}</span><h3>{ev.title}</h3><p>{ev.description}</p>
         <div className="tb-listing-tags"><span>{new Date(ev.starts_at).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"})}</span><span>{ev.venue}</span><span>{ev.city}, {ev.country_code}</span><span>Free entry</span></div>
         <button type="button" className="button button-dark" disabled={busy} onClick={()=>void register(ev.id)}>{user?"Reserve free place":"Sign in to register"} ↗</button>
       </article>)}</div>}
     </section>
     <aside className="tb-vertical-side"><span className="tb-section-kicker">FOR ORGANIZERS</span><h2>Bring people together.</h2><p>Create free events under one TrustBooker account. Paid ticketing and payouts are not enabled.</p>
       {!user?<Link to="/login" className="button button-brand">Sign in to create an event ↗</Link>:
       <form className="tb-create-form" onSubmit={e=>void create(e)}><h3>Create a free event</h3>
         <label>Event title<input name="title" minLength={5} maxLength={180} required/></label>
         <label>Organizer name<input name="organizer" minLength={2} maxLength={120} required/></label>
         <label>Description<textarea name="description" minLength={30} maxLength={10000} rows={4} required/></label>
         <div className="tb-form-pair"><label>Venue<input name="venue" required minLength={2} maxLength={180}/></label><label>City<input name="city" minLength={2} maxLength={120} required/></label></div>
         <div className="tb-form-pair"><label>Country<select name="country" defaultValue="GB"><option value="GB">United Kingdom</option><option value="NL">Netherlands</option></select></label><label>Capacity<input name="capacity" type="number" min={1} max={100000} defaultValue={25} required/></label></div>
         <div className="tb-form-pair"><label>Start<input name="starts" type="datetime-local" required/></label><label>End<input name="ends" type="datetime-local" required/></label></div>
         <button className="button button-brand" disabled={busy}>Save private event</button><small>Free event registration only. Internal testing until approved.</small>
       </form>}
       {user&&<div className="tb-my-listings"><h3>My events</h3>{myEvents.length===0?<p>No events yet.</p>:myEvents.map(ev=><div className="tb-my-listing-row" key={ev.id}><div><strong>{ev.title}</strong><small>{new Date(ev.starts_at).toLocaleDateString("en-GB")} · {ev.status}</small></div>{ev.status==="draft"&&<button type="button" className="button" disabled={busy} onClick={()=>void submit(ev.id)}>Submit for review</button>}</div>)}</div>}
     </aside>
   </div>
 </div></main>;
}
