export type RawChapter = {
  title: string;
  artists: string;
  startPosition: number;
  endPosition?: number;
};

export type RawStation = {
  key: string;
  name: string;
  artistsKey: string;
  descriptionKey: string;
  src: string;
  art: string | null;
  chapters: RawChapter[];
  segmented: boolean;
};

export type ParsedPage = {
  messages: Record<string, string>;
  stations: RawStation[];
};

const PAGE_ORIGIN = "https://www.rockstargames.com";

function endOfJson(source: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < source.length; i++) {
    const char = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "[" || char === "{") depth++;
    else if (char === "]" || char === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error("Unterminated Next.js flight payload");
}

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === "string") {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectStrings(item, out);
  }
}

export function flightStrings(html: string): string[] {
  const marker = "self.__next_f.push(";
  const out: string[] = [];
  let from = 0;
  while (from < html.length) {
    const index = html.indexOf(marker, from);
    if (index < 0) break;
    const start = index + marker.length;
    if (html[start] !== "[" && html[start] !== "{") {
      from = start;
      continue;
    }
    try {
      const end = endOfJson(html, start);
      const parsed: unknown = JSON.parse(html.slice(start, end + 1));
      collectStrings(parsed, out);
      from = end + 1;
    } catch {
      from = start + 1;
    }
  }
  return out;
}

function unescapeJsonString(value: string): string {
  return value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) =>
    String.fromCharCode(Number.parseInt(hex, 16)),
  ).replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

function messagesFrom(text: string): Record<string, string> {
  const messages: Record<string, string> = {};
  const pattern = /"(vi_music_[a-z0-9_]+)":"((?:\\.|[^"\\])*)"/g;
  for (const match of text.matchAll(pattern)) {
    messages[match[1]!] = unescapeJsonString(match[2]!);
  }
  return messages;
}

function endOfArray(source: string, openBracket: number): number {
  return endOfJson(source, openBracket);
}

function playlistsFrom(text: string): RawStation[][] {
  const found: RawStation[][] = [];
  let from = 0;
  while (from < text.length) {
    const marker = text.indexOf('"playlist":', from);
    if (marker < 0) break;
    const open = text.indexOf("[", marker);
    if (open < 0 || open - marker > 20) {
      from = marker + 10;
      continue;
    }
    try {
      const close = endOfArray(text, open);
      const parsed: unknown = JSON.parse(text.slice(open, close + 1));
      if (Array.isArray(parsed)) {
        const stations = parsed.flatMap(normalizeStation);
        if (stations.length) found.push(stations);
      }
      from = close + 1;
    } catch {
      from = marker + 10;
    }
  }
  return found;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function normalizeStation(value: unknown): RawStation[] {
  const record = asRecord(value);
  if (!record) return [];
  const src = record.src;
  const key = record.key;
  const name = record.name;
  if (typeof src !== "string" || !src.endsWith(".mp3")) return [];
  if (typeof key !== "string" || typeof name !== "string") return [];
  const artRecord = asRecord(record.albumArt);
  const art = artRecord && typeof artRecord.src === "string" ? artRecord.src : null;
  const chapters = Array.isArray(record.chapters)
    ? record.chapters.flatMap((chapter) => {
        const row = asRecord(chapter);
        if (!row || typeof row.title !== "string" || typeof row.startPosition !== "number") return [];
        return [
          {
            title: row.title,
            artists: typeof row.artists === "string" ? row.artists : "",
            startPosition: row.startPosition,
            ...(typeof row.endPosition === "number" ? { endPosition: row.endPosition } : {}),
          },
        ];
      })
    : [];
  return [
    {
      key,
      name,
      artistsKey: typeof record.artists === "string" ? record.artists : "",
      descriptionKey: typeof record.description === "string" ? record.description : "",
      src,
      art,
      chapters,
      segmented: chapters.length > 0,
    },
  ];
}

function filenameOf(src: string): string {
  const slash = src.lastIndexOf("/");
  return decodeURIComponent(src.slice(slash + 1));
}

function orphanStations(html: string, known: Set<string>): RawStation[] {
  const paths = new Set<string>();
  for (const match of html.matchAll(/\/VI\/_next\/static\/media\/[^"'\\\s>]+\.mp3/g)) {
    paths.add(match[0]!.replaceAll("\\u0026", "&"));
  }
  const stations: RawStation[] = [];
  for (const src of paths) {
    if (known.has(src)) continue;
    const filename = filenameOf(src).replace(/\.mp3$/i, "");
    const name = filename.replace(/\.[A-Za-z0-9~_-]{6,}(?:\.[A-Za-z0-9~_-]+)?$/, "") || filename;
    const key = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    stations.push({
      key: key || filename,
      name,
      artistsKey: "",
      descriptionKey: "",
      src,
      art: null,
      chapters: [],
      segmented: false,
    });
  }
  return stations;
}

export function assetUrl(src: string): string {
  if (!src.startsWith("/VI/_next/static/media/")) {
    throw new Error(`Refusing asset outside the music media directory: ${src}`);
  }
  return PAGE_ORIGIN + encodeURI(src);
}

export function parseMusicPage(html: string): ParsedPage {
  const strings = flightStrings(html);
  const messages: Record<string, string> = {};
  const grouped: RawStation[][] = [];
  for (const text of strings) {
    Object.assign(messages, messagesFrom(text));
    grouped.push(...playlistsFrom(text));
  }
  Object.assign(messages, messagesFrom(html));

  const radioIndex = strings.findIndex((text) => text.includes('"playlistKey":"radio"'));
  let stations: RawStation[] = [];
  if (radioIndex >= 0) {
    const fromRadio = playlistsFrom(strings[radioIndex]!).find((list) =>
      list.some((station) => station.segmented),
    );
    if (fromRadio) stations = fromRadio;
  }
  if (!stations.length) {
    stations = grouped.find((list) => list.some((station) => station.segmented)) ?? grouped[0] ?? [];
  }

  const known = new Set(stations.map((station) => station.src));
  stations = [...stations, ...orphanStations(html, known)];
  if (!stations.length) {
    throw new Error("No radio preview MP3s were found on the music page");
  }
  return { messages, stations };
}

export function resolveCopy(messages: Record<string, string>, value: string): string {
  return messages[value] ?? value;
}
