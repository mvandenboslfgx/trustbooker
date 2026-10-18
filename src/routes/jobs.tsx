import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { getCurrentUserFn } from "@/server/auth.functions";
import { listPublicJobsFn, listMyJobsFn, createJobFn, submitVerticalFn, applyJobFn } from "@/server/verticals.functions";

export const Route = createFileRoute("/jobs")({
  loader: async () => {
    const [publicJobs,myJobs,user] = await Promise.all([listPublicJobsFn(),listMyJobsFn(),getCurrentUserFn()]);
    return {publicJobs,myJobs,user};
  },
  component: Jobs,
});

function Jobs() {
  const {publicJobs,myJobs,user}=Route.useLoaderData();
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const [selected,setSelected]=useState<string|null>(null);
  async function create(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const form=event.currentTarget;const d=new FormData(form);
    setBusy(true);setNotice("");
    try {
      const r=await createJobFn({data:{
        title:String(d.get("title")||""),companyName:String(d.get("company")||""),
        description:String(d.get("description")||""),city:String(d.get("city")||""),
        countryCode:String(d.get("country")||"GB"),
        employmentType:String(d.get("type")||"full_time") as "full_time"|"part_time"|"contract"|"temporary"|"internship",
        workMode:String(d.get("mode")||"on_site") as "on_site"|"hybrid"|"remote",
      }});
      if(r.ok){form.reset();setNotice("Private vacancy draft saved. Review before publishing.");await router.invalidate();}
      else setNotice(r.message);
    }catch{setNotice("Unable to save the vacancy. Check the form.");}finally{setBusy(false);}
  }
  async function submit(id:string) {
    setBusy(true);try {const r=await submitVerticalFn({data:{kind:"job",id}});
      setNotice(r.ok?"Vacancy submitted to staff for review.":r.message);if(r.ok)await router.invalidate();
    }catch{setNotice("Unable to submit the draft.");}finally{setBusy(false);}
  }
  async function apply(e:FormEvent<HTMLFormElement>,jobId:string){
    e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);
    if(f.get("shareEmail")!=="yes"){setNotice("Please consent to sharing your account email with the hiring employer.");setBusy(false);return;}
    try {const r=await applyJobFn({data:{jobId,coverNote:String(f.get("coverNote")||""),shareAccountEmail:true}});
      setNotice(r.ok?"Application sent securely.":r.message);if(r.ok)setSelected(null);
    }catch{setNotice("We could not send your application.");}finally{setBusy(false);}
  }
  return <main className="page-space tb-vertical"><div className="shell">
    <section className="tb-vertical-hero"><span className="tb-section-kicker">TRUSTBOOKER / JOBS</span><h1>Find work that<br/><em>moves you forward.</em></h1><p>Discover verified opportunities, connect with employers and make your next move. No fabricated jobs or paid ranking.</p><div className="tb-vertical-pill-row"><span>Full-time</span><span>Part-time</span><span>Freelance & contract</span></div></section>
    {notice&&<div className="notice" role="status">{notice}</div>}
    <div className="tb-vertical-grid">
      <section><div className="tb-vertical-heading"><div><span className="tb-section-kicker">OPEN ROLES</span><h2>Career opportunities.</h2></div><span>{publicJobs.items.length} live</span></div>
        {!publicJobs.ready&&<p className="notice">Vacancies are temporarily unavailable.</p>}
        {!publicJobs.items.length?<div className="tb-vertical-empty"><div className="tb-empty-symbol">↗</div><h3>We're preparing the job board.</h3><p>Real opportunities will appear when verified listings and their countries open for discovery.</p></div>:
          <div className="tb-vertical-cards">{publicJobs.items.map(job=><article key={job.id} className="tb-listing"><span className="tb-section-kicker">{job.company_name}</span><h3>{job.title}</h3><p>{job.description}</p><div className="tb-listing-tags"><span>{job.city}, {job.country_code}</span><span>{job.work_mode.replaceAll("_"," ")}</span><span>{job.employment_type.replaceAll("_"," ")}</span></div>
            {selected===job.id?<form className="tb-inline-form" onSubmit={e=>void apply(e,job.id)}><label>Cover message<textarea name="coverNote" minLength={20} maxLength={5000} required rows={4}/></label><label className="tb-apply-consent"><input type="checkbox" name="shareEmail" value="yes" required/> I agree to share my verified TrustBooker account email with this employer for this application.</label><button className="button button-brand" disabled={busy}>Send application</button><button type="button" className="button" onClick={()=>setSelected(null)}>Cancel</button></form>:<button type="button" className="button button-dark" onClick={()=>setSelected(job.id)}>{user?"Apply now":"Sign in to apply"} ↗</button>}
          </article>)}</div>}
      </section>
      <aside className="tb-vertical-side"><span className="tb-section-kicker">FOR EMPLOYERS</span><h2>The right person changes everything.</h2><p>Create a free vacancy draft. Staff review is required before public visibility.</p>
        {!user?<Link to="/login" className="button button-brand">Sign in to post a vacancy ↗</Link>:
        <form className="tb-create-form" onSubmit={e=>void create(e)}>
          <h3>Create a vacancy</h3>
          <label>Job title<input name="title" required minLength={5} maxLength={180} placeholder="e.g. Customer support specialist"/></label>
          <label>Company<input name="company" required minLength={2} maxLength={120}/></label>
          <label>Description<textarea name="description" required minLength={30} maxLength={10000} rows={5}/></label>
          <div className="tb-form-pair"><label>City<input name="city" required minLength={2} maxLength={120}/></label><label>Country<select name="country" defaultValue="GB"><option value="GB">United Kingdom</option><option value="NL">Netherlands</option></select></label></div>
          <div className="tb-form-pair"><label>Employment<select name="type"><option value="full_time">Full time</option><option value="part_time">Part time</option><option value="contract">Freelance / contract</option><option value="temporary">Temporary</option><option value="internship">Internship</option></select></label><label>Work arrangement<select name="mode"><option value="on_site">On site</option><option value="hybrid">Hybrid</option><option value="remote">Remote</option></select></label></div>
          <button className="button button-brand" disabled={busy}>Save private draft</button>
        </form>}
        {user&&<div className="tb-my-listings"><h3>My vacancies</h3>{myJobs.length===0?<p>No drafts yet.</p>:myJobs.map(j=><div className="tb-my-listing-row" key={j.id}><div><strong>{j.title}</strong><small>{j.company_name} · {j.status}</small></div>{j.status==="draft"&&<button type="button" className="button" disabled={busy} onClick={()=>void submit(j.id)}>Submit for review</button>}</div>)}</div>}
      </aside>
    </div>
  </div></main>;
}
