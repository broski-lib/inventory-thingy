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
