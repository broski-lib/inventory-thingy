import { useEffect, useState } from "react"

const COMPACT_KEY = "stock:compact-cards"

/** Compact vs full item-card preference, persisted in localStorage. */
export function useCompactCards() {
  const [compact, setCompact] = useState(() => {
    if (typeof window === "undefined") return false
    return window.localStorage.getItem(COMPACT_KEY) === "1"
  })

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(COMPACT_KEY, compact ? "1" : "0")
    }
  }, [compact])

  return [compact, setCompact] as const
}