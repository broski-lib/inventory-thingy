import { escapeHtml } from "./html"

export type PrintableQR = {
  name: string
  qrCode: string
  dataUrl: string
}

export type SingleTagItem = {
  qrCode: string
  dataUrl: string
  itemName: string
}

const AUTO_PRINT = `window.onload = function () {
    setTimeout(function () { window.print(); }, 200);
    window.onafterprint = function () { window.close(); };
  };`

const SIMPLE_AUTO_PRINT = `window.onload = function () {
    window.print();
    window.onafterprint = function () { window.close() };
  }`

export function openPrintWindow(html: string, features: string): Window | null {
  const w = window.open("", "_blank", features)
  if (!w) return null
  w.document.write(html)
  w.document.close()
  return w
}

export function bulkPrintSheet(items: PrintableQR[]): string {
  return `<!doctype html>
<html>
<head>
  <title>QR Tag Sheet (${items.length})</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #000; background: #fff; padding: 4px; }
    h1 { font-size: 10px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 6px; text-align: center; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; }
    .cell { border: 1px dashed #000; padding: 3px 2px; text-align: center; break-inside: avoid; page-break-inside: avoid; display: flex; flex-direction: column; align-items: center; gap: 1px; }
    .cell img { width: 100%; max-width: 160px; height: auto; aspect-ratio: 1 / 1; display: block; }
    .id { font-size: 8px; font-weight: 700; letter-spacing: 0.02em; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    @page { size: letter; margin: 0.3in; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <h1>QR Tag Sheet — ${items.length} item${items.length === 1 ? "" : "s"}</h1>
  <div class="grid">
    ${items
      .map(
        (item) => `
      <div class="cell">
        <img src="${item.dataUrl}" alt="QR for ${escapeHtml(item.qrCode)}" />
        <div class="id">${escapeHtml(item.qrCode)}</div>
      </div>
    `
      )
      .join("")}
  </div>
  <script>${AUTO_PRINT}</script>
</body>
</html>`
}

export function singleTagSheet({
  qrCode,
  dataUrl,
  itemName,
}: SingleTagItem): string {
  return `<!doctype html>
<html>
<head>
  <title>QR Tag - ${escapeHtml(qrCode)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { display: flex; flex-direction: column; align-items: center; padding: 12px; font-family: ui-monospace, monospace; font-size: 11px; color: oklch(0.185 0.005 150); }
    img { width: 75px; height: 75px; display: block; }
    .name { margin-top: 6px; font-weight: 600; max-width: 200px; text-align: center; }
    .code { margin-top: 2px; font-size: 10px; color: oklch(0.503 0.014 130); }
    @page { margin: 0; size: auto; }
  </style>
</head>
<body>
  <img src="${dataUrl}" alt="QR for ${escapeHtml(qrCode)}" />
  <p class="name">${escapeHtml(itemName)}</p>
  <p class="code">${escapeHtml(qrCode)}</p>
  <script>${SIMPLE_AUTO_PRINT}</script>
</body>
</html>`
}
