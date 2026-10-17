import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div className="tb-footer-intro">
          <Link to="/" className="brand footer-brand" aria-label="TrustBooker homepage"><span className="brand-mark">T<span className="brand-dot">.</span></span><span>trustbooker<span className="brand-period">.</span></span></Link>
          <p className="footer-copy">Good work begins with real trust. A service marketplace designed for clearer choices, accountable work and fairer opportunities.</p>
        </div>
        <div><strong>Discover</strong><Link to="/explore">All opportunities</Link><Link to="/marketplace">Explore services</Link><Link to="/jobs">Jobs and careers</Link><Link to="/events">Events and experiences</Link><Link to="/request">Post a job</Link><Link to="/pricing">How pricing works</Link></div>
        <div><strong>Participate</strong><Link to="/professionals">For professionals</Link><Link to="/login">Your account</Link><Link to="/dashboard">Your workspace</Link><Link to="/my-activity">Applications & registrations</Link></div>
        <div><strong>The essentials</strong><Link to="/trust-safety">Trust & safety</Link><Link to="/privacy">Privacy policy</Link><Link to="/terms">Terms of service</Link><a href="mailto:support@trustbooker.com">Contact support</a></div>
      </div>
      <div className="shell tb-footer-bottom"><span>© {new Date().getFullYear()} TrustBooker. Built on clarity.</span><span>Free core access · No paid placement · Market-by-market rollout</span></div>
    </footer>
  );
}
