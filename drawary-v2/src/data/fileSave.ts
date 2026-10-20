/**
 * Hands a generated file to the user. On the web it is a normal browser
 * download and "PDF" is the browser's print dialog (choose "PDF로 저장").
 * The Android WebView shell must provide its own save/print handling for
 * these to work there (Android QA, step 6).
 */
export function saveBlob(blob: Blob, fileName: string): void {
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
  document.getElementById(PRINT_ID)?.remove();
  const root = document.createElement('div');
  root.id = PRINT_ID;
  root.innerHTML = `<style>${PRINT_CSS}</style>${html}`;
  document.body.appendChild(root);
  const cleanup = () => { root.remove(); window.removeEventListener('afterprint', cleanup); };
  window.addEventListener('afterprint', cleanup);
  // Let layout settle (fonts, table) before the print preview is taken.
  requestAnimationFrame(() => { window.print(); });
}
