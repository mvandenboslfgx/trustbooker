import { createFileRoute, Link } from "@tanstack/react-router";
export const Route = createFileRoute("/pricing")({ component: Pricing });
function Pricing() {
  return <main className="page-space tb-pricing-page"><div className="shell">
    <div className="tb-pricing-hero"><span className="tb-section-kicker">STRAIGHTFORWARD BY DESIGN</span><h1>Good opportunities.<br/><em>Fair economics.</em></h1><p>Core participation stays free. No subscriptions to take part, no fees for receiving leads and no paid ranking. A 10% success fee is planned for eligible transactions once payments launch.</p></div>
    <div className="tb-pricing-layout"><article className="tb-pricing-feature"><span className="tb-section-kicker">01 / PARTICIPATION</span><h2>Free to get started.</h2><strong className="tb-pricing-value">€0<span> / core access</span></strong><p>Create an account, set up your professional profile and prepare services without subscription fees.</p><Link to="/professionals" className="button button-dark">Create your profile ↗</Link></article>
    <article className="tb-pricing-feature tb-pricing-dark"><span className="tb-section-kicker">02 / SUCCESS MODEL</span><h2>Pay when work succeeds.</h2><strong className="tb-pricing-value">10%<span> / planned success fee</span></strong><p>The intended model charges a success commission when eligible work is completed. It is not active while marketplace payments are disabled.</p><Link to="/trust-safety" className="button button-brand">Understand our approach ↗</Link></article></div>
    <div className="tb-pricing-promises"><div><span>✓</span><strong>No subscriptions</strong><small>Core marketplace access is free.</small></div><div><span>✓</span><strong>No paid ranking</strong><small>Visibility should be earned.</small></div><div><span>✓</span><strong>No lead charges</strong><small>No fees simply to receive an opportunity.</small></div></div>
    <p className="tb-pricing-disclaimer">TrustBooker is rolling out country by country. Transactions, payment collection and payouts are currently disabled; availability and terms may vary by launch market.</p>
  </div></main>;
}
