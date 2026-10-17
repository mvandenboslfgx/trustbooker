import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

const securityAndObservabilityMiddleware = createMiddleware().server(async ({ request, next }) => {
  const startedAt = Date.now();
  const requestId = request.headers.get("x-request-id")?.slice(0, 128) || crypto.randomUUID();
  const pathname = new URL(request.url).pathname;

  setResponseHeader("x-request-id", requestId);
  setResponseHeader("x-content-type-options", "nosniff");
  setResponseHeader("x-frame-options", "DENY");
  setResponseHeader("referrer-policy", "strict-origin-when-cross-origin");
  setResponseHeader(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  setResponseHeader("cross-origin-opener-policy", "same-origin-allow-popups");

  try {
    const result = await next();
    console.info(
      JSON.stringify({
        level: "info",
        event: "http_request",
        requestId,
        method: request.method,
        path: pathname,
        status: result.response.status,
        durationMs: Date.now() - startedAt,
      }),
    );
    return result;
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "http_request_error",
        requestId,
        method: request.method,
        path: pathname,
        durationMs: Date.now() - startedAt,
        errorName: error instanceof Error ? error.name : "UnknownError",
      }),
    );
    throw error;
  }
});

const csrfMiddleware = createCsrfMiddleware({
  filter: (context) => context.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  requestMiddleware: [securityAndObservabilityMiddleware, csrfMiddleware],
}));
