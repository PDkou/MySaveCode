// One-off generator for the PWA app icons (no external image tooling
// available in this environment, so icons are drawn pixel-by-pixel and
// encoded to PNG by hand using Node's built-in zlib).
//
// Re-run with: node scripts/generate-icons.cjs
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const NAVY = [0x18, 0x26, 0x40];
const AMBER = [0xd9, 0x94, 0x35];
const CREAM = [0xf6, 0xf4, 0xef];

function mix(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

// Distance from point to a line segment, for drawing the checkmark stroke.
function segmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function drawIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const circleR = size * 0.33;
  const strokeW = size * 0.052;

  // Checkmark control points, scaled to the icon size, centered on the circle.
  const p1 = [cx - circleR * 0.5, cy + circleR * 0.02];
  const p2 = [cx - circleR * 0.12, cy + circleR * 0.42];
  const p3 = [cx + circleR * 0.58, cy - circleR * 0.38];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let color = NAVY;

      const distFromCenter = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const edge = distFromCenter - circleR;
      if (edge < 0) {
        // Soft anti-aliased edge on the amber circle.
        const t = Math.min(1, Math.max(0, 1 - edge / -1.2));
        color = edge < -1.2 ? AMBER : mix(NAVY, AMBER, t);
      }

      const d1 = segmentDistance(x + 0.5, y + 0.5, p1[0], p1[1], p2[0], p2[1]);
      const d2 = segmentDistance(x + 0.5, y + 0.5, p2[0], p2[1], p3[0], p3[1]);
      const d = Math.min(d1, d2);
      if (d < strokeW / 2) {
        color = CREAM;
      } else if (d < strokeW / 2 + 1) {
        const t = strokeW / 2 + 1 - d;
        color = mix(color, CREAM, t);
      }

      const idx = (y * size + x) * 4;
      buf[idx] = color[0];
      buf[idx + 1] = color[1];
      buf[idx + 2] = color[2];
      buf[idx + 3] = 255;
    }
  }
  return buf;
}

function crc32Buf(buf) {
  return zlib.crc32(buf);
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32Buf(crcInput) >>> 0, 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(rgba, size) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = chunk('IHDR', ihdrData);

  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // no filter
    rgba.copy(raw, rowStart + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idatData = zlib.deflateSync(raw, { level: 9 });
  const idat = chunk('IDAT', idatData);

  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function writeIcon(size, outPath) {
  const rgba = drawIcon(size);
  const png = encodePng(rgba, size);
  fs.writeFileSync(outPath, png);
  console.log(`wrote ${outPath} (${size}x${size}, ${png.length} bytes)`);
}

const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

writeIcon(192, path.join(outDir, 'icon-192.png'));
writeIcon(512, path.join(outDir, 'icon-512.png'));
writeIcon(180, path.join(outDir, 'apple-touch-icon.png'));
