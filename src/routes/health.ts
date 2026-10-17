import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/health")({
  server: {
    handlers: {
      GET: async () =>
        Response.json(
          {
            status: "ok",
            service: "trustbooker",
          },
          {
            status: 200,
            headers: {
              "Cache-Control": "no-store",
            },
          },
        ),
    },
  },
});
