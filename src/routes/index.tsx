import { createFileRoute, Link } from "@tanstack/react-router";
import { SearchBar } from "@/components/SearchBar";
import { ProviderCard } from "@/components/ProviderCard";
import { demoProviders } from "@/data/demo";
import { serviceCategories } from "@/config/marketplace";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <main>
    <section className="hero"><div className="shell hero-grid"><div className="hero-copy"><div className="eyebrow light">The trust-first services marketplace</div><h1>Good work starts with <em>real trust.</em></h1><p>Find proven professionals, compare verified reputation and book with a clear record of what was agreed.</p><SearchBar dark /><div className="hero-proof"><span>✓ Verified identity signals</span><span>✓ Review integrity</span><span>✓ No pay-to-win ranking</span></div></div><div className="hero-visual" aria-label="TrustBooker trust overview"><div className="glass-card main-glass"><div className="glass-top"><span>Top match</span><strong>Trust 97</strong></div><div className="avatar-lg">NC</div><h3>North & Co. Home</h3><p>Premium home repairs · London</p><div className="rating-line"><strong>4.9 ★</strong><span>318 verified reviews</span></div><div className="signal-grid"><span><b>742</b> completed</span><span><b>12m</b> response</span><span><b>ID</b> verified</span></div></div><div className="floating-card fc-one">Verified booking<br/><strong>Review accepted ✓</strong></div><div className="floating-card fc-two">Transparent price<br/><strong>From £85</strong></div></div></div></section>

    <section className="trust-strip"><div className="shell trust-strip-inner"><span>Built for accountable transactions</span><div><b>10%</b> success commission</div><div><b>0</b> lead fees</div><div><b>0</b> paid ranking</div><div><b>100%</b> review traceability goal</div></div></section>

    <section className="section shell"><div className="section-head"><div><span className="eyebrow">Explore by need</span><h2>One place for the work life needs.</h2></div><Link to="/marketplace" className="arrow-link">Browse all services →</Link></div><div className="category-grid">{serviceCategories.map((category) => <Link key={category.slug} to="/marketplace" search={{ q: category.name }} className="category-card"><span className="category-icon">{category.icon}</span><h3>{category.name}</h3><p>{category.description}</p><span className="mini-arrow">↗</span></Link>)}</div></section>

    <section className="section section-soft"><div className="shell"><div className="section-head"><div><span className="eyebrow">Standout professionals</span><h2>Reputation you can inspect.</h2></div><p className="section-lede">Profiles combine review history, completed work and verification signals instead of selling the top position.</p></div><div className="provider-grid">{demoProviders.map((provider) => <ProviderCard key={provider.id} provider={provider} />)}</div></div></section>

    <section className="section shell split-story"><div className="story-panel dark-panel"><span className="eyebrow light">The TrustBooker standard</span><h2>Trust should be a system, not a marketing claim.</h2><p>Our product model is designed so that identity, reputation, bookings and disputes can be connected to a verifiable trail.</p><Link to="/trust-safety" className="button button-light">See how trust works</Link></div><div className="principles"><div><span>01</span><h3>Verified signals</h3><p>Show what has actually been verified, and never imply more than the evidence supports.</p></div><div><span>02</span><h3>Earned visibility</h3><p>Ranking should reward relevance and reputation—not whoever spends the most.</p></div><div><span>03</span><h3>Accountable bookings</h3><p>Keep scope, status, payment and review eligibility connected to the same booking record.</p></div></div></section>

    <section className="section shell"><div className="cta"><div><span className="eyebrow light">For professionals</span><h2>Build a reputation that travels with you.</h2><p>Create a credible service profile, win work and pay only when successful.</p></div><Link to="/login" className="button button-brand">Join as a professional</Link></div></section>
  </main>;
}
