import { describe, expect, it } from 'vitest';
import { buildZip, crc32, readZip, ZipError } from './zip';
import { deflateRawSync } from 'node:zlib';

const text = (s: string) => new TextEncoder().encode(s);

describe('zip', () => {
  it('has the standard CRC-32', () => {
    expect(crc32(text('123456789'))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
  });

  it('round-trips files, including Korean names and binary data', async () => {
    const bin = Uint8Array.from({ length: 5000 }, (_, i) => (i * 31) % 256);
    const zip = buildZip([{ name: 'backup.json', data: text('{"a":1}') }, { name: 'photos/화장품/1.jpg', data: bin }, { name: 'empty', data: new Uint8Array() }]);
    const back = await readZip(zip);
    expect(back.map((e) => e.name)).toEqual(['backup.json', 'photos/화장품/1.jpg', 'empty']);
    expect(new TextDecoder().decode(back[0].data)).toBe('{"a":1}');
    expect(Array.from(back[1].data)).toEqual(Array.from(bin));
    expect(back[2].data.length).toBe(0);
  });

  it('makes the same bytes for the same files', () => {
    const a = buildZip([{ name: 'x', data: text('hello') }]);
    const b = buildZip([{ name: 'x', data: text('hello') }]);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('reads a zip made by a computer\'s zip tool (deflate-compressed)', async () => {
    const payload = text('안녕하세요 '.repeat(200));
    const comp = deflateRawSync(payload);
    const name = text('note.txt');
    const crc = crc32(payload);
    const local = new Uint8Array(30 + name.length); const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(8, 8, true); lv.setUint32(14, crc, true);
    lv.setUint32(18, comp.length, true); lv.setUint32(22, payload.length, true); lv.setUint16(26, name.length, true); local.set(name, 30);
    const cd = new Uint8Array(46 + name.length); const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(10, 8, true); cv.setUint32(16, crc, true); cv.setUint32(20, comp.length, true);
    cv.setUint32(24, payload.length, true); cv.setUint16(28, name.length, true); cv.setUint32(42, 0, true); cd.set(name, 46);
    const end = new Uint8Array(22); const ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, 1, true); ev.setUint16(10, 1, true); ev.setUint32(12, cd.length, true); ev.setUint32(16, local.length + comp.length, true);
    const zip = new Uint8Array([...local, ...comp, ...cd, ...end]);
    const back = await readZip(zip);
    expect(new TextDecoder().decode(back[0].data)).toBe(new TextDecoder().decode(payload));
  });

  it('refuses things that are not a zip, a changed byte, or a cut-off file', async () => {
    await expect(readZip(text('just text, not a zip file at all'))).rejects.toBeInstanceOf(ZipError);
    const zip = buildZip([{ name: 'a', data: text('some data here') }]);
    const flipped = zip.slice(); flipped[30 + 1 + 3] ^= 0xff; // inside the file's bytes
    await expect(readZip(flipped)).rejects.toThrow(/damaged/);
    await expect(readZip(zip.slice(0, zip.length - 30))).rejects.toBeInstanceOf(ZipError);
  });

  it('refuses an encrypted entry', async () => {
    const zip = buildZip([{ name: 'a', data: text('x') }]);
    const patched = zip.slice(); const v = new DataView(patched.buffer);
    const cd = patched.length - 22 - (46 + 1); v.setUint16(cd + 8, v.getUint16(cd + 8, true) | 1, true);
    await expect(readZip(patched)).rejects.toThrow(/encrypted/);
  });
});
