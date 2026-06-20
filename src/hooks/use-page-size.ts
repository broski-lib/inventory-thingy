import { useCallback, useEffect, useRef, useState } from "react"

/**
 * usePageSize
 *
 * Page-size state backed by localStorage. Loader-relevant values must
 * also be reflected in the URL so server-side loaders can read them.
 * Use the returned `pageSize` as the source of truth, and pair it
 * with a `navigate({ search: { ...other, ps: pageSize } })` call.
 *
 * Pass `urlValue` whenever the URL holds a page-size search param; the
 * hook adopts that value (and persists it) without the caller needing
 * to wire a separate effect.
 */
export function usePageSize(
  key: string,
  defaultSize: number,
  urlValue?: number
) {
  const [pageSize, setPageSizeState] = useState<number>(() => {
    if (typeof window === "undefined") return defaultSize
    const stored = window.localStorage.getItem(key)
    if (stored) {
      const parsed = Number.parseInt(stored, 10)
      if (!Number.isNaN(parsed) && parsed > 0) return parsed
    }
    return defaultSize
  })
  const pageSizeRef = useRef(pageSize)

  const setPageSize = useCallback(
    (size: number) => {
      pageSizeRef.current = size
      setPageSizeState(size)
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, String(size))
      }
    },
    [key]
  )

  // Adopt URL-supplied values, but only when they actually change.
  // Uses a ref so the storage listener below can read the latest value
  // without re-binding on every state change.
  useEffect(() => {
    if (urlValue === undefined) return
    if (urlValue === pageSizeRef.current) return
    pageSizeRef.current = urlValue
    setPageSizeState(urlValue)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, String(urlValue))
    }
  }, [key, urlValue])

  // Sync across tabs. Reads pageSize from a ref so the listener
  // identity stays stable and we don't rebind on every change.
  useEffect(() => {
    if (typeof window === "undefined") return
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key || e.newValue === null) return
      const parsed = Number.parseInt(e.newValue, 10)
      if (
        !Number.isNaN(parsed) &&
        parsed > 0 &&
        parsed !== pageSizeRef.current
      ) {
        pageSizeRef.current = parsed
        setPageSizeState(parsed)
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [key])

  return [pageSize, setPageSize] as const
}
