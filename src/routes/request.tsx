import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { serviceCategories } from "@/config/marketplace";

export const Route = createFileRoute("/request")({ component: RequestPage });
function RequestPage() {
  const [submitted, setSubmitted] = useState(false);
  return <main className="page-space"><div className="shell narrow">{!submitted ? <><span className="eyebrow">Post a job</span><h1 className="page-title">Tell us what needs doing.</h1><p className="page-intro">This front-end flow is ready for the booking/request domain. Database writes remain gated until the Supabase project is connected.</p><form className="form-card" onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}><label>Service category<select required defaultValue=""><option value="" disabled>Select a category</option>{serviceCategories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label><label>Job title<input required placeholder="e.g. Fix a leaking kitchen tap" /></label><label>Describe the job<textarea required rows={6} placeholder="What needs to be done, what matters most, and when do you need it?" /></label><div className="two-col"><label>City or postcode<input required placeholder="Location" /></label><label>Target date<input type="date" /></label></div><button className="button button-brand" type="submit">Continue to matching</button></form></> : <div className="empty-state"><span className="eyebrow">Request captured locally</span><h1>Great brief.</h1><p>Database submission is intentionally disabled until the production project and policy layer are connected.</p></div>}</div></main>;
}
