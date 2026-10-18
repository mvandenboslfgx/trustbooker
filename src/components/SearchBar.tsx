import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

export function SearchBar({ dark = false, scope = "all" }: { dark?: boolean; scope?: "all" | "services" }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");

  return (
    <form className={"search-bar " + (dark ? "search-bar-dark" : "")} role="search" onSubmit={(event) => {
      event.preventDefault();
      const search = { q: query.trim() || undefined, location: location.trim() || undefined };
      if (scope === "all") void navigate({ to: "/search", search });
      else void navigate({ to: "/marketplace", search });
    }}>
      <label><span>What are you looking for?</span><input aria-label="Service or keyword" value={query} maxLength={120} onChange={(e) => setQuery(e.target.value)} placeholder="Service, skill or project" /></label>
      <label><span>Where?</span><input aria-label="City or postcode" value={location} maxLength={160} onChange={(e) => setLocation(e.target.value)} placeholder="City or postcode" /></label>
      <button className="button button-dark tb-search-button" type="submit">{scope === "all" ? "Search everything" : "Find services"} <span aria-hidden="true">↗</span></button>
    </form>
  );
}
