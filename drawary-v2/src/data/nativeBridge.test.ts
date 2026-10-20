import { afterEach, describe, expect, it, vi } from 'vitest';
import { deliverBackup, sendNativeFeedback, setSecureScreen, hasNativeFeedback } from './nativeBridge';
import { saveBlob, blobToBase64 } from './fileSave';

type W = { DrawaryNative?: Record<string, unknown> };
const setNative = (native: W['DrawaryNative']) => { (globalThis as unknown as { window: W }).window = { DrawaryNative: native }; };
afterEach(() => { delete (globalThis as unknown as { window?: W }).window; });

describe('native bridge (Android shell contract)', () => {
  it('sends the whole file as base64 to saveFile and returns the place the shell reports', async () => {
    const saveFile = vi.fn(async () => 'Download/Drawary');
    setNative({ saveFile });
    const blob = new Blob([new Uint8Array([0, 1, 2, 250, 251, 252])], { type: 'application/zip' });
    expect(await saveBlob(blob, 'a.zip')).toBe('Download/Drawary');
    expect(saveFile).toHaveBeenCalledWith('a.zip', 'application/zip', await blobToBase64(blob));
    expect(await blobToBase64(blob)).toBe('AAEC+vv8');
  });

  it('deliverBackup(device) goes through saveFile; drive without the shell says so', async () => {
    const saveFile = vi.fn(async () => 'Download/Drawary');
    setNative({ saveFile });
    expect(await deliverBackup('device', 'b.zip', new Blob(['x']))).toBe('Download/Drawary');
    await expect(deliverBackup('drive', 'b.zip', new Blob(['x']))).rejects.toThrow();
  });

  it('Google Drive backup goes through the phone save window; a closed window is a friendly "cancelled"', async () => {
    const saveBackupToDrive = vi.fn(async () => 'Google Drive');
    setNative({ saveBackupToDrive });
    const blob = new Blob([new Uint8Array([1, 2, 3])]);
    expect(await deliverBackup('drive', 'b.zip', blob)).toBe('Google Drive');
    expect(saveBackupToDrive).toHaveBeenCalledWith('b.zip', 'AQID');
    setNative({ saveBackupToDrive: async () => { throw new Error('cancelled'); } });
    await expect(deliverBackup('drive', 'b.zip', blob)).rejects.toThrow('저장을 취소했어요.');
    setNative({ saveBackupToDrive: async () => { throw new Error('failed'); } });
    await expect(deliverBackup('drive', 'b.zip', blob)).rejects.toThrow('Google Drive에 저장하지 못했어요.');
  });

  it('feedback: packs the attachment, passes the shell result through, and is false without a shell', async () => {
    setNative({});
    expect(hasNativeFeedback()).toBe(false);
    expect(await sendNativeFeedback({ type: 'bug', message: 'm', email: '', attachment: null })).toBe(false);
    const sendFeedback = vi.fn(async () => true);
    setNative({ sendFeedback });
    const file = new File([new Uint8Array([1, 2, 3])], 'shot.png', { type: 'image/png' });
    expect(await sendNativeFeedback({ type: 'bug', message: 'm', email: 'a@b.co', attachment: file })).toBe(true);
    const sent = JSON.parse((sendFeedback.mock.calls[0] as unknown as [string])[0]);
    expect(sent).toMatchObject({ type: 'bug', message: 'm', email: 'a@b.co', attachmentName: 'shot.png', attachmentMime: 'image/png', attachmentBase64: 'AQID' });
    setNative({ sendFeedback: async () => { throw new Error('x'); } });
    expect(await sendNativeFeedback({ type: 'bug', message: 'm', email: '', attachment: null })).toBe(false);
  });

  it('secure screen is forwarded and never throws', () => {
    const fn = vi.fn();
    setNative({ setSecureScreen: fn });
    setSecureScreen(true);
    expect(fn).toHaveBeenCalledWith(true);
    setNative({ setSecureScreen: () => { throw new Error('x'); } });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => setSecureScreen(false)).not.toThrow();
  });
});
