/**
 * Parse a URL search-param value into a positive integer page number.
 * Accepts numbers and numeric strings; returns undefined for anything else.
 */
export function parsePage(value: unknown): number | undefined {
  if (typeof value === "number" && value > 0) return Math.floor(value)
  if (typeof value === "string" && value.length > 0) {
    const n = Number(value)
    if (Number.isFinite(n) && n > 0) return Math.floor(n)
  }
  return undefined
}
