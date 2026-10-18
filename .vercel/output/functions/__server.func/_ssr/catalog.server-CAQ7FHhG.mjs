//#region node_modules/.nitro/vite/services/ssr/assets/catalog.server-CAQ7FHhG.js
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
function utf16le(text) {
	const out = new Uint8Array(text.length * 2);
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);
		out[i * 2] = code & 255;
		out[i * 2 + 1] = code >> 8;
	}
	return out;
}
function synchsafe(size) {
	return [
		size >> 21 & 127,
		size >> 14 & 127,
		size >> 7 & 127,
		size & 127
	];
}
function textFrame(id, text) {
	const encoded = utf16le(text);
	const body = new Uint8Array(3 + encoded.length);
	body[0] = 1;
	body[1] = 255;
	body[2] = 254;
	body.set(encoded, 3);
	const frame = new Uint8Array(10 + body.length);
	frame[0] = id.charCodeAt(0);
	frame[1] = id.charCodeAt(1);
	frame[2] = id.charCodeAt(2);
	frame[3] = id.charCodeAt(3);
	frame[4] = body.length >>> 24 & 255;
	frame[5] = body.length >>> 16 & 255;
	frame[6] = body.length >>> 8 & 255;
	frame[7] = body.length & 255;
	frame.set(body, 10);
	return frame;
}
function tagMp3(audio, tags) {
	const frames = [
		textFrame("TIT2", tags.title),
		textFrame("TPE1", tags.artist),
		textFrame("TALB", tags.album)
	];
	if (tags.year) frames.push(textFrame("TYER", tags.year));
	const bodyLen = frames.reduce((sum, frame) => sum + frame.length, 0);
	const tag = new Uint8Array(10 + bodyLen);
	tag[0] = 73;
	tag[1] = 68;
	tag[2] = 51;
	tag[3] = 3;
	tag[4] = 0;
	const size = synchsafe(bodyLen);
	tag[6] = size[0];
	tag[7] = size[1];
	tag[8] = size[2];
	tag[9] = size[3];
	let offset = 10;
	for (const frame of frames) {
		tag.set(frame, offset);
		offset += frame.length;
	}
	const out = new Uint8Array(tag.length + audio.length);
	out.set(tag, 0);
	out.set(audio, tag.length);
	return out;
}
var BITRATE = {
	"1-1": [
		0,
		32,
		64,
		96,
		128,
		160,
		192,
		224,
		256,
		288,
		320,
		352,
		384,
		416,
		448,
		0
	],
	"1-2": [
		0,
		32,
		48,
		56,
		64,
		80,
		96,
		112,
		128,
		160,
		192,
		224,
		256,
		320,
		384,
		0
	],
	"1-3": [
		0,
		32,
		40,
		48,
		56,
		64,
		80,
		96,
		112,
		128,
		160,
		192,
		224,
		256,
		320,
		0
	],
	"2-1": [
		0,
		32,
		48,
		56,
		64,
		80,
		96,
		112,
		128,
		144,
		160,
		176,
		192,
		224,
		256,
		0
	],
	"2-2": [
		0,
		8,
		16,
		24,
		32,
		40,
		48,
		56,
		64,
		80,
		96,
		112,
		128,
		144,
		160,
		0
	],
	"2-3": [
		0,
		8,
		16,
		24,
		32,
		40,
		48,
		56,
		64,
		80,
		96,
		112,
		128,
		144,
		160,
		0
	]
};
var SAMPLE_RATE = {
	0: [
		11025,
		12e3,
		8e3
	],
	2: [
		22050,
		24e3,
		16e3
	],
	3: [
		44100,
		48e3,
		32e3
	]
};
/**
* MPEG frame header, MSB first.
* version bits 11 = MPEG-1, 10 = MPEG-2, 00 = MPEG-2.5.
* layer bits 01 = Layer III, 10 = Layer II, 11 = Layer I.
*/
function readFrame(buf, offset) {
	if (offset + 4 > buf.length) return null;
	const b1 = buf[offset + 1];
	const b2 = buf[offset + 2];
	const b3 = buf[offset + 3];
	if (buf[offset] !== 255 || (b1 & 224) !== 224) return null;
	const versionBits = b1 >> 3 & 3;
	const layerBits = b1 >> 1 & 3;
	if (versionBits === 1 || layerBits === 0) return null;
	const bitrateIndex = b2 >> 4 & 15;
	const sampleIndex = b2 >> 2 & 3;
	const padding = b2 >> 1 & 1;
	if (bitrateIndex === 0 || bitrateIndex === 15 || sampleIndex === 3) return null;
	const layer = layerBits === 1 ? 3 : layerBits === 2 ? 2 : 1;
	const mpeg1 = versionBits === 3;
	const bitrateKbps = BITRATE[`${mpeg1 ? 1 : 2}-${layer}`][bitrateIndex];
	const sampleRate = SAMPLE_RATE[versionBits][sampleIndex];
	if (!bitrateKbps || !sampleRate) return null;
	let length;
	if (layer === 1) length = Math.floor(12 * bitrateKbps * 1e3 / sampleRate + padding) * 4;
	else if (!mpeg1 && layer === 3) length = Math.floor(72 * bitrateKbps * 1e3 / sampleRate) + padding;
	else length = Math.floor(144 * bitrateKbps * 1e3 / sampleRate) + padding;
	if (length < 4 || offset + length > buf.length) return null;
	const samples = layer === 1 ? 384 : !mpeg1 && layer === 3 ? 576 : 1152;
	const channels = [
		"stereo",
		"joint stereo",
		"dual",
		"mono"
	][b3 >> 6 & 3];
	return {
		offset,
		length,
		samples,
		sampleRate,
		bitrateKbps,
		channels,
		version: mpeg1 ? "MPEG-1" : versionBits === 2 ? "MPEG-2" : "MPEG-2.5",
		layer
	};
}
function id3v2Size(buf) {
	if (buf.length < 10) return 0;
	if (buf[0] !== 73 || buf[1] !== 68 || buf[2] !== 51) return 0;
	const size = (buf[6] & 127) << 21 | (buf[7] & 127) << 14 | (buf[8] & 127) << 7 | buf[9] & 127;
	const footer = (buf[5] & 16) !== 0 ? 10 : 0;
	return 10 + size + footer;
}
function decodeLatin1(bytes) {
	let out = "";
	for (const b of bytes) {
		if (b === 0) break;
		out += String.fromCharCode(b);
	}
	return out.trim();
}
function readId3v1(buf) {
	if (buf.length < 128) return null;
	const start = buf.length - 128;
	if (buf[start] !== 84 || buf[start + 1] !== 65 || buf[start + 2] !== 71) return null;
	return {
		title: decodeLatin1(buf.subarray(start + 3, start + 33)),
		artist: decodeLatin1(buf.subarray(start + 33, start + 63)),
		album: decodeLatin1(buf.subarray(start + 63, start + 93)),
		year: decodeLatin1(buf.subarray(start + 93, start + 97))
	};
}
function chainFrom(buf, offset, audioEnd) {
	const frames = [];
	let pos = offset;
	while (pos < audioEnd) {
		const frame = readFrame(buf, pos);
		if (!frame || frame.offset + frame.length > audioEnd) return null;
		frames.push(frame);
		pos += frame.length;
	}
	if (pos !== audioEnd || frames.length === 0) return null;
	return frames;
}
/** Walk a station master. Frames must chain exactly across the audio region. */
function walkMp3(buf) {
	const id3v2Bytes = Math.min(id3v2Size(buf), buf.length);
	const id3v1 = readId3v1(buf);
	const audioEnd = id3v1 ? buf.length - 128 : buf.length;
	let frames = null;
	let skippedBytes = 0;
	const scanLimit = Math.min(audioEnd, id3v2Bytes + 8192);
	for (let i = id3v2Bytes; i < scanLimit; i++) {
		frames = chainFrom(buf, i, audioEnd);
		if (frames) {
			skippedBytes = i - id3v2Bytes;
			break;
		}
	}
	if (!frames) throw new Error("MP3 frames do not form one continuous stream");
	let samples = 0;
	for (const frame of frames) samples += frame.samples;
	const sampleRate = frames[0].sampleRate;
	return {
		frames,
		skippedBytes,
		leftoverBytes: 0,
		id3v2Bytes,
		id3v1,
		samples,
		duration: samples / sampleRate
	};
}
function sliceFrames(buf, frames, startSec, endSec) {
	const rate = frames[0]?.sampleRate;
	if (!rate) return /* @__PURE__ */ new Uint8Array();
	const startSample = Math.round(startSec * rate);
	const endSample = Math.round(endSec * rate);
	let sample = 0;
	const picked = [];
	for (const frame of frames) {
		if (sample >= startSample && sample < endSample) picked.push(frame);
		sample += frame.samples;
	}
	const total = picked.reduce((sum, frame) => sum + frame.length, 0);
	const out = new Uint8Array(total);
	let offset = 0;
	for (const frame of picked) {
		out.set(buf.subarray(frame.offset, frame.offset + frame.length), offset);
		offset += frame.length;
	}
	return out;
}
var PAGE_ORIGIN = "https://www.rockstargames.com";
function endOfJson(source, start) {
	let depth = 0;
	let inString = false;
	let escaped = false;
	for (let i = start; i < source.length; i++) {
		const char = source[i];
		if (inString) {
			if (escaped) escaped = false;
			else if (char === "\\") escaped = true;
			else if (char === "\"") inString = false;
			continue;
		}
		if (char === "\"") {
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
function collectStrings(value, out) {
	if (typeof value === "string") {
		out.push(value);
		return;
	}
	if (Array.isArray(value)) {
		for (const item of value) collectStrings(item, out);
		return;
	}
	if (value && typeof value === "object") for (const item of Object.values(value)) collectStrings(item, out);
}
function flightStrings(html) {
	const marker = "self.__next_f.push(";
	const out = [];
	let from = 0;
	while (from < html.length) {
		const index = html.indexOf(marker, from);
		if (index < 0) break;
		const start = index + 19;
		if (html[start] !== "[" && html[start] !== "{") {
			from = start;
			continue;
		}
		try {
			const end = endOfJson(html, start);
			collectStrings(JSON.parse(html.slice(start, end + 1)), out);
			from = end + 1;
		} catch {
			from = start + 1;
		}
	}
	return out;
}
function unescapeJsonString(value) {
	return value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16))).replace(/\\n/g, "\n").replace(/\\"/g, "\"").replace(/\\\\/g, "\\");
}
function messagesFrom(text) {
	const messages = {};
	for (const match of text.matchAll(/"(vi_music_[a-z0-9_]+)":"((?:\\.|[^"\\])*)"/g)) messages[match[1]] = unescapeJsonString(match[2]);
	return messages;
}
function endOfArray(source, openBracket) {
	return endOfJson(source, openBracket);
}
function playlistsFrom(text) {
	const found = [];
	let from = 0;
	while (from < text.length) {
		const marker = text.indexOf("\"playlist\":", from);
		if (marker < 0) break;
		const open = text.indexOf("[", marker);
		if (open < 0 || open - marker > 20) {
			from = marker + 10;
			continue;
		}
		try {
			const close = endOfArray(text, open);
			const parsed = JSON.parse(text.slice(open, close + 1));
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
function asRecord(value) {
	return value && typeof value === "object" ? value : null;
}
function normalizeStation(value) {
	const record = asRecord(value);
	if (!record) return [];
	const src = record.src;
	const key = record.key;
	const name = record.name;
	if (typeof src !== "string" || !src.endsWith(".mp3")) return [];
	if (typeof key !== "string" || typeof name !== "string") return [];
	const artRecord = asRecord(record.albumArt);
	const art = artRecord && typeof artRecord.src === "string" ? artRecord.src : null;
	const chapters = Array.isArray(record.chapters) ? record.chapters.flatMap((chapter) => {
		const row = asRecord(chapter);
		if (!row || typeof row.title !== "string" || typeof row.startPosition !== "number") return [];
		return [{
			title: row.title,
			artists: typeof row.artists === "string" ? row.artists : "",
			startPosition: row.startPosition,
			...typeof row.endPosition === "number" ? { endPosition: row.endPosition } : {}
		}];
	}) : [];
	return [{
		key,
		name,
		artistsKey: typeof record.artists === "string" ? record.artists : "",
		descriptionKey: typeof record.description === "string" ? record.description : "",
		src,
		art,
		chapters,
		segmented: chapters.length > 0
	}];
}
function filenameOf$1(src) {
	const slash = src.lastIndexOf("/");
	return decodeURIComponent(src.slice(slash + 1));
}
function orphanStations(html, known) {
	const paths = /* @__PURE__ */ new Set();
	for (const match of html.matchAll(/\/VI\/_next\/static\/media\/[^"'\\\s>]+\.mp3/g)) paths.add(match[0].replaceAll("\\u0026", "&"));
	const stations = [];
	for (const src of paths) {
		if (known.has(src)) continue;
		const filename = filenameOf$1(src).replace(/\.mp3$/i, "");
		const name = filename.replace(/\.[A-Za-z0-9~_-]{6,}(?:\.[A-Za-z0-9~_-]+)?$/, "") || filename;
		const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
		stations.push({
			key: key || filename,
			name,
			artistsKey: "",
			descriptionKey: "",
			src,
			art: null,
			chapters: [],
			segmented: false
		});
	}
	return stations;
}
function assetUrl(src) {
	if (!src.startsWith("/VI/_next/static/media/")) throw new Error(`Refusing asset outside the music media directory: ${src}`);
	return PAGE_ORIGIN + encodeURI(src);
}
function parseMusicPage(html) {
	const strings = flightStrings(html);
	const messages = {};
	const grouped = [];
	for (const text of strings) {
		Object.assign(messages, messagesFrom(text));
		grouped.push(...playlistsFrom(text));
	}
	Object.assign(messages, messagesFrom(html));
	const radioIndex = strings.findIndex((text) => text.includes("\"playlistKey\":\"radio\""));
	let stations = [];
	if (radioIndex >= 0) {
		const fromRadio = playlistsFrom(strings[radioIndex]).find((list) => list.some((station) => station.segmented));
		if (fromRadio) stations = fromRadio;
	}
	if (!stations.length) stations = grouped.find((list) => list.some((station) => station.segmented)) ?? grouped[0] ?? [];
	const known = new Set(stations.map((station) => station.src));
	stations = [...stations, ...orphanStations(html, known)];
	if (!stations.length) throw new Error("No radio preview MP3s were found on the music page");
	return {
		messages,
		stations
	};
}
function resolveCopy(messages, value) {
	return messages[value] ?? value;
}
var CRC = (() => {
	const table = /* @__PURE__ */ new Uint32Array(256);
	for (let i = 0; i < 256; i++) {
		let crc = i;
		for (let k = 0; k < 8; k++) crc = crc & 1 ? 3988292384 ^ crc >>> 1 : crc >>> 1;
		table[i] = crc >>> 0;
	}
	return table;
})();
function crc32(data) {
	let crc = 4294967295;
	for (let i = 0; i < data.length; i++) crc = CRC[(crc ^ data[i]) & 255] ^ crc >>> 8;
	return (crc ^ 4294967295) >>> 0;
}
function dosStamp(date) {
	return {
		time: date.getUTCHours() << 11 | date.getUTCMinutes() << 5 | Math.floor(date.getUTCSeconds() / 2),
		date: date.getUTCFullYear() - 1980 << 9 | date.getUTCMonth() + 1 << 5 | date.getUTCDate()
	};
}
/** STORE-method zip. Names are UTF-8 (general-purpose bit 11). */
function zipStore(items, now = /* @__PURE__ */ new Date()) {
	const encoder = new TextEncoder();
	const stamp = dosStamp(now);
	const locals = [];
	const centrals = [];
	let offset = 0;
	for (const item of items) {
		const name = encoder.encode(item.name);
		const crc = crc32(item.data);
		const local = new Uint8Array(30 + name.length);
		const view = new DataView(local.buffer);
		view.setUint32(0, 67324752, true);
		view.setUint16(4, 20, true);
		view.setUint16(6, 2048, true);
		view.setUint16(8, 0, true);
		view.setUint16(10, stamp.time, true);
		view.setUint16(12, stamp.date, true);
		view.setUint32(14, crc, true);
		view.setUint32(18, item.data.length, true);
		view.setUint32(22, item.data.length, true);
		view.setUint16(26, name.length, true);
		local.set(name, 30);
		const central = new Uint8Array(46 + name.length);
		const centralView = new DataView(central.buffer);
		centralView.setUint32(0, 33639248, true);
		centralView.setUint16(4, 20, true);
		centralView.setUint16(6, 20, true);
		centralView.setUint16(8, 2048, true);
		centralView.setUint16(10, 0, true);
		centralView.setUint16(12, stamp.time, true);
		centralView.setUint16(14, stamp.date, true);
		centralView.setUint32(16, crc, true);
		centralView.setUint32(20, item.data.length, true);
		centralView.setUint32(24, item.data.length, true);
		centralView.setUint16(28, name.length, true);
		centralView.setUint32(42, offset, true);
		central.set(name, 46);
		locals.push(local, item.data);
		centrals.push(central);
		offset += local.length + item.data.length;
	}
	const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
	const eocd = /* @__PURE__ */ new Uint8Array(22);
	const end = new DataView(eocd.buffer);
	end.setUint32(0, 101010256, true);
	end.setUint16(8, items.length, true);
	end.setUint16(10, items.length, true);
	end.setUint32(12, centralSize, true);
	end.setUint32(16, offset, true);
	const out = new Uint8Array(offset + centralSize + eocd.length);
	let cursor = 0;
	for (const part of locals) {
		out.set(part, cursor);
		cursor += part.length;
	}
	for (const part of centrals) {
		out.set(part, cursor);
		cursor += part.length;
	}
	out.set(eocd, cursor);
	return out;
}
var catalog_server_exports = /* @__PURE__ */ __exportAll({
	archive: () => archive,
	bytesResponse: () => bytesResponse,
	chapterFile: () => chapterFile,
	contentDisposition: () => contentDisposition,
	getCache: () => getCache,
	getCatalog: () => getCatalog,
	readArt: () => readArt,
	readMaster: () => readMaster
});
var PAGE = "https://www.rockstargames.com/VI/music";
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36";
var TTL_MS = 6e5;
var cache = null;
var inflight = null;
async function sha256(bytes) {
	const digest = await crypto.subtle.digest("SHA-256", bytes.slice());
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function fetchChecked(url, accept) {
	const response = await fetch(url, { headers: {
		"user-agent": UA,
		accept,
		referer: PAGE,
		"accept-language": "en-US,en;q=0.9"
	} });
	if (!response.ok) throw new Error(`${response.status} from ${url}`);
	const bytes = new Uint8Array(await response.arrayBuffer());
	const encoding = response.headers.get("content-encoding");
	const declared = Number(response.headers.get("content-length") ?? "0");
	if (!encoding && declared && declared !== bytes.length) throw new Error(`Incomplete download for ${url}: ${bytes.length} of ${declared} bytes`);
	return {
		bytes,
		type: response.headers.get("content-type")?.split(";")[0]?.trim() || ""
	};
}
function filenameOf(src) {
	return decodeURIComponent(src.slice(src.lastIndexOf("/") + 1));
}
function safeName(value) {
	return value.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 90);
}
function chapterFilename(index, title, artists) {
	const label = artists ? `${title} - ${artists}` : title;
	return `${String(index + 1).padStart(2, "0")} ${safeName(label)}.mp3`;
}
function boundsFor(station, duration) {
	const cues = station.chapters.length ? [...station.chapters].sort((a, b) => a.startPosition - b.startPosition) : [{
		title: station.name,
		artists: "",
		startPosition: 0
	}];
	return cues.map((chapter, index) => {
		const next = cues[index + 1]?.startPosition;
		const end = chapter.endPosition ?? next ?? duration;
		return {
			title: chapter.title,
			artists: chapter.artists,
			start: chapter.startPosition,
			end: Math.min(end, duration)
		};
	});
}
async function build() {
	const page = await fetchChecked(PAGE, "text/html");
	if (!page.type.includes("html") && page.bytes[0] !== 60) throw new Error(`Music page returned ${page.type || "an unexpected body"}`);
	const parsed = parseMusicPage(new TextDecoder().decode(page.bytes));
	const loaded = await Promise.all(parsed.stations.map(async (station) => {
		const audioUrl = assetUrl(station.src);
		const [audio, art] = await Promise.all([fetchChecked(audioUrl, "audio/mpeg,*/*"), station.art ? fetchChecked(assetUrl(station.art), "image/*").catch(() => null) : Promise.resolve(null)]);
		if (audio.type && audio.type !== "audio/mpeg" && audio.type !== "application/octet-stream") throw new Error(`${station.name} is ${audio.type}, not an MPEG audio file`);
		const walk = walkMp3(audio.bytes);
		const bitrates = [...new Set(walk.frames.map((frame) => frame.bitrateKbps))];
		const first = walk.frames[0];
		if (!first) throw new Error(`${station.name} has no audio frames`);
		const chapters = boundsFor(station, walk.duration);
		const stored = {
			key: station.key,
			name: station.name,
			filename: filenameOf(station.src),
			year: walk.id3v1?.year ?? null,
			bytes: audio.bytes,
			frames: walk.frames,
			chapters,
			segmented: station.segmented
		};
		return {
			stored,
			view: {
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
					bitrateKbps: bitrates.length === 1 ? bitrates[0] : first.bitrateKbps,
					bitrateMode: bitrates.length === 1 ? "CBR" : "VBR",
					sampleRate: first.sampleRate,
					channels: first.channels,
					duration: walk.duration,
					bytes: audio.bytes.length,
					frames: walk.frames.length,
					samplesPerFrame: first.samples,
					id3v1Title: walk.id3v1?.title ?? null,
					id3v1Year: walk.id3v1?.year ?? null,
					sha256: await sha256(audio.bytes)
				},
				chapters: chapters.map((chapter, index) => ({
					index,
					...chapter
				}))
			},
			art: art && art.type.startsWith("image/") ? {
				type: art.type,
				bytes: art.bytes
			} : null
		};
	}));
	return {
		at: Date.now(),
		catalog: {
			fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
			source: PAGE,
			stations: loaded.map((item) => item.view)
		},
		stations: new Map(loaded.map((item) => [item.stored.key, item.stored])),
		art: new Map(loaded.flatMap((item) => item.art ? [[item.stored.key, item.art]] : []))
	};
}
async function getCache(force = false) {
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
async function getCatalog(force = false) {
	return (await getCache(force)).catalog;
}
function requireStation(state, key) {
	const station = state.stations.get(key);
	if (!station) throw new Error(`Unknown station: ${key}`);
	return station;
}
function chapterFile(station, index) {
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
			...station.year ? { year: station.year } : {}
		})
	};
}
function stationZip(station) {
	return station.chapters.map((_, index) => {
		const file = chapterFile(station, index);
		return {
			name: `${safeName(station.name)}/${file.filename}`,
			data: file.bytes
		};
	});
}
async function archive(kind, stationKey) {
	const state = await getCache();
	const chosen = stationKey ? [requireStation(state, stationKey)] : [...state.stations.values()];
	const items = [];
	if (!stationKey && (kind === "masters" || kind === "everything")) for (const station of chosen) items.push({
		name: `masters/${station.filename}`,
		data: station.bytes
	});
	if (kind === "chapters" || kind === "everything" || stationKey) for (const station of chosen) {
		if (!station.segmented && !stationKey) continue;
		items.push(...stationZip(station).map((item) => ({
			...item,
			name: `chapters/${item.name}`
		})));
	}
	if (kind === "everything") items.push({
		name: "manifest.json",
		data: new TextEncoder().encode(JSON.stringify(state.catalog, null, 2))
	});
	return {
		filename: stationKey ? `${safeName(chosen[0]?.name ?? "station")} chapters.zip` : kind === "masters" ? "station-scope-masters.zip" : kind === "chapters" ? "station-scope-chapters.zip" : "station-scope.zip",
		bytes: zipStore(items)
	};
}
async function readMaster(key) {
	return requireStation(await getCache(), key);
}
async function readArt(key) {
	const art = (await getCache()).art.get(key);
	if (!art) throw new Error("No artwork for that station");
	return art;
}
function contentDisposition(filename, attachment) {
	const ascii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "'");
	const star = encodeURIComponent(filename).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
	return `${attachment ? "attachment" : "inline"}; filename="${ascii}"; filename*=UTF-8''${star}`;
}
function bytesResponse(bytes, request, options) {
	const headers = new Headers();
	headers.set("content-type", options.type);
	headers.set("accept-ranges", "bytes");
	headers.set("cache-control", "private, max-age=300");
	if (options.filename) headers.set("content-disposition", contentDisposition(options.filename, Boolean(options.attachment)));
	const total = bytes.length;
	const range = request.headers.get("range");
	if (!range) {
		headers.set("content-length", String(total));
		return new Response(Buffer.from(bytes), {
			status: 200,
			headers
		});
	}
	const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
	if (!match || match[1] === "" && match[2] === "") {
		headers.set("content-range", `bytes */${total}`);
		return new Response(null, {
			status: 416,
			headers
		});
	}
	let start;
	let end;
	if (match[1] === "") {
		const suffix = Number(match[2]);
		if (!Number.isFinite(suffix)) {
			headers.set("content-range", `bytes */${total}`);
			return new Response(null, {
				status: 416,
				headers
			});
		}
		start = Math.max(0, total - suffix);
		end = total - 1;
	} else {
		start = Number(match[1]);
		end = match[2] === "" ? total - 1 : Number(match[2]);
	}
	if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= total) {
		headers.set("content-range", `bytes */${total}`);
		return new Response(null, {
			status: 416,
			headers
		});
	}
	end = Math.min(end, total - 1);
	const slice = bytes.slice(start, end + 1);
	headers.set("content-length", String(slice.length));
	headers.set("content-range", `bytes ${start}-${end}/${total}`);
	return new Response(Buffer.from(slice), {
		status: 206,
		headers
	});
}
//#endregion
export { contentDisposition as a, __exportAll as c, chapterFile as i, bytesResponse as n, readArt as o, catalog_server_exports as r, readMaster as s, archive as t };
