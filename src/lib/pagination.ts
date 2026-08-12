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

export function parsePageSize(
  value: unknown,
  options: readonly number[]
): number | undefined {
  const n = Number.parseInt(String(value ?? ""), 10)
  if (Number.isNaN(n)) return undefined
  return options.includes(n) ? n : undefined
}
