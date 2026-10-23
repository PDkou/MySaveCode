import { suspendAutoLock } from './appLockGuard';

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/**
 * Hands a generated file to the user. Android shell: `DrawaryNative.saveFile` puts it in Download/Drawary and
 * resolves with that place. Plain browser: a normal download ("Download"). Rejects only when the shell fails.
 */
export async function saveBlob(blob: Blob, fileName: string): Promise<string> {
  suspendAutoLock();
  const native = window.DrawaryNative;
  if (typeof native?.saveFile === 'function') {
    return native.saveFile(fileName, blob.type || 'application/octet-stream', await blobToBase64(blob));
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a moment to start the download before the URL goes away.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'Download';
}
