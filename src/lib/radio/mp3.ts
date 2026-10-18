export type MpegVersion = "MPEG-1" | "MPEG-2" | "MPEG-2.5";
export type ChannelMode = "stereo" | "joint stereo" | "dual" | "mono";

export type FrameInfo = {
  offset: number;
  length: number;
  samples: number;
  sampleRate: number;
  bitrateKbps: number;
  channels: ChannelMode;
  version: MpegVersion;
  layer: 1 | 2 | 3;
};

export type AudioWalk = {
  frames: FrameInfo[];
  skippedBytes: number;
  leftoverBytes: number;
  id3v2Bytes: number;
  id3v1: Id3v1 | null;
  duration: number;
  samples: number;
};

export type Id3v1 = {
  title: string;
  artist: string;
  album: string;
  year: string;
};

const BITRATE: Record<string, readonly number[]> = {
  "1-1": [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 0],
  "1-2": [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 0],
  "1-3": [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
  "2-1": [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, 0],
  "2-2": [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
  "2-3": [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
};

const SAMPLE_RATE: Record<number, readonly number[]> = {
  0: [11025, 12000, 8000],
  2: [22050, 24000, 16000],
  3: [44100, 48000, 32000],
};

/**
 * MPEG frame header, MSB first.
 * version bits 11 = MPEG-1, 10 = MPEG-2, 00 = MPEG-2.5.
 * layer bits 01 = Layer III, 10 = Layer II, 11 = Layer I.
 */
export function readFrame(buf: Uint8Array, offset: number): FrameInfo | null {
  if (offset + 4 > buf.length) return null;
  const b1 = buf[offset + 1]!;
  const b2 = buf[offset + 2]!;
  const b3 = buf[offset + 3]!;
  if (buf[offset] !== 0xff || (b1 & 0xe0) !== 0xe0) return null;

  const versionBits = (b1 >> 3) & 0x3;
  const layerBits = (b1 >> 1) & 0x3;
  if (versionBits === 1 || layerBits === 0) return null;

  const bitrateIndex = (b2 >> 4) & 0xf;
  const sampleIndex = (b2 >> 2) & 0x3;
  const padding = (b2 >> 1) & 0x1;
  if (bitrateIndex === 0 || bitrateIndex === 15 || sampleIndex === 3) return null;

  const layer: 1 | 2 | 3 = layerBits === 1 ? 3 : layerBits === 2 ? 2 : 1;
  const mpeg1 = versionBits === 3;
  const bitrateKbps = BITRATE[`${mpeg1 ? 1 : 2}-${layer}`]![bitrateIndex]!;
  const sampleRate = SAMPLE_RATE[versionBits]![sampleIndex]!;
  if (!bitrateKbps || !sampleRate) return null;

  let length: number;
  if (layer === 1) {
    length = Math.floor((12 * bitrateKbps * 1000) / sampleRate + padding) * 4;
  } else if (!mpeg1 && layer === 3) {
    length = Math.floor((72 * bitrateKbps * 1000) / sampleRate) + padding;
  } else {
    length = Math.floor((144 * bitrateKbps * 1000) / sampleRate) + padding;
  }
  if (length < 4 || offset + length > buf.length) return null;

  const samples = layer === 1 ? 384 : !mpeg1 && layer === 3 ? 576 : 1152;
  const channels = (["stereo", "joint stereo", "dual", "mono"] as const)[(b3 >> 6) & 0x3]!;
  const version: MpegVersion = mpeg1 ? "MPEG-1" : versionBits === 2 ? "MPEG-2" : "MPEG-2.5";
  return { offset, length, samples, sampleRate, bitrateKbps, channels, version, layer };
}

function id3v2Size(buf: Uint8Array): number {
  if (buf.length < 10) return 0;
  if (buf[0] !== 0x49 || buf[1] !== 0x44 || buf[2] !== 0x33) return 0;
  const size =
    ((buf[6]! & 0x7f) << 21) |
    ((buf[7]! & 0x7f) << 14) |
    ((buf[8]! & 0x7f) << 7) |
    (buf[9]! & 0x7f);
  const footer = (buf[5]! & 0x10) !== 0 ? 10 : 0;
  return 10 + size + footer;
}

function decodeLatin1(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) {
    if (b === 0) break;
    out += String.fromCharCode(b);
  }
  return out.trim();
}

export function readId3v1(buf: Uint8Array): Id3v1 | null {
  if (buf.length < 128) return null;
  const start = buf.length - 128;
  if (buf[start] !== 0x54 || buf[start + 1] !== 0x41 || buf[start + 2] !== 0x47) return null;
  return {
    title: decodeLatin1(buf.subarray(start + 3, start + 33)),
    artist: decodeLatin1(buf.subarray(start + 33, start + 63)),
    album: decodeLatin1(buf.subarray(start + 63, start + 93)),
    year: decodeLatin1(buf.subarray(start + 93, start + 97)),
  };
}

function chainFrom(buf: Uint8Array, offset: number, audioEnd: number): FrameInfo[] | null {
  const frames: FrameInfo[] = [];
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
export function walkMp3(buf: Uint8Array): AudioWalk {
  const id3v2Bytes = Math.min(id3v2Size(buf), buf.length);
  const id3v1 = readId3v1(buf);
  const audioEnd = id3v1 ? buf.length - 128 : buf.length;

  let frames: FrameInfo[] | null = null;
  let skippedBytes = 0;
  const scanLimit = Math.min(audioEnd, id3v2Bytes + 8192);
  for (let i = id3v2Bytes; i < scanLimit; i++) {
    frames = chainFrom(buf, i, audioEnd);
    if (frames) {
      skippedBytes = i - id3v2Bytes;
      break;
    }
  }
  if (!frames) {
    throw new Error("MP3 frames do not form one continuous stream");
  }

  let samples = 0;
  for (const frame of frames) samples += frame.samples;
  const sampleRate = frames[0]!.sampleRate;
  return {
    frames,
    skippedBytes,
    leftoverBytes: 0,
    id3v2Bytes,
    id3v1,
    samples,
    duration: samples / sampleRate,
  };
}

export function sliceFrames(
  buf: Uint8Array,
  frames: FrameInfo[],
  startSec: number,
  endSec: number,
): Uint8Array {
  const rate = frames[0]?.sampleRate;
  if (!rate) return new Uint8Array();
  const startSample = Math.round(startSec * rate);
  const endSample = Math.round(endSec * rate);
  let sample = 0;
  const picked: FrameInfo[] = [];
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
