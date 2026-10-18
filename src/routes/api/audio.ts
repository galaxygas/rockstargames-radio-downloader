import { createFileRoute } from "@tanstack/react-router";
import { bytesResponse, readMaster } from "@/lib/radio/catalog.server";

export const Route = createFileRoute("/api/audio")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const key = new URL(request.url).searchParams.get("station") ?? "";
        try {
          const station = await readMaster(key);
          return bytesResponse(station.bytes, request, {
            type: "audio/mpeg",
            filename: station.filename,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Audio unavailable";
          return Response.json({ error: message }, { status: 404 });
        }
      },
    },
  },
});
