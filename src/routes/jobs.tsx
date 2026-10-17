import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useState } from "react";
import { searchJobsFn } from "@/server/verticals.functions";
import { employmentTypes,workModes } from "@/config/verticals";

const searchSchema=z.object({q:z.string().max(120).optional(),country:z.string().max(2).optional()});
export const Route=createFileRoute("/jobs")({
 validateSearch:searchSchema,
 loaderDeps:({search})=>search,
 loader:({deps})=>searchJobsFn({data:deps}),
 component:Jobs
});
function Jobs(){
 const search=Route.useSearch(),data=Route.useLoaderData(),navigate=useNavigate();
 const [q,setQ]=useState(search.q??"");
 const [country,setCountry]=useState(search.country??"");
 return <main className="page-space tb-listings-page"><div className="shell">
  <section className="tb-listings-hero">
   <span className="tb-section-kicker">TRUSTBOOKER / JOBS & CAREERS</span>
   <div className="tb-listings-headline"><div><h1>Find work<br/><em>worth doing.</em></h1><p>Explore jobs and opportunities from real employers. Free to search; no sponsored ranking.</p></div><Link to="/create" search={{type:"job"}} className="button button-brand">Post a vacancy ↗</Link></div>
   <form className="tb-listings-search" role="search" onSubmit={(e)=>{e.preventDefault();void navigate({to:"/jobs",search:{q:q.trim()||undefined,country:country.trim().toUpperCase()||undefined}})}}>
    <label>Role or keyword<input value={q} maxLength={120} onChange={e=>setQ(e.target.value)} placeholder="e.g. Customer support"/></label>
    <label>Country code<input value={country} maxLength={2} onChange={e=>setCountry(e.target.value)} placeholder="NL, GB"/></label>
    <button type="submit" className="button button-dark">Find jobs ↗</button>
   </form>
  </section>
  <section className="tb-listing-results" aria-live="polite">
   <div className="tb-result-head"><div><span className="tb-section-kicker">OPEN OPPORTUNITIES</span><h2>{data.listings.length} {data.listings.length===1?"vacancy":"vacancies"}</h2></div><span>Only published jobs in open markets are visible.</span></div>
   {!data.configured&&<p className="notice" role="alert">The jobs directory is temporarily unavailable. Please check back later.</p>}
   {data.listings.length>0?<div className="tb-vertical-list">{data.listings.map(job=><article className="tb-vertical-result" key={job.id}>
    <div><span className="tb-section-kicker">OPPORTUNITY · {job.employment_type.replaceAll("_"," ")}</span><h3>{job.title}</h3><p>{job.description}</p><div className="tb-result-meta"><span>⌖ {job.locality} · {job.country_code}</span><span>{workModes.find(m=>m.value===job.work_mode)?.label??job.work_mode}</span><span>{employmentTypes.find(m=>m.value===job.employment_type)?.label??job.employment_type}</span></div></div>
    <span className="tb-result-arrow" aria-label="Job listing">↗</span>
   </article>)}</div>:data.configured?<div className="tb-vertical-empty"><span className="tb-vertical-empty-icon">↗</span><h2>New opportunities are on the way.</h2><p>We haven't opened this jobs market yet. Employers can prepare private vacancies, and nothing is presented as a live job until the country is approved.</p><div className="tb-inline-actions"><Link to="/create" search={{type:"job"}} className="button button-dark">Prepare a job posting ↗</Link><Link to="/discover" className="button">Explore TrustBooker</Link></div></div>:null}
  </section>
 </div></main>;
}
