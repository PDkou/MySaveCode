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
const PURPLE = [0x6f, 0x5b, 0xd3];
const CREAM = [0xf6, 0xf4, 0xef];

// Standard ray-casting point-in-polygon test.
function pointInPolygon(px, py, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const intersects = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInCircle(px, py, cx, cy, r) {
  return Math.hypot(px - cx, py - cy) <= r;
}

// Supersampled render: evaluate shape membership on a fine subpixel grid and
// average each block down to the final pixel, which gives smooth
// anti-aliased edges on the circle/house/door without hand-written AA math
// per shape.
function drawIcon(size) {
  const SS = 4;
  const superSize = size * SS;
  const cx = superSize / 2;
  const cy = superSize / 2;
  const circleR = superSize * 0.33;

  // Simple house silhouette (square body + triangular roof, no overhang),
  // sized to sit comfortably inside the circle badge.
  const unit = circleR * 0.6;
  const eavesY = cy - unit * 0.05;
  const bottomY = cy + unit * 0.95;
  const apexY = cy - unit * 1.15;
  const house = [
    [cx - unit, bottomY],
    [cx - unit, eavesY],
    [cx, apexY],
    [cx + unit, eavesY],
    [cx + unit, bottomY],
  ];

  // A small door cut-out, punched through the house back to the background
  // color, for recognizability as a "home" glyph at small sizes.
  const doorW = unit * 0.42;
  const doorH = unit * 0.62;
  const doorX0 = cx - doorW / 2;
  const doorX1 = cx + doorW / 2;
  const doorY0 = bottomY - doorH;
  const doorY1 = bottomY;

  // Render at supersample resolution first.
  const superBuf = new Uint8Array(superSize * superSize * 3);
  for (let y = 0; y < superSize; y++) {
    for (let x = 0; x < superSize; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      let color = NAVY;
      if (pointInCircle(px, py, cx, cy, circleR)) {
        color = PURPLE;
        if (pointInPolygon(px, py, house)) {
          color = CREAM;
          if (px >= doorX0 && px <= doorX1 && py >= doorY0 && py <= doorY1) {
            color = PURPLE;
          }
        }
      }
      const idx = (y * superSize + x) * 3;
      superBuf[idx] = color[0];
      superBuf[idx + 1] = color[1];
      superBuf[idx + 2] = color[2];
    }
  }

  // Box-downsample SSxSS blocks to the final pixel size.
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const idx = ((y * SS + sy) * superSize + (x * SS + sx)) * 3;
          r += superBuf[idx];
          g += superBuf[idx + 1];
          b += superBuf[idx + 2];
        }
      }
      const n = SS * SS;
      const outIdx = (y * size + x) * 4;
      buf[outIdx] = Math.round(r / n);
      buf[outIdx + 1] = Math.round(g / n);
      buf[outIdx + 2] = Math.round(b / n);
      buf[outIdx + 3] = 255;
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
