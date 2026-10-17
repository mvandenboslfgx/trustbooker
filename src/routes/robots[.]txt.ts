import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/robots.txt")({ server: { handlers: { GET: () => new Response("User-agent: *\nAllow: /\nSitemap: https://trustbooker.com/sitemap.xml\n", { headers: { "content-type": "text/plain; charset=utf-8" } }) } } });
