import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { searchEverythingFn } from "@/server/discovery.functions";
const params=z.object({q:z.string().optional(),location:z.string().optional()});
export const Route=createFileRoute("/search")({
  validateSearch:params,
  loaderDeps:({search})=>({q:search.q,location:search.location}),
  loader:({deps})=>searchEverythingFn({data:deps}),
  component:Discovery,
});
function Discovery(){
 const result=Route.useLoaderData();const search=Route.useSearch();
 const total=result.professionals.length+result.jobs.length+result.events.length;
 return <main className="page-space tb-discovery-page"><div className="shell">
  <div className="tb-explore-hero"><span className="tb-section-kicker">ONE SEARCH / ALL TRUSTBOOKER MARKETPLACES</span><h1>Every opportunity.<br/><em>One search.</em></h1><p>Search for a service, career or experience without switching accounts.</p>
  <form role="search" action="/search" method="get" className="tb-discovery-search"><label><span>Search</span><input name="q" placeholder="Service, job or event" defaultValue={search.q||""} maxLength={120}/></label><label><span>Location</span><input name="location" placeholder="City" defaultValue={search.location||""} maxLength={160}/></label><button className="button button-dark" type="submit">Search all ↗</button></form></div>
  {!result.ready&&<div className="notice" role="alert">The full search could not be completed. Some markets may be temporarily unavailable.</div>}
  <div className="tb-discovery-count">{total} {total===1?"result":"results"} across services, jobs and events</div>
  <div className="tb-discovery-groups">
   <section><div className="tb-vertical-heading"><div><span className="tb-section-kicker">01 / SERVICES</span><h2>Professionals</h2></div><Link className="tb-text-arrow" to="/marketplace">All services ↗</Link></div>
     {result.professionals.length?<div className="tb-discovery-results">{result.professionals.map(p=><Link to="/providers/$slug" params={{slug:p.slug}} key={p.id} className="tb-discovery-item"><strong>{p.display_name}</strong><span>{p.headline} · {p.locality}, {p.country_code}</span><small>{p.review_count>0?`${p.review_count} genuine booking reviews`:"No booking reviews yet"}</small></Link>)}</div>:<p className="tb-discovery-empty">No discoverable professionals in open markets yet.</p>}
   </section>
   <section><div className="tb-vertical-heading"><div><span className="tb-section-kicker">02 / CAREERS</span><h2>Vacancies</h2></div><Link className="tb-text-arrow" to="/jobs">All jobs ↗</Link></div>
     {result.jobs.length?<div className="tb-discovery-results">{result.jobs.map(j=><Link to="/jobs" key={j.id} className="tb-discovery-item"><strong>{j.title}</strong><span>{j.company_name} · {j.city}, {j.country_code}</span><small>{j.employment_type.replaceAll("_"," ")} · {j.work_mode.replaceAll("_"," ")}</small></Link>)}</div>:<p className="tb-discovery-empty">No published vacancies match this search.</p>}
   </section>
   <section><div className="tb-vertical-heading"><div><span className="tb-section-kicker">03 / EXPERIENCES</span><h2>Events</h2></div><Link className="tb-text-arrow" to="/events">All events ↗</Link></div>
     {result.events.length?<div className="tb-discovery-results">{result.events.map(ev=><Link to="/events" key={ev.id} className="tb-discovery-item"><strong>{ev.title}</strong><span>{ev.organizer_name} · {ev.city}, {ev.country_code}</span><small>{new Date(ev.starts_at).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"})}</small></Link>)}</div>:<p className="tb-discovery-empty">No upcoming events match this search.</p>}
   </section>
  </div>
 </div></main>;
}
