import { tagMp3 } from "./id3";
import { sliceFrames, walkMp3, type FrameInfo } from "./mp3";
import { assetUrl, parseMusicPage, resolveCopy, type RawStation } from "./parse";
import { zipStore, type ZipItem } from "./zip";

const PAGE = "https://www.rockstargames.com/VI/music";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36";
const TTL_MS = 10 * 60 * 1000;

export type ChapterView = {
  index: number;
  title: string;
  artists: string;
  start: number;
  end: number;
};

export type FormatView = {
  version: string;
  layer: number;
  bitrateKbps: number;
  bitrateMode: "CBR" | "VBR";
  sampleRate: number;
  channels: string;
  duration: number;
  bytes: number;
  frames: number;
  samplesPerFrame: number;
  id3v1Title: string | null;
  id3v1Year: string | null;
  sha256: string;
};

export type StationView = {
  key: string;
  name: string;
  host: string;
  description: string;
  sourceUrl: string;
  filename: string;
  hasArt: boolean;
  segmented: boolean;
  format: FormatView;
  chapters: ChapterView[];
};

export type Catalog = {
  fetchedAt: string;
  source: string;
  stations: StationView[];
};

type StoredChapter = { title: string; artists: string; start: number; end: number };

type StoredStation = {
  key: string;
  name: string;
  filename: string;
  year: string | null;
  bytes: Uint8Array;
  frames: FrameInfo[];
  chapters: StoredChapter[];
  segmented: boolean;
};

type Cache = {
  at: number;
  catalog: Catalog;
  stations: Map<string, StoredStation>;
  art: Map<string, { type: string; bytes: Uint8Array }>;
};

let cache: Cache | null = null;
let inflight: Promise<Cache> | null = null;

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes.slice());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function fetchChecked(url: string, accept: string): Promise<{ bytes: Uint8Array; type: string }> {
  const response = await fetch(url, {
    headers: {
      "user-agent": UA,
      accept,
      referer: PAGE,
      "accept-language": "en-US,en;q=0.9",
    },
  });
  if (!response.ok) throw new Error(`${response.status} from ${url}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const encoding = response.headers.get("content-encoding");
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (!encoding && declared && declared !== bytes.length) {
    throw new Error(`Incomplete download for ${url}: ${bytes.length} of ${declared} bytes`);
  }
  return { bytes, type: response.headers.get("content-type")?.split(";")[0]?.trim() || "" };
}

function filenameOf(src: string): string {
  return decodeURIComponent(src.slice(src.lastIndexOf("/") + 1));
}

function safeName(value: string): string {
  return value
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);
}

function chapterFilename(index: number, title: string, artists: string): string {
  const label = artists ? `${title} - ${artists}` : title;
  return `${String(index + 1).padStart(2, "0")} ${safeName(label)}.mp3`;
}

function boundsFor(station: RawStation, duration: number): StoredChapter[] {
  const cues = station.chapters.length
    ? [...station.chapters].sort((a, b) => a.startPosition - b.startPosition)
    : [{ title: station.name, artists: "", startPosition: 0 }];
  return cues.map((chapter, index) => {
    const next = cues[index + 1]?.startPosition;
    const end = chapter.endPosition ?? next ?? duration;
    return {
      title: chapter.title,
      artists: chapter.artists,
      start: chapter.startPosition,
      end: Math.min(end, duration),
    };
  });
}

async function build(): Promise<Cache> {
  const page = await fetchChecked(PAGE, "text/html");
  if (!page.type.includes("html") && page.bytes[0] !== 0x3c) {
    throw new Error(`Music page returned ${page.type || "an unexpected body"}`);
  }
  const html = new TextDecoder().decode(page.bytes);
  const parsed = parseMusicPage(html);

  const loaded = await Promise.all(
    parsed.stations.map(async (station) => {
      const audioUrl = assetUrl(station.src);
      const [audio, art] = await Promise.all([
        fetchChecked(audioUrl, "audio/mpeg,*/*"),
        station.art
          ? fetchChecked(assetUrl(station.art), "image/*").catch(() => null)
          : Promise.resolve(null),
      ]);
      if (audio.type && audio.type !== "audio/mpeg" && audio.type !== "application/octet-stream") {
        throw new Error(`${station.name} is ${audio.type}, not an MPEG audio file`);
      }
      const walk = walkMp3(audio.bytes);
      const bitrates = [...new Set(walk.frames.map((frame) => frame.bitrateKbps))];
      const first = walk.frames[0];
      if (!first) throw new Error(`${station.name} has no audio frames`);
      const chapters = boundsFor(station, walk.duration);
      const stored: StoredStation = {
        key: station.key,
        name: station.name,
        filename: filenameOf(station.src),
        year: walk.id3v1?.year ?? null,
        bytes: audio.bytes,
        frames: walk.frames,
        chapters,
        segmented: station.segmented,
      };
      const view: StationView = {
        key: station.key,
        name: station.name,
        host: resolveCopy(parsed.messages, station.artistsKey),
        description: resolveCopy(parsed.messages, station.descriptionKey),
        sourceUrl: audioUrl,
        filename: stored.filename,
        hasArt: Boolean(art && art.type.startsWith("image/")),
        segmented: station.segmented,
        format: {
          version: first.version,
          layer: first.layer,
          bitrateKbps: bitrates.length === 1 ? bitrates[0]! : first.bitrateKbps,
          bitrateMode: bitrates.length === 1 ? "CBR" : "VBR",
          sampleRate: first.sampleRate,
          channels: first.channels,
          duration: walk.duration,
          bytes: audio.bytes.length,
          frames: walk.frames.length,
          samplesPerFrame: first.samples,
          id3v1Title: walk.id3v1?.title ?? null,
          id3v1Year: walk.id3v1?.year ?? null,
          sha256: await sha256(audio.bytes),
        },
        chapters: chapters.map((chapter, index) => ({ index, ...chapter })),
      };
      return {
        stored,
        view,
        art: art && art.type.startsWith("image/") ? { type: art.type, bytes: art.bytes } : null,
      };
    }),
  );

  return {
    at: Date.now(),
    catalog: {
      fetchedAt: new Date().toISOString(),
      source: PAGE,
      stations: loaded.map((item) => item.view),
    },
    stations: new Map(loaded.map((item) => [item.stored.key, item.stored])),
    art: new Map(
      loaded.flatMap((item) => (item.art ? [[item.stored.key, item.art] as const] : [])),
    ),
  };
}

export async function getCache(force = false): Promise<Cache> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache;
  if (!force && inflight) return inflight;
  const run = build();
  inflight = run;
  try {
    cache = await run;
    return cache;
  } finally {
    if (inflight === run) inflight = null;
  }
}

export async function getCatalog(force = false): Promise<Catalog> {
  return (await getCache(force)).catalog;
}

function requireStation(state: Cache, key: string): StoredStation {
  const station = state.stations.get(key);
  if (!station) throw new Error(`Unknown station: ${key}`);
  return station;
}

export function chapterFile(station: StoredStation, index: number): { filename: string; bytes: Uint8Array } {
  const chapter = station.chapters[index];
  if (!chapter) throw new Error("That chapter is not in this station");
  const audio = sliceFrames(station.bytes, station.frames, chapter.start, chapter.end);
  if (!audio.length) throw new Error("That chapter has no audio frames");
  return {
    filename: chapterFilename(index, chapter.title, chapter.artists),
    bytes: tagMp3(audio, {
      title: chapter.title,
      artist: chapter.artists || station.name,
      album: station.name,
      ...(station.year ? { year: station.year } : {}),
    }),
  };
}

function stationZip(station: StoredStation): ZipItem[] {
  return station.chapters.map((_, index) => {
    const file = chapterFile(station, index);
    return { name: `${safeName(station.name)}/${file.filename}`, data: file.bytes };
  });
}

export async function archive(kind: "masters" | "chapters" | "everything", stationKey?: string): Promise<{ filename: string; bytes: Uint8Array }> {
  const state = await getCache();
  const chosen = stationKey
    ? [requireStation(state, stationKey)]
    : [...state.stations.values()];
  const items: ZipItem[] = [];
  if (!stationKey && (kind === "masters" || kind === "everything")) {
    for (const station of chosen) {
      items.push({ name: `masters/${station.filename}`, data: station.bytes });
    }
  }
  if (kind === "chapters" || kind === "everything" || stationKey) {
    for (const station of chosen) {
      if (!station.segmented && !stationKey) continue;
      items.push(...stationZip(station).map((item) => ({ ...item, name: `chapters/${item.name}` })));
    }
  }
  if (kind === "everything") {
    items.push({
      name: "manifest.json",
      data: new TextEncoder().encode(JSON.stringify(state.catalog, null, 2)),
    });
  }
  const filename = stationKey
    ? `${safeName(chosen[0]?.name ?? "station")} chapters.zip`
    : kind === "masters"
      ? "station-scope-masters.zip"
      : kind === "chapters"
        ? "station-scope-chapters.zip"
        : "station-scope.zip";
  return { filename, bytes: zipStore(items) };
}

export async function readMaster(key: string): Promise<StoredStation> {
  return requireStation(await getCache(), key);
}

export async function readArt(key: string): Promise<{ type: string; bytes: Uint8Array }> {
  const state = await getCache();
  const art = state.art.get(key);
  if (!art) throw new Error("No artwork for that station");
  return art;
}

export function contentDisposition(filename: string, attachment: boolean): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "'");
  const star = encodeURIComponent(filename).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${attachment ? "attachment" : "inline"}; filename="${ascii}"; filename*=UTF-8''${star}`;
}

export function bytesResponse(
  bytes: Uint8Array,
  request: Request,
  options: { type: string; filename?: string; attachment?: boolean },
): Response {
  const headers = new Headers();
  headers.set("content-type", options.type);
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", "private, max-age=300");
  if (options.filename) {
    headers.set("content-disposition", contentDisposition(options.filename, Boolean(options.attachment)));
  }
  const total = bytes.length;
  const range = request.headers.get("range");
  if (!range) {
    headers.set("content-length", String(total));
    return new Response(Buffer.from(bytes), { status: 200, headers });
  }
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!match || (match[1] === "" && match[2] === "")) {
    headers.set("content-range", `bytes */${total}`);
    return new Response(null, { status: 416, headers });
  }
  let start: number;
  let end: number;
  if (match[1] === "") {
    const suffix = Number(match[2]);
    if (!Number.isFinite(suffix)) {
      headers.set("content-range", `bytes */${total}`);
      return new Response(null, { status: 416, headers });
    }
    start = Math.max(0, total - suffix);
    end = total - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? total - 1 : Number(match[2]);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= total) {
    headers.set("content-range", `bytes */${total}`);
    return new Response(null, { status: 416, headers });
  }
  end = Math.min(end, total - 1);
  const slice = bytes.slice(start, end + 1);
  headers.set("content-length", String(slice.length));
  headers.set("content-range", `bytes ${start}-${end}/${total}`);
  return new Response(Buffer.from(slice), { status: 206, headers });
}
