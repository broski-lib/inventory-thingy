import * as React from "react"

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia(query).matches
  })

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const mql = window.matchMedia(query)
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches)
    setMatches(mql.matches)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [query])

  return matches
}
