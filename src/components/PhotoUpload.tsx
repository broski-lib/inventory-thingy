import { HugeiconsIcon } from "@hugeicons/react"
import { Camera01Icon, Cancel01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import type { ItemPhotoState } from "@/hooks/use-item-photo"

type PhotoUploadProps = {
  state: ItemPhotoState
  alt?: string
  /** When no preview is showing, use this remote URL (e.g. /api/images/{key}) instead. */
  remoteUrl?: string | null
  /** Override the default remove behavior. Use when removing means something
   * beyond clearing the in-memory preview (e.g. flagging the saved photo for
   * deletion on submit). */
  onRemove?: () => void
}

export function PhotoUpload({
  state,
  alt = "Item photo",
  remoteUrl,
  onRemove,
}: PhotoUploadProps) {
  const {
    inputRef,
    previewUrl,
    pendingImage,
    pickFile,
    handleFileChange,
    handleRemove,
  } = state
  const src = previewUrl ?? remoteUrl ?? null
  const handleRemoveClick = onRemove ?? handleRemove

  return (
    <div className="flex flex-col gap-1.5">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="overflow-hidden rounded-lg border border-border bg-accent">
        {src ? (
          <div className="relative">
            <img
              src={src}
              alt={alt}
              className="block aspect-[4/3] w-full object-cover"
            />
            <button
              type="button"
              onClick={handleRemoveClick}
              className="absolute top-2 right-2 inline-flex size-7 cursor-pointer items-center justify-center rounded-full border border-border bg-popover/90 text-foreground shadow-xs hover:bg-popover"
              aria-label="Remove photo"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
            </button>
            {pendingImage && (
              <div className="absolute right-2 bottom-2 rounded-full bg-popover/90 px-2 py-1 text-[10px] font-semibold text-foreground shadow-xs">
                {Math.round(pendingImage.width)}×{pendingImage.height} ·{" "}
                {Math.round(pendingImage.compressedSize / 1024)} KB
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={pickFile}
            className="flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-1.5 text-muted-foreground hover:bg-secondary"
          >
            <HugeiconsIcon icon={Camera01Icon} size={28} strokeWidth={1.5} />
            <span className="text-[11px] font-semibold tracking-wider uppercase">
              Take or Choose Photo
            </span>
          </button>
        )}
      </div>
      {src && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={pickFile}
          className="w-full"
        >
          Replace Photo
        </Button>
      )}
    </div>
  )
}
