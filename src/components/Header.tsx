import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getCurrentUserFn } from "@/server/auth.functions";
import { getMyRolesFn } from "@/server/admin.functions";

type SessionState = "loading" | "signed-in" | "signed-out";

export function Header() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const [session, setSession] = useState<SessionState>("loading");
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    let active = true;
    async function refreshSession() {
      try {
        const user = await getCurrentUserFn();
        if (!active) return;
        setSession(user ? "signed-in" : "signed-out");
        if (!user) { setIsStaff(false); return; }
        const roles = await getMyRolesFn();
        if (active) setIsStaff(roles.includes("admin") || roles.includes("moderator"));
      } catch {
        if (active) { setSession("signed-out"); setIsStaff(false); }
      }
    }
    void refreshSession();
    return () => { active = false; };
  }, [path]);

  const links = (
    <>
      <Link to="/discover" activeProps={{ className: "active" }}>Explore all</Link>
      <Link to="/marketplace" activeProps={{ className: "active" }}>Services</Link>
      <Link to="/jobs" activeProps={{ className: "active" }}>Jobs</Link>
      <Link to="/events" activeProps={{ className: "active" }}>Events</Link>
      <Link to="/professionals" activeProps={{ className: "active" }}>For professionals</Link>
    </>
  );

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link to="/" className="brand" aria-label="TrustBooker, back to homepage">
          <span className="brand-mark" aria-hidden="true">T<span className="brand-dot">.</span></span>
          <span>trustbooker<span className="brand-period">.</span></span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">{links}</nav>
        <div className="header-actions">
          {session === "signed-in" ? (
            <>
              {isStaff && <Link to="/admin" className="text-link owner-link">Operations</Link>}
              <Link to="/dashboard" className="text-link">My dashboard</Link>
            </>
          ) : session === "signed-out" ? (
            <Link to="/login" className="text-link">Log in</Link>
          ) : (
            <span className="header-loading" aria-label="Checking account status" />
          )}
          <Link to="/request" className="button button-dark button-compact header-primary">Post a job <span aria-hidden="true">↗</span></Link>
        </div>
        <details className="mobile-drawer">
          <summary aria-label="Open navigation"><span></span><span></span><span></span></summary>
          <nav aria-label="Mobile navigation">
            {links}
            {session === "signed-in" ? <Link to="/dashboard">My dashboard</Link> : <Link to="/login">Log in / Join</Link>}
            {session === "signed-in" && isStaff && <Link to="/admin">Operations</Link>}
            <Link to="/request">Post a job ↗</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
