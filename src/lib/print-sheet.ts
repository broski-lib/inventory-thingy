import type { PrintSize } from "./constants"

export const PRINT_SIZE_PX = {
  small: 80,
  medium: 160,
  large: 200,
} as const

/**
 * Print-order ranking so bulk tag sheets group tags of the same size
 * together. Pages of uniform-sized tags stay consistent and nothing gets
 * cut at a page boundary.
 */
export const PRINT_SIZE_ORDER: Record<PrintSize, number> = {
  large: 0,
  medium: 1,
  small: 2,
}

/**
 * Conservative number of tags (3 per row) that fit a single printed page
 * for each tag size. Sized so pages never overrun even with wide print
 * margins — a shortfall only costs a bit of whitespace, never bleed.
 */
export const TAGS_PER_PAGE: Record<PrintSize, number> = {
  small: 18,
  medium: 12,
  large: 9,
}

/**
 * Conservative number of item rows that fit a single printed rack-sheet
 * page (the repeated sheet header takes the rest).
 */
export const RACK_ROWS_PER_PAGE = 8

/** Split a list into fixed-size chunks (one chunk per printed page). */
export function chunkByPage<T>(list: T[], perPage: number): T[][] {
  const pages: T[][] = []
  for (let i = 0; i < list.length; i += perPage) {
    pages.push(list.slice(i, i + perPage))
  }
  return pages
}

/**
 * Split size-sorted tags into printed pages. Every page holds as many
 * same-sized tags as fit (see TAGS_PER_PAGE); a page never mixes sizes.
 */
export function chunkTagsByPage<T extends { printSize: PrintSize }>(
  tags: T[]
): T[][] {
  const pages: T[][] = []
  for (const tag of tags) {
    const last = pages.at(-1)
    if (
      !last ||
      last[0].printSize !== tag.printSize ||
      last.length >= TAGS_PER_PAGE[last[0].printSize]
    ) {
      pages.push([tag])
    } else {
      last.push(tag)
    }
  }
  return pages
}
