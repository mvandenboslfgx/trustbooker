import { createFileRoute, Link } from "@tanstack/react-router";
export const Route = createFileRoute("/trust-safety")({ component: TrustSafety });
const topics = [
  { index: "01", title: "Identity is earned.", body: "A verified signal must represent a real check. An account, a business and a completed job are different kinds of evidence." },
  { index: "02", title: "Every agreement matters.", body: "Keep scope, participants and progress tied to a booking record. Understand what was agreed before the next step." },
  { index: "03", title: "Reviews need a real job.", body: "Verified-booking labels should only follow eligible transactions and moderation. We do not generate fictional reviews." },
  { index: "04", title: "Relevance beats budget.", body: "Profiles should be discoverable through fit and earned reputation—not through paid ranking placements." },
  { index: "05", title: "Disputes deserve evidence.", body: "When something goes wrong, timestamps, messages and booking state create an accountable trail for review." },
  { index: "06", title: "Private means private.", body: "Access-controlled queries, Row Level Security and server-only credentials help protect sensitive information." },
];
function TrustSafety() {
 return <main className="page-space tb-trust-page"><div className="shell"><div className="tb-trust-hero"><span className="tb-section-kicker">THE TRUSTBOOKER STANDARD</span><h1>Trust is more than<br/><em>a promise.</em></h1><p>We are building a marketplace where you can understand exactly what has been checked, what has been agreed and who is accountable.</p><Link to="/marketplace" className="button button-brand">Explore the marketplace ↗</Link></div>
 <div className="tb-trust-topline"><span className="tb-section-kicker">HOW WE DESIGN FOR TRUST</span><span>06 CORE PRINCIPLES</span></div><div className="tb-trust-grid">{topics.map(t=><article key={t.index}><span>{t.index} / STANDARD</span><h2>{t.title}</h2><p>{t.body}</p></article>)}</div>
 <div className="tb-trust-disclosure"><div><span className="tb-section-kicker">TRANSPARENCY MATTERS</span><h2>Trust signals aren't automatically guarantees.</h2><p>Verification features depend on supporting evidence and operational review. Markets open in phases, and payment collection and payouts are not yet enabled. Always check a provider's current status.</p></div><Link to="/pricing" className="button button-dark">See our pricing model ↗</Link></div>
 </div></main>;
}
