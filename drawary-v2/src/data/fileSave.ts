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

const PRINT_ID = 'drawary-print-root';
const PRINT_CSS = `
#${PRINT_ID}{display:none}
@media print{
  @page{size:A4 landscape;margin:12mm}
  body>*:not(#${PRINT_ID}){display:none!important}
  #${PRINT_ID}{display:block;font-family:'Noto Sans CJK KR','Noto Sans KR',sans-serif;color:#222}
  #${PRINT_ID} h1{font-size:18pt;margin:0 0 2mm}
  #${PRINT_ID} .meta{font-size:9pt;color:#666;margin:0 0 5mm}
  #${PRINT_ID} table{width:100%;border-collapse:collapse;font-size:9pt}
  #${PRINT_ID} th,#${PRINT_ID} td{border:1px solid #bbb;padding:2mm 2.5mm;text-align:left;vertical-align:top;overflow-wrap:anywhere}
  #${PRINT_ID} th{background:#efe9fb;font-weight:700}
  #${PRINT_ID} td.first{font-weight:700}
  #${PRINT_ID} td.none{text-align:center;color:#888}
  #${PRINT_ID} thead{display:table-header-group}
  #${PRINT_ID} tr{break-inside:avoid}
}`;

/** Prints the given HTML on its own pages (the rest of the app is hidden while printing). */
export function printHtml(html: string): void {
  suspendAutoLock(30_000);
  document.getElementById(PRINT_ID)?.remove();
  const root = document.createElement('div');
  root.id = PRINT_ID;
  root.innerHTML = `<style>${PRINT_CSS}</style>${html}`;
  document.body.appendChild(root);
  const cleanup = () => { root.remove(); window.removeEventListener('afterprint', cleanup); };
  window.addEventListener('afterprint', cleanup);
  // Let layout settle (fonts, table) before the print preview is taken.
  requestAnimationFrame(() => {
    // A WebView cannot open the print dialog by itself; the Android shell prints this page (the same print CSS applies).
    if (typeof window.DrawaryNative?.printPage === 'function') window.DrawaryNative.printPage();
    else window.print();
  });
}
