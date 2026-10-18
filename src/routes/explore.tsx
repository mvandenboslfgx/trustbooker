import { createFileRoute, Link } from "@tanstack/react-router";
export const Route=createFileRoute("/explore")({component:Explore});
const areas=[
 {id:"01",label:"SERVICES",title:"Make things happen.",sub:"Trusted professionals, home repairs and specialist services.",to:"/marketplace",cta:"Explore services",symbol:"✳"},
 {id:"02",label:"JOBS",title:"Find your next move.",sub:"Opportunities, employers and flexible work in one place.",to:"/jobs",cta:"Explore jobs",symbol:"↗"},
 {id:"03",label:"EVENTS",title:"Find your people.",sub:"Culture, meetups, experiences and community events.",to:"/events",cta:"Explore events",symbol:"◎"},
] as const;
function Explore(){return <main className="page-space tb-explore-page"><div className="shell">
 <section className="tb-explore-hero"><span className="tb-section-kicker">TRUSTBOOKER / ONE ACCOUNT, MORE POSSIBILITIES</span><h1>Whatever you're looking for.<br/><em>Start here.</em></h1><p>Services, careers and events, connected by one trustworthy identity and one platform.</p></section>
 <div className="tb-explore-cards">{areas.map(a=><Link key={a.id} to={a.to} className="tb-explore-card"><div className="tb-explore-top"><span>{a.id} / {a.label}</span><strong>{a.symbol}</strong></div><h2>{a.title}</h2><p>{a.sub}</p><span className="tb-explore-cta">{a.cta} ↗</span></Link>)}</div>
 <section className="tb-explore-bottom"><div><span className="tb-section-kicker">CROSS-MARKETPLACE ACCOUNT</span><h2>One place to grow.</h2><p>Create a single account and participate as a buyer, applicant, employer or organizer. New markets remain gated during testing.</p></div><Link to="/dashboard" className="button button-brand">Open my workspace ↗</Link></section>
 </div></main>}
