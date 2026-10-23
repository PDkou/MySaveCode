import { describe, expect, it } from 'vitest';
import { collectPhotos, photosFromNative, withImageType } from './recordPhotos';

const file = (bytes: number[], type: string, name = 'a') => new File([new Uint8Array(bytes)], name, { type });

describe('withImageType', () => {
  it('leaves a file that already says it is an image alone', async () => {
    const f = file([1, 2, 3], 'image/heic');
    expect(await withImageType(f)).toBe(f);
  });

  it('gives a real JPEG, PNG, GIF or WebP its type back when the picker reported none', async () => {
    expect((await withImageType(file([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0], ''))).type).toBe('image/jpeg');
    expect((await withImageType(file([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0], 'application/octet-stream'))).type).toBe('image/png');
    expect((await withImageType(file([0x47, 0x49, 0x46, 0x38, 0, 0, 0, 0, 0, 0, 0, 0], ''))).type).toBe('image/gif');
    expect((await withImageType(file([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50], ''))).type).toBe('image/webp');
  });

  it('keeps the name and does not turn other files into images', async () => {
    const jpeg = await withImageType(file([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0], '', 'IMG_1.jpg'));
    expect(jpeg.name).toBe('IMG_1.jpg');
    const text = file([0x68, 0x65, 0x6c, 0x6c, 0x6f], 'text/plain');
    expect((await withImageType(text)).type).toBe('text/plain');
    expect((await withImageType(file([0x68, 0x69], ''))).type).toBe('');
  });
});

describe('collectPhotos', () => {
  it('keeps the picture bytes, its type and its name', async () => {
    const jpeg = file([0xff, 0xd8, 0xff, 1, 2, 3, 4, 5, 6, 7, 8, 9], '', 'IMG_2.jpg');
    const [photo] = await collectPhotos([jpeg]);
    expect(photo.type).toBe('image/jpeg');
    expect(photo.name).toBe('IMG_2.jpg');
    expect(photo.size).toBe(12);
  });

  it('says so when nothing came back, nothing could be read, or the files are not pictures', async () => {
    await expect(collectPhotos([])).rejects.toThrow();
    await expect(collectPhotos([file([], 'image/jpeg')])).rejects.toThrow();
    await expect(collectPhotos([file([0x68, 0x69], 'text/plain')])).rejects.toThrow();
  });

  it('uses the pictures it could read and drops the rest', async () => {
    const photos = await collectPhotos([file([0x68, 0x69], 'text/plain'), file([1, 2, 3], 'image/png', 'b.png')]);
    expect(photos.map((p) => p.name)).toEqual(['b.png']);
  });
});

describe('photosFromNative', () => {
  const b64 = (bytes: number[]) => btoa(String.fromCharCode(...bytes));

  it('turns the shell\'s base64 JPEGs into files', () => {
    const files = photosFromNative({ photos: [{ name: 'a.jpg', data: b64([0xff, 0xd8, 0xff, 1, 2]) }, { name: 'b.jpg', data: b64([0xff, 0xd8, 0xff, 3]) }], failed: 0, reason: '' });
    expect(files.map((f) => [f.name, f.type, f.size])).toEqual([['a.jpg', 'image/jpeg', 5], ['b.jpg', 'image/jpeg', 4]]);
  });

  it('keeps the pictures that could be read and reports nothing when some failed', () => {
    expect(photosFromNative({ photos: [{ name: 'a.jpg', data: b64([1, 2, 3]) }], failed: 1, reason: 'X' })).toHaveLength(1);
  });

  it('says why when no picture could be read', () => {
    expect(() => photosFromNative({ photos: [], failed: 2, reason: 'DecodeException: bad' })).toThrow('DecodeException: bad');
  });

  it('never returns more than the record can hold', () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ name: `${i}.jpg`, data: b64([i + 1]) }));
    expect(photosFromNative({ photos: many, failed: 0, reason: '' })).toHaveLength(3);
  });
});
