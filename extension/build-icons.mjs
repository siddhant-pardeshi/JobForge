// Generates the extension icons as simple gradient flame tiles. Run once with
// node extension/build-icons.mjs. No dependencies, writes real PNG files.

import zlib from 'zlib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'icons');
fs.mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = 0xffffffff;
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function makeIcon(size) {
  const rows = [];
  const stops = [[255, 92, 26], [255, 46, 136], [139, 92, 246]];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0;
    for (let x = 0; x < size; x++) {
      const t = (x + y) / (2 * size - 2);
      const seg = Math.min(1, t * (stops.length - 1));
      const i = Math.min(stops.length - 2, Math.floor(seg));
      const f = seg - i;
      const [r1, g1, b1] = stops[i];
      const [r2, g2, b2] = stops[i + 1];
      const r = Math.round(r1 + (r2 - r1) * f);
      const g = Math.round(g1 + (g2 - g1) * f);
      const b = Math.round(b1 + (b2 - b1) * f);
      // rounded corner mask
      const radius = size * 0.24;
      const cx = Math.max(radius, Math.min(size - radius, x));
      const cy = Math.max(radius, Math.min(size - radius, y));
      const dist = Math.hypot(x - cx, y - cy);
      const alpha = dist <= radius || (x >= radius && x <= size - radius) || (y >= radius && y <= size - radius) ? 255 : 0;
      const off = 1 + x * 4;
      row[off] = r; row[off + 1] = g; row[off + 2] = b; row[off + 3] = alpha;
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

for (const size of [16, 48, 128]) {
  fs.writeFileSync(path.join(outDir, `icon${size}.png`), makeIcon(size));
  console.log(`icon${size}.png written`);
}
