import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useState } from "react";
import { searchEventsFn } from "@/server/verticals.functions";

const searchSchema=z.object({q:z.string().max(120).optional(),country:z.string().max(2).optional()});
export const Route=createFileRoute("/events")({
 validateSearch:searchSchema,
 loaderDeps:({search})=>search,
 loader:({deps})=>searchEventsFn({data:deps}),
 component:Events
});
function Events(){
 const search=Route.useSearch(),data=Route.useLoaderData(),navigate=useNavigate();
 const [q,setQ]=useState(search.q??""),[country,setCountry]=useState(search.country??"");
 return <main className="page-space tb-listings-page tb-events-page"><div className="shell">
  <section className="tb-listings-hero">
   <span className="tb-section-kicker">TRUSTBOOKER / EVENTS & EXPERIENCES</span>
   <div className="tb-listings-headline"><div><h1>Make time for<br/><em>what matters.</em></h1><p>Discover gatherings, workshops, business events and community experiences. Organizers can prepare free events.</p></div><Link to="/create" search={{type:"event"}} className="button button-brand">Create an event ↗</Link></div>
   <form className="tb-listings-search" role="search" onSubmit={(e)=>{e.preventDefault();void navigate({to:"/events",search:{q:q.trim()||undefined,country:country.trim().toUpperCase()||undefined}})}}>
    <label>Event or topic<input value={q} maxLength={120} onChange={e=>setQ(e.target.value)} placeholder="e.g. Networking, music"/></label>
    <label>Country code<input value={country} maxLength={2} onChange={e=>setCountry(e.target.value)} placeholder="NL, GB"/></label>
    <button type="submit" className="button button-dark">Find events ↗</button>
   </form>
  </section>
  <section className="tb-listing-results" aria-live="polite">
   <div className="tb-result-head"><div><span className="tb-section-kicker">UPCOMING EXPERIENCES</span><h2>{data.listings.length} {data.listings.length===1?"event":"events"}</h2></div><span>Events appear only after a controlled market launch.</span></div>
   {!data.configured&&<p className="notice" role="alert">The events directory is temporarily unavailable. Please check back later.</p>}
   {data.listings.length>0?<div className="tb-vertical-list">{data.listings.map(event=><article className="tb-vertical-result" key={event.id}>
    <div><span className="tb-section-kicker">FREE EVENT · {new Date(event.starts_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</span><h3>{event.title}</h3><p>{event.description}</p><div className="tb-result-meta"><span>⌖ {event.is_online?"Online":event.venue_name}, {event.locality} · {event.country_code}</span><span>{new Date(event.starts_at).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"})}</span></div></div>
    <span className="tb-result-arrow" aria-label="Event listing">↗</span>
   </article>)}</div>:data.configured?<div className="tb-vertical-empty"><span className="tb-vertical-empty-icon">✳</span><h2>Good things are being planned.</h2><p>Event discovery is launching market by market. Organizers can save real events privately while registration and paid ticketing remain unavailable.</p><div className="tb-inline-actions"><Link to="/create" search={{type:"event"}} className="button button-dark">Prepare an event ↗</Link><Link to="/discover" className="button">Explore TrustBooker</Link></div></div>:null}
  </section>
 </div></main>;
}
