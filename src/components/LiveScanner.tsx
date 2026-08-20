import { useCallback, useEffect, useRef, useState } from "react"
import type {
  Html5Qrcode,
  QrcodeErrorCallback,
  QrcodeSuccessCallback,
} from "html5-qrcode"

type LiveScannerProps = {
  active: boolean
  paused: boolean
  onDetected: (text: string) => void | Promise<void>
  onError?: (message: string) => void
  onStatusChange?: (status: LiveScannerStatus) => void
}

export type LiveScannerStatus =
  "idle" | "starting" | "scanning" | "paused" | "denied" | "error" | "stopped"

const ELEMENT_ID = "live-qr-reader"
const DEBOUNCE_MS = 1200

let ScannerClass: typeof Html5Qrcode | null = null
let ScannerState: { SCANNING: number; PAUSED: number } | null = null

async function loadScanner() {
  if (ScannerClass && ScannerState)
    return { Html5Qrcode: ScannerClass, Html5QrcodeScannerState: ScannerState }
  const mod = await import("html5-qrcode")
  ScannerClass = mod.Html5Qrcode
  ScannerState = {
    SCANNING: mod.Html5QrcodeScannerState.SCANNING,
    PAUSED: mod.Html5QrcodeScannerState.PAUSED,
  }
  return { Html5Qrcode: ScannerClass, Html5QrcodeScannerState: ScannerState }
}

export function LiveScanner({
  active,
  paused,
  onDetected,
  onError,
  onStatusChange,
}: LiveScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [status, setStatus] = useState<LiveScannerStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const onDetectedRef = useRef(onDetected)
  const busyRef = useRef(false)

  useEffect(() => {
    onDetectedRef.current = onDetected
  }, [onDetected])

  const updateStatus = useCallback(
    (next: LiveScannerStatus, msg?: string | null) => {
      setStatus(next)
      if (msg !== undefined) setErrorMessage(msg)
      onStatusChange?.(next)
    },
    [onStatusChange]
  )

  useEffect(() => {
    if (!active) return

    let cancelled = false
    updateStatus("starting")
    setErrorMessage(null)

    // Assigned asynchronously; the cleanup below may run before the
    // scanner module resolves, so it can still be undefined there.
    let scanner: Html5Qrcode | undefined

    loadScanner().then(({ Html5Qrcode }) => {
      if (cancelled) return

      scanner = new Html5Qrcode(ELEMENT_ID, false)
      scannerRef.current = scanner
      const sc = scanner

      const onSuccess: QrcodeSuccessCallback = (decodedText) => {
        if (busyRef.current) return
        busyRef.current = true
        void (async () => {
          try {
            await onDetectedRef.current(decodedText)
          } finally {
            setTimeout(() => {
              busyRef.current = false
            }, DEBOUNCE_MS)
          }
        })()
      }

      const onFailure: QrcodeErrorCallback = () => {}

      sc.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        onSuccess,
        onFailure
      )
        .then(() => {
          if (cancelled) {
            void sc.stop().catch(() => {})
            return
          }
          updateStatus("scanning")
        })
        .catch((err: unknown) => {
          if (cancelled) return
          const message = err instanceof Error ? err.message : String(err)
          if (/permission|denied|notallowed/i.test(message)) {
            updateStatus(
              "denied",
              "Camera access denied. Allow camera in your browser settings."
            )
          } else if (/notfound|no\scamera/i.test(message)) {
            updateStatus("error", "No camera found on this device.")
          } else {
            updateStatus("error", message)
          }
          onError?.(message)
        })
    })

    return () => {
      cancelled = true
      busyRef.current = false
      scannerRef.current = null
      if (scanner) {
        const sc = scanner
        try {
          loadScanner()
            .then(({ Html5QrcodeScannerState }) => {
              const state = sc.getState()
              if (
                state === Html5QrcodeScannerState.SCANNING ||
                state === Html5QrcodeScannerState.PAUSED
              ) {
                void sc.stop().catch(() => {})
              } else {
                sc.clear()
              }
            })
            .catch(() => {
              try {
                sc.clear()
              } catch {
                /* noop */
              }
            })
        } catch {
          try {
            sc.clear()
          } catch {
            /* noop */
          }
        }
      }
      updateStatus("stopped")
    }
  }, [active, updateStatus])

  useEffect(() => {
    const scanner = scannerRef.current
    if (!scanner) return
    if (paused) {
      try {
        scanner.pause(true)
        updateStatus("paused")
      } catch {
        /* noop */
      }
    } else if (status === "paused") {
      try {
        scanner.resume()
        updateStatus("scanning")
      } catch {
        /* noop */
      }
    }
  }, [paused, status, updateStatus])

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <div
        id={ELEMENT_ID}
        className="relative aspect-square w-full max-w-96 overflow-hidden rounded-2xl bg-black [&_div]:border-none! [&_img]:hidden [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
      />
      {status === "starting" && (
        <p className="text-center text-xs text-muted-foreground">
          Starting camera…
        </p>
      )}
      {status === "denied" && (
        <p className="text-center text-xs text-destructive">{errorMessage}</p>
      )}
      {status === "error" && (
        <p className="text-center text-xs text-destructive">{errorMessage}</p>
      )}
    </div>
  )
}
