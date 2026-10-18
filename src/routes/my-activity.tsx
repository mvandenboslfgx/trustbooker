import { createFileRoute, Link } from "@tanstack/react-router";
import { getCurrentUserFn } from "@/server/auth.functions";
import { getMyOpportunitiesFn, listMyEventsFn, listMyJobsFn } from "@/server/verticals.functions";
export const Route=createFileRoute("/my-activity")({
 loader: async()=>{
  const [user,activity,jobs,events]=await Promise.all([getCurrentUserFn(),getMyOpportunitiesFn(),listMyJobsFn(),listMyEventsFn()]);
  return {user,activity,jobs,events};
 },component:MyActivity,
});
function MyActivity(){
 const {user,activity,jobs,events}=Route.useLoaderData();
 if(!user)return <main className="shell page-space"><section className="empty-state"><h1>Sign in to view your activity.</h1><p>Your applications and registrations are private.</p><Link className="button button-brand" to="/login">Sign in ↗</Link></section></main>;
 return <main className="page-space tb-activity-page"><div className="shell">
 <section className="tb-explore-hero"><span className="tb-section-kicker">YOUR TRUSTBOOKER ACCOUNT</span><h1>One account.<br/><em>Every opportunity.</em></h1><p>Vacancies, event registrations and listings under your personal profile.</p></section>
 <div className="tb-activity-grid">
  <section className="content-card"><span className="tb-section-kicker">CAREERS</span><h2>My applications</h2>{activity.applications.length===0?<p className="muted">No job applications yet.</p>:activity.applications.map(a=><div className="tb-activity-line" key={a.id}><div><strong>Job application</strong><small>{new Date(a.created_at).toLocaleDateString("en-GB")}</small></div><span className="tb-gate disabled">{a.status}</span></div>)}<Link to="/jobs" className="button">Explore jobs ↗</Link></section>
  <section className="content-card"><span className="tb-section-kicker">EXPERIENCES</span><h2>My registrations</h2>{activity.registrations.length===0?<p className="muted">No event registrations yet.</p>:activity.registrations.map(r=><div className="tb-activity-line" key={r.id}><div><strong>Event registration</strong><small>{new Date(r.created_at).toLocaleDateString("en-GB")}</small></div><span className="tb-gate disabled">{r.status}</span></div>)}<Link to="/events" className="button">Explore events ↗</Link></section>
  <section className="content-card"><span className="tb-section-kicker">EMPLOYERS</span><h2>My job listings</h2>{jobs.length===0?<p className="muted">You have no vacancies yet.</p>:jobs.map(j=><div className="tb-activity-line" key={j.id}><div><strong>{j.title}</strong><small>{j.company_name}</small></div><span className="tb-gate disabled">{j.status}</span></div>)}<Link to="/jobs" className="button">Manage vacancies ↗</Link></section>
  <section className="content-card"><span className="tb-section-kicker">ORGANIZERS</span><h2>My events</h2>{events.length===0?<p className="muted">You have no events yet.</p>:events.map(ev=><div className="tb-activity-line" key={ev.id}><div><strong>{ev.title}</strong><small>{ev.organizer_name}</small></div><span className="tb-gate disabled">{ev.status}</span></div>)}<Link to="/events" className="button">Manage events ↗</Link></section>
 </div></div></main>;
}
