/**
 * Generates the PWA PNG icons (heart on a blue-green gradient) without any
 * image dependencies, by writing raw PNG chunks. Run: node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../public/icons');
mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function inHeart(nx, ny) {
  // Classic heart curve: (x^2 + y^2 - 1)^3 - x^2 y^3 <= 0, in [-1.4, 1.4]
  const x = nx * 2.6;
  const y = -ny * 2.6 + 0.25;
  const a = x * x + y * y - 1;
  return a * a * a - x * x * y * y * y <= 0;
}

function makeIcon(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  let off = 0;
  for (let y = 0; y < size; y++) {
    raw[off++] = 0; // filter none
    for (let x = 0; x < size; x++) {
      const t = (x + y) / (2 * size);
      // blue -> green gradient
      let r = Math.round(29 + t * (16 - 29));
      let g = Math.round(111 + t * (150 - 111));
      let b = Math.round(209 + t * (105 - 209));
      const nx = (x / size) * 2 - 1;
      const ny = (y / size) * 2 - 1;
      if (inHeart(nx * 1.45, ny * 1.45)) {
        r = 255;
        g = 255;
        b = 255;
      }
      raw[off++] = r;
      raw[off++] = g;
      raw[off++] = b;
      raw[off++] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(join(outDir, `icon-${size}.png`), png);
  console.log(`wrote icon-${size}.png (${png.length} bytes)`);
}

makeIcon(192);
makeIcon(512);
