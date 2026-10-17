import { createFileRoute, Link } from "@tanstack/react-router";
import { verticals } from "@/config/verticals";

export const Route=createFileRoute("/discover")({component:Discover});
function Discover(){
 return <main className="page-space tb-universe">
  <section className="shell tb-universe-hero"><span className="tb-section-kicker">TRUSTBOOKER / THE CONNECTED MARKETPLACE</span>
   <h1>What are you looking<br/><em>to make happen?</em></h1><p>Find professionals, discover your next career move or explore an experience. One place to start, with specialist workflows for every journey.</p>
  </section>
  <section className="shell tb-universe-grid" aria-label="Discover TrustBooker marketplaces">
   {verticals.map((v,index)=><Link key={v.id} to={v.href} className="tb-universe-card">
    <div className="tb-universe-card-top"><span>{String(index+1).padStart(2,"0")} / {v.eyebrow}</span><span aria-hidden="true">↗</span></div>
    <div className="tb-universe-glyph" aria-hidden="true">{v.icon}</div>
    <div><span className="tb-universe-tag">{v.label}</span><h2>{v.title}</h2><p>{v.detail}</p></div>
    <span className="tb-universe-action">Explore {v.label.toLowerCase()} <span aria-hidden="true">↗</span></span>
   </Link>)}
  </section>
  <section className="shell tb-universe-foot"><span>ONE TRUSTBOOKER ACCOUNT. THREE DISTINCT WAYS TO CONNECT.</span><Link to="/create">Post an opportunity ↗</Link></section>
 </main>
}
