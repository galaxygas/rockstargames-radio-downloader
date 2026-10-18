function utf16le(text: string): Uint8Array {
  const out = new Uint8Array(text.length * 2);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    out[i * 2] = code & 0xff;
    out[i * 2 + 1] = code >> 8;
  }
  return out;
}

function synchsafe(size: number): number[] {
  return [(size >> 21) & 0x7f, (size >> 14) & 0x7f, (size >> 7) & 0x7f, size & 0x7f];
}

function textFrame(id: string, text: string): Uint8Array {
  const encoded = utf16le(text);
  const body = new Uint8Array(3 + encoded.length);
  body[0] = 1;
  body[1] = 0xff;
  body[2] = 0xfe;
  body.set(encoded, 3);
  const frame = new Uint8Array(10 + body.length);
  frame[0] = id.charCodeAt(0);
  frame[1] = id.charCodeAt(1);
  frame[2] = id.charCodeAt(2);
  frame[3] = id.charCodeAt(3);
  frame[4] = (body.length >>> 24) & 0xff;
  frame[5] = (body.length >>> 16) & 0xff;
  frame[6] = (body.length >>> 8) & 0xff;
  frame[7] = body.length & 0xff;
  frame.set(body, 10);
  return frame;
}

export function tagMp3(
  audio: Uint8Array,
  tags: { title: string; artist: string; album: string; year?: string },
): Uint8Array {
  const frames = [
    textFrame("TIT2", tags.title),
    textFrame("TPE1", tags.artist),
    textFrame("TALB", tags.album),
  ];
  if (tags.year) frames.push(textFrame("TYER", tags.year));
  const bodyLen = frames.reduce((sum, frame) => sum + frame.length, 0);
  const tag = new Uint8Array(10 + bodyLen);
  tag[0] = 0x49;
  tag[1] = 0x44;
  tag[2] = 0x33;
  tag[3] = 3;
  tag[4] = 0;
  const size = synchsafe(bodyLen);
  tag[6] = size[0]!;
  tag[7] = size[1]!;
  tag[8] = size[2]!;
  tag[9] = size[3]!;
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
