import { describe, expect, it } from 'vitest';
import { withImageType } from './recordPhotos';

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
