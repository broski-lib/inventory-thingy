import { useCallback, useEffect, useRef, useState } from "react"
import type { CompressedImage } from "@/lib/image-upload"
import {
  compressImage,
  isAcceptedImage,
  makePreviewUrl,
  revokePreviewUrl,
  ImageProcessError,
} from "@/lib/image-upload"

export type ItemPhotoState = {
  previewUrl: string | null
  pendingImage: CompressedImage | null
  error: string | null
  pickFile: () => void
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleRemove: () => void
  reset: () => void
  setError: (msg: string | null) => void
  inputRef: React.RefObject<HTMLInputElement | null>
}

export type ItemPhotoOptions = {
  onError?: (msg: string) => void
}

export function useItemPhoto({
  onError,
}: ItemPhotoOptions = {}): ItemPhotoState {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pendingImage, setPendingImage] = useState<CompressedImage | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pickFile = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ""
      if (!file) return
      if (!isAcceptedImage(file)) {
        const msg = "Unsupported image type. Use JPEG, PNG, or WebP."
        setError(msg)
        onError?.(msg)
        return
      }
      setError(null)
      try {
        const compressed = await compressImage(file)
        const url = makePreviewUrl(compressed.file)
        setPreviewUrl((prev) => {
          if (prev) revokePreviewUrl(prev)
          return url
        })
        setPendingImage(compressed)
      } catch (err) {
        const msg =
          err instanceof ImageProcessError
            ? err.message
            : "Could not process image."
        setError(msg)
        onError?.(msg)
      }
    },
    [onError]
  )

  const handleRemove = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) revokePreviewUrl(prev)
      return null
    })
    setPendingImage(null)
  }, [])

  const reset = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) revokePreviewUrl(prev)
      return null
    })
    setPendingImage(null)
    setError(null)
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) revokePreviewUrl(previewUrl)
    }
  }, [previewUrl])

  return {
    previewUrl,
    pendingImage,
    error,
    pickFile,
    handleFileChange,
    handleRemove,
    reset,
    setError,
    inputRef,
  }
}
