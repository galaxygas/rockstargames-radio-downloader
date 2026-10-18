import { createFileRoute } from "@tanstack/react-router";
import { archive, bytesResponse, chapterFile, contentDisposition, readMaster } from "@/lib/radio/catalog.server";

function attachment(bytes: Uint8Array, type: string, filename: string): Response {
  return new Response(Buffer.from(bytes), {
    headers: {
      "content-type": type,
      "content-length": String(bytes.length),
      "content-disposition": contentDisposition(filename, true),
      "cache-control": "private, max-age=300",
    },
  });
}

export const Route = createFileRoute("/api/download")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const station = url.searchParams.get("station") ?? "";
        const pack = url.searchParams.get("pack");
        const chapter = url.searchParams.get("chapter");
        try {
          if (pack === "masters" || pack === "chapters" || pack === "everything") {
            const file = await archive(pack);
            return attachment(file.bytes, "application/zip", file.filename);
          }
          if (!station) return Response.json({ error: "Missing station" }, { status: 400 });
          if (pack === "station") {
            const file = await archive("chapters", station);
            return attachment(file.bytes, "application/zip", file.filename);
          }
          if (chapter !== null) {
            const index = Number(chapter);
            if (!Number.isInteger(index) || index < 0) {
              return Response.json({ error: "Bad chapter" }, { status: 400 });
            }
            const stored = await readMaster(station);
            const file = chapterFile(stored, index);
            return attachment(file.bytes, "audio/mpeg", file.filename);
          }
          const stored = await readMaster(station);
          return bytesResponse(stored.bytes, request, {
            type: "audio/mpeg",
            filename: stored.filename,
            attachment: true,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Download failed";
          return Response.json({ error: message }, { status: 404 });
        }
      },
    },
  },
});
