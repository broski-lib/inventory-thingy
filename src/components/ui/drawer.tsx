import * as React from "react"
import { Dialog as DrawerPrimitive } from "@base-ui/react/dialog"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

function Drawer({ ...props }: DrawerPrimitive.Root.Props) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />
}

function DrawerTrigger({ ...props }: DrawerPrimitive.Trigger.Props) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

function DrawerPortal({ ...props }: DrawerPrimitive.Portal.Props) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />
}

function DrawerClose({ ...props }: DrawerPrimitive.Close.Props) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
}

function DrawerOverlay({
  className,
  ...props
}: DrawerPrimitive.Backdrop.Props) {
  return (
    <DrawerPrimitive.Backdrop
      data-slot="drawer-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/40 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

type DrawerContentProps = DrawerPrimitive.Popup.Props & {
  /** Show a small grab handle at the top. Doubles as the drag-to-dismiss area. */
  showHandle?: boolean
  /** Show a round close (X) button in the top-right corner. */
  showCloseButton?: boolean
  /** Called when the user drags the drawer down past the dismiss threshold. */
  onClose?: () => void
  /** Dismiss threshold in pixels (drag distance). Default 100. */
  dismissThreshold?: number
}

const DRAG_TRANSITION = "transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)"

function DrawerContent({
  className,
  children,
  showHandle = true,
  showCloseButton = true,
  onClose,
  dismissThreshold = 100,
  ...props
}: DrawerContentProps) {
  const contentRef = React.useRef<HTMLDivElement | null>(null)
  const dragStartY = React.useRef<number | null>(null)
  const lastDelta = React.useRef(0)

  // Refs that mirror props so the touch handlers always see the latest
  // values without re-binding (which would break an in-flight drag).
  const onCloseRef = React.useRef(onClose)
  const thresholdRef = React.useRef(dismissThreshold)
  React.useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])
  React.useEffect(() => {
    thresholdRef.current = dismissThreshold
  }, [dismissThreshold])

  const handleDragHandleTouchStart = (e: React.TouchEvent) => {
    if (!contentRef.current) return
    // Allow the user to start a drag from the handle OR any descendant of
    // the drawer header. We only block when the touch originates on a
    // form control or interactive element inside the header.
    const target = e.target as HTMLElement
    if (
      target.closest(
        'button, a, input, textarea, select, [role="button"], [data-no-drag]'
      )
    ) {
      dragStartY.current = null
      return
    }
    dragStartY.current = e.touches[0].clientY
    // Disable transition + touch-scroll while dragging so the sheet
    // tracks the finger 1:1.
    contentRef.current.style.transition = "none"
    contentRef.current.style.touchAction = "none"
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const startY = dragStartY.current
    if (startY === null || !contentRef.current) return
    const delta = e.touches[0].clientY - startY
    // Only allow dragging downward.
    if (delta < 0) return
    lastDelta.current = delta
    contentRef.current.style.transform = `translateY(${delta}px)`
  }

  const handleTouchEnd = () => {
    if (dragStartY.current === null || !contentRef.current) return
    const delta = lastDelta.current
    dragStartY.current = null
    lastDelta.current = 0
    if (delta > thresholdRef.current) {
      // Snap straight off-screen and close. The dialog's own exit
      // animation is suppressed for this frame by the inline style.
      contentRef.current.style.transform = `translateY(100%)`
      onCloseRef.current?.()
    } else {
      // Snap back to the resting position.
      contentRef.current.style.transition = DRAG_TRANSITION
      contentRef.current.style.transform = "translateY(0)"
    }
    // Re-enable native touch gestures after the snap-back finishes.
    const el = contentRef.current
    const cleanup = () => {
      el.style.touchAction = ""
    }
    el.addEventListener("transitionend", cleanup, { once: true })
  }

  const handleDragHandleTouchCancel = () => {
    if (!contentRef.current) return
    dragStartY.current = null
    lastDelta.current = 0
    contentRef.current.style.transition = DRAG_TRANSITION
    contentRef.current.style.transform = "translateY(0)"
    contentRef.current.style.touchAction = ""
  }

  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Popup
        ref={contentRef}
        data-slot="drawer-content"
        onTouchStart={handleDragHandleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleDragHandleTouchCancel}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[calc(100dvh-5rem)] flex-col overflow-hidden rounded-t-2xl border border-border bg-popover text-popover-foreground shadow-xl outline-none",
          "data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom",
          "data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-bottom",
          "duration-200",
          className
        )}
        {...props}
      >
        {showHandle && (
          <div
            data-drawer-drag-handle
            aria-hidden
            className="flex h-4 w-full shrink-0 cursor-grab touch-none items-start justify-center pt-2.5 select-none active:cursor-grabbing"
          >
            <div className="h-1.5 w-12 rounded-full bg-muted" />
          </div>
        )}
        {children}
        {showCloseButton && (
          <DrawerPrimitive.Close
            aria-label="Close"
            className="absolute top-3 right-3 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={2} />
          </DrawerPrimitive.Close>
        )}
      </DrawerPrimitive.Popup>
    </DrawerPortal>
  )
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      data-drawer-drag-handle
      className={cn(
        "flex shrink-0 cursor-grab touch-none flex-col gap-1 border-b border-border p-4 pr-12 select-none active:cursor-grabbing",
        className
      )}
      {...props}
    />
  )
}

function DrawerBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-body"
      className={cn(
        "min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5",
        className
      )}
      {...props}
    />
  )
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn(
        "shrink-0 border-t border-border bg-popover p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        className
      )}
      {...props}
    />
  )
}

function DrawerTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn(
        "font-heading text-lg font-semibold tracking-wider text-foreground uppercase",
        className
      )}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: DrawerPrimitive.Description.Props) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn(
        "mt-0.5 font-mono text-[10px] text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
