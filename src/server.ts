import {
  createStartHandler,
  defaultStreamHandler,
  defineHandlerCallback,
} from "@tanstack/react-start/server";
import { createServerEntry } from "@tanstack/react-start/server-entry";

const render = defineHandlerCallback((ctx) => defaultStreamHandler(ctx));
const startHandler = createStartHandler(render);

function withSecurityHeaders(response: Response, requestId: string): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Request-Id", requestId);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default createServerEntry({
  async fetch(request, opts) {
    const requestId = request.headers.get("x-request-id")?.slice(0, 128) || crypto.randomUUID();
    const response = await startHandler(request, opts);
    return withSecurityHeaders(response, requestId);
  },
});
