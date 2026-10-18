import { createFileRoute } from "@tanstack/react-router";
import { readArt } from "@/lib/radio/catalog.server";

export const Route = createFileRoute("/api/art")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const key = new URL(request.url).searchParams.get("station") ?? "";
        try {
          const art = await readArt(key);
          return new Response(Buffer.from(art.bytes), {
            headers: {
              "content-type": art.type,
              "cache-control": "private, max-age=3600",
            },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Artwork unavailable";
          return Response.json({ error: message }, { status: 404 });
        }
      },
    },
  },
});
