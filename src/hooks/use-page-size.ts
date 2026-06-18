import { useCallback, useEffect, useState } from "react"

/**
 * usePageSize
 *
 * Page-size state backed by localStorage. Loader-relevant values must
 * also be reflected in the URL so server-side loaders can read them.
 * Use the returned `pageSize` as the source of truth, and pair it
 * with a `navigate({ search: { ...other, ps: pageSize } })` call.
 *
 * On mount, if the URL already has `ps`, that value wins (deep link
 * to a specific page size) and the localStorage entry is updated.
 */
export function usePageSize(key: string, defaultSize: number) {
  const [pageSize, setPageSizeState] = useState<number>(() => {
    if (typeof window === "undefined") return defaultSize
    const stored = window.localStorage.getItem(key)
    if (stored) {
      const parsed = Number.parseInt(stored, 10)
      if (!Number.isNaN(parsed) && parsed > 0) return parsed
    }
    return defaultSize
  })

  const setPageSize = useCallback(
    (size: number) => {
      setPageSizeState(size)
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, String(size))
      }
    },
    [key]
  )

  /**
   * Sync hook state from an external source (e.g. a URL search param).
   * If `urlValue` is defined and differs from the current page size,
   * adopt it and persist it. Use this on mount and whenever the URL
   * changes from outside the hook.
   */
  const syncFromUrl = useCallback(
    (urlValue: number | undefined) => {
      if (urlValue === undefined) return
      if (urlValue === pageSize) return
      setPageSizeState(urlValue)
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, String(urlValue))
      }
    },
    [key, pageSize]
  )

  // Sync across tabs.
  useEffect(() => {
    if (typeof window === "undefined") return
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key || e.newValue === null) return
      const parsed = Number.parseInt(e.newValue, 10)
      if (!Number.isNaN(parsed) && parsed > 0 && parsed !== pageSize) {
        setPageSizeState(parsed)
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [key, pageSize])

  return [pageSize, setPageSize, syncFromUrl] as const
}
