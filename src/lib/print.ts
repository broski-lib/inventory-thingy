import { getQrImage } from "./qr"
import type { PrintSize } from "./constants"
import {
  PRINT_SIZE_ORDER,
  PRINT_SIZE_PX,
  RACK_ROWS_PER_PAGE,
  chunkByPage,
  chunkTagsByPage,
} from "./print-sheet"

export type PrintTag = {
  name: string
  qrCode: string
  printSize: PrintSize
}

export type RackSheetItem = {
  name: string
  qrCode: string
}

const ESC: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ESC[c])
}

/**
 * Print an HTML document from an off-screen `about:blank` iframe. The iframe
 * has no URL, so the browser omits the URL footer/link from the printed
 * output. It keeps real dimensions (positioned off-screen, not 0×0/hidden)
 * so images decode and the dialog prints correctly.
 */
export function printHtml(html: string): Promise<void> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe")
    iframe.setAttribute("aria-hidden", "true")
    // Letter page at 96dpi; positioned off-screen so it has real layout.
    iframe.style.cssText =
      "position:fixed;left:-10000px;top:0;width:816px;height:1056px;border:0;"
    document.body.appendChild(iframe)

    const win = iframe.contentWindow
    const doc = iframe.contentDocument
    if (!win || !doc) {
      iframe.remove()
      resolve()
      return
    }

    let started = false
    const doPrint = () => {
      if (started) return
      started = true
      win.focus()
      win.print()
      win.addEventListener("afterprint", cleanup, { once: true })
      win.addEventListener("pagehide", cleanup, { once: true })
      // Safety net if the browser never fires afterprint.
      window.setTimeout(cleanup, 60_000)
    }

    const cleanup = () => {
      if (document.body.contains(iframe)) iframe.remove()
      resolve()
    }

    // Open the dialog once every image has loaded (or errored).
    const start = () => {
      const images = Array.from(doc.images)
      if (images.length === 0) {
        doPrint()
        return
      }
      let pending = images.length
      const settle = () => {
        pending -= 1
        if (pending === 0) doPrint()
      }
      for (const img of images) {
        if (img.complete) {
          settle()
        } else {
          img.addEventListener("load", settle, { once: true })
          img.addEventListener("error", settle, { once: true })
        }
      }
    }

    doc.open()
    doc.write(html)
    doc.close()

    if (doc.readyState === "complete") {
      start()
    } else {
      win.addEventListener("load", start, { once: true })
    }

    // Hard fallback: a stalled image can never leave the button dead.
    window.setTimeout(() => {
      if (iframe.isConnected) doPrint()
    }, 5000)
  })
}

const SHELL = (headCss: string, body: string) => `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #fff; color: #000; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
  @page { margin: 12mm; }
  ${headCss}
</style>
</head>
<body>${body}</body>
</html>`

/** Print a single item's QR tag. */
export async function printSingleTag(tag: PrintTag): Promise<void> {
  const url = await getQrImage(tag.qrCode, { width: 256, margin: 2 })
  const px = PRINT_SIZE_PX[tag.printSize]
  const html = SHELL(
    `
    body { text-align: center; padding: 16px; }
    .qr { display: block; margin: 0 auto; }
    .name { margin-top: 10px; font-size: 14px; font-weight: 600; }
    .code { margin-top: 4px; font-family: monospace; font-size: 11px; }
  `,
    `
    <img class="qr" src="${url}" width="${px}" height="${px}" alt="" />
    <div class="name">${esc(tag.name)}</div>
    <div class="code">${esc(tag.qrCode)}</div>
  `
  )
  await printHtml(html)
}

/** Print a sheet of QR tags (3 per row, paginated by tag size). */
export async function printTagSheet(items: PrintTag[]): Promise<void> {
  const sorted = [...items].sort(
    (a, b) =>
      PRINT_SIZE_ORDER[a.printSize] - PRINT_SIZE_ORDER[b.printSize] ||
      a.qrCode.localeCompare(b.qrCode)
  )
  const urls = await Promise.all(
    sorted.map((it) => getQrImage(it.qrCode, { width: 256, margin: 1 }))
  )
  const urlByCode = new Map(sorted.map((it, i) => [it.qrCode, urls[i]]))
  const pages = chunkTagsByPage(sorted)

  const body = pages
    .map(
      (page) =>
        `<div class="page">${page
          .map((it) => {
            const px = PRINT_SIZE_PX[it.printSize]
            return `<div class="cell"><img src="${urlByCode.get(it.qrCode)}" width="${px}" height="${px}" alt="" /><div class="code">${esc(it.qrCode)}</div><div class="name">${esc(it.name)}</div></div>`
          })
          .join("")}</div>`
    )
    .join("")

  const html = SHELL(
    `
    .page { display: grid; grid-template-columns: repeat(3, 1fr); page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .cell { border: 0.5px solid #000; padding: 4px 2px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; overflow: hidden; page-break-inside: avoid; }
    .cell img { display: block; }
    .code { font-family: monospace; font-size: 7px; font-weight: 700; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .name { font-size: 6px; color: #444; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  `,
    body
  )
  await printHtml(html)
}

/** Print a rack sheet with the header repeated on every page. */
export async function printRackSheet(
  rack: { name: string; qrCode: string; location: string },
  items: RackSheetItem[]
): Promise<void> {
  const rackUrl = await getQrImage(rack.qrCode, { width: 256, margin: 1 })
  const rows = await Promise.all(
    items.map(async (it) => ({
      name: it.name,
      qrCode: it.qrCode,
      url: await getQrImage(it.qrCode, { width: 128, margin: 0 }),
    }))
  )
  const pages = rows.length === 0 ? [[]] : chunkByPage(rows, RACK_ROWS_PER_PAGE)

  const header = `<div class="head">
    <div>
      <div class="title">${esc(rack.name)}</div>
      <div class="sub">${esc(rack.qrCode)}</div>
      ${rack.location ? `<div class="sub">${esc(rack.location)}</div>` : ""}
    </div>
    <img src="${rackUrl}" width="96" height="96" alt="" />
  </div>`

  const body = pages
    .map(
      (page) =>
        `<div class="page">${header}${page
          .map(
            (row) => `<div class="row">
              <div>
                <div class="name">${esc(row.name)}</div>
                <div class="code">${esc(row.qrCode)}</div>
              </div>
              <img src="${row.url}" width="48" height="48" alt="" />
            </div>`
          )
          .join("")}</div>`
    )
    .join("")

  const html = SHELL(
    `
    .page { border: 1px solid #000; padding: 12px; page-break-after: always; page-break-inside: avoid; }
    .page:last-child { page-break-after: auto; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; border-bottom: 1px solid #000; padding-bottom: 8px; margin-bottom: 4px; }
    .head img { width: 96px; height: 96px; }
    .title { font-size: 16px; font-weight: 700; text-transform: uppercase; }
    .sub { font-family: monospace; font-size: 9px; color: #333; }
    .row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid #000; page-break-inside: avoid; }
    .row .name { font-size: 12px; font-weight: 600; }
    .row .code { font-family: monospace; font-size: 9px; color: #333; }
    .row img { width: 48px; height: 48px; }
  `,
    body
  )
  await printHtml(html)
}
