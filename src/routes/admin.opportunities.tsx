import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { listVerticalModerationFn, moderateVerticalFn } from "@/server/verticals.functions";
export const Route=createFileRoute("/admin/opportunities")({
 loader:()=>listVerticalModerationFn(),component:Moderation,
});
function Moderation(){
 const result=Route.useLoaderData();const router=useRouter();const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 if(!result.authorized)return <main className="page-space"><div className="shell narrow empty-state"><h1>Staff access required.</h1><p>The moderation queue is only available to authorized administrators.</p><Link to="/dashboard" className="button">My dashboard</Link></div></main>;
 async function decide(kind:"job"|"event",id:string,decision:"approve"|"reject"){
  if(!window.confirm(decision==="approve"?"Have you checked the listing's authenticity and compliance? Approve only after review.":"Reject this listing?"))return;
  setBusy(true);setMessage("");
  try{const r=await moderateVerticalFn({data:{kind,id,decision}});setMessage(r.ok?"Moderation saved and recorded. Public discovery remains country gated.":r.message);if(r.ok)await router.invalidate();}
  catch{setMessage("Could not confirm moderation.");}finally{setBusy(false);}
 }
 return <main className="page-space tb-admin-vertical"><div className="shell">
  <div className="tb-vertical-hero"><span className="tb-section-kicker">ADMINISTRATION / MODERATION</span><h1>Protect the quality<br/><em>of every listing.</em></h1><p>Every job and event starts privately. Approve only real listings after checking supporting information. Country launches and financial settings remain separate.</p><Link to="/admin" className="button button-brand">← Operations dashboard</Link></div>
  {message&&<p role="status" className="notice">{message}</p>}
  <div className="tb-activity-grid">
   <section className="content-card"><span className="tb-section-kicker">HIRING / REVIEW</span><h2>Pending vacancies ({result.jobs.length})</h2>
   {result.jobs.length===0?<p className="muted">No vacancies awaiting review.</p>:result.jobs.map(j=><article className="tb-admin-vertical-item" key={j.id}><span>{j.company_name} · {j.city}, {j.country_code}</span><h3>{j.title}</h3><p>{j.description}</p><div className="tb-inline-actions"><button className="button button-brand" disabled={busy} onClick={()=>void decide("job",j.id,"approve")}>Approve</button><button className="button" disabled={busy} onClick={()=>void decide("job",j.id,"reject")}>Reject</button></div></article>)}
   </section>
   <section className="content-card"><span className="tb-section-kicker">EVENTS / REVIEW</span><h2>Pending events ({result.events.length})</h2>
   {result.events.length===0?<p className="muted">No events awaiting review.</p>:result.events.map(ev=><article className="tb-admin-vertical-item" key={ev.id}><span>{ev.organizer_name} · {ev.city}, {ev.country_code}</span><h3>{ev.title}</h3><p>{ev.description}</p><small>Starts {new Date(ev.starts_at).toLocaleString("en-GB")}</small><div className="tb-inline-actions"><button className="button button-brand" disabled={busy} onClick={()=>void decide("event",ev.id,"approve")}>Approve</button><button className="button" disabled={busy} onClick={()=>void decide("event",ev.id,"reject")}>Reject</button></div></article>)}
   </section>
  </div><p className="tb-pricing-disclaimer">Approving does not turn on countries, enable paid tickets or activate payment collection.</p>
 </div></main>;
}
