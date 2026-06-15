export type PieceCategory =
  | "SOF"
  | "CHR"
  | "TBL"
  | "LMP"
  | "RUG"
  | "ART"
  | "MIR"
  | "BNK"
  | "BDR"
  | "DES"
  | "STL"
  | "ACC"

export type StagingArea = "STG" | "WRH" | "IN" | "OUT" | "RET" | "REP"

export const PIECE_CATEGORIES: { code: PieceCategory; label: string }[] = [
  { code: "SOF", label: "Sofa" },
  { code: "CHR", label: "Chair" },
  { code: "TBL", label: "Table" },
  { code: "LMP", label: "Lamp" },
  { code: "RUG", label: "Rug" },
  { code: "ART", label: "Art" },
  { code: "MIR", label: "Mirror" },
  { code: "BNK", label: "Bench" },
  { code: "BDR", label: "Bedframe" },
  { code: "DES", label: "Desk" },
  { code: "STL", label: "Stool" },
  { code: "ACC", label: "Accessory" },
]

export const STAGING_AREAS: { code: StagingArea; label: string }[] = [
  { code: "STG", label: "Staging" },
  { code: "WRH", label: "Warehouse" },
  { code: "IN", label: "Intake" },
  { code: "OUT", label: "Outbound" },
  { code: "RET", label: "Retired" },
  { code: "REP", label: "Repair" },
]

const PIECE_WEIGHTED: PieceCategory[] = [
  "SOF",
  "SOF",
  "SOF",
  "CHR",
  "CHR",
  "CHR",
  "TBL",
  "TBL",
  "LMP",
  "LMP",
  "RUG",
  "ART",
  "MIR",
  "BNK",
  "BDR",
  "DES",
  "STL",
  "ACC",
]

const AREA_WEIGHTED: StagingArea[] = [
  "STG",
  "STG",
  "STG",
  "STG",
  "WRH",
  "WRH",
  "WRH",
  "WRH",
  "IN",
  "OUT",
]

function pick<T>(items: readonly T[]): T {
  const idx = Math.floor(Math.random() * items.length)
  const value = items[idx]
  if (value === undefined) {
    throw new Error("pick(): empty list")
  }
  return value
}

function yymm(date: Date): string {
  const yy = String(date.getFullYear()).slice(-2)
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  return `${yy}${mm}`
}

function seq4(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

export type QrCodeOptions = {
  area?: StagingArea
  category?: PieceCategory
  date?: Date
}

export type QrCodeParts = {
  full: string
  area: StagingArea
  category: PieceCategory
  period: string
  sequence: string
}

export function generateQrCodeParts(options: QrCodeOptions = {}): QrCodeParts {
  const area = options.area ?? pick(AREA_WEIGHTED)
  const category = options.category ?? pick(PIECE_WEIGHTED)
  const period = yymm(options.date ?? new Date())
  const sequence = seq4()
  const full = `${area}-${category}-${period}-${sequence}`
  return { full, area, category, period, sequence }
}

export function generateQrCode(options: QrCodeOptions = {}): string {
  return generateQrCodeParts(options).full
}

export function pieceLabel(code: string): string {
  return PIECE_CATEGORIES.find((c) => c.code === code)?.label ?? code
}

export function areaLabel(code: string): string {
  return STAGING_AREAS.find((a) => a.code === code)?.label ?? code
}

export function parseQrCode(code: string): Partial<QrCodeParts> {
  const parts = code.split("-")
  if (parts.length !== 4) return { full: code }
  const [area, category, period, sequence] = parts
  return {
    full: code,
    area: area as StagingArea,
    category: category as PieceCategory,
    period,
    sequence,
  }
}
