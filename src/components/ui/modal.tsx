import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

type ModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  className?: string
}

function Modal({ open, onOpenChange, children, className }: ModalProps) {
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      data-slot="modal"
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          data-slot="modal-overlay"
          className="fixed inset-0 isolate z-50 bg-black/40 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        />
        <DialogPrimitive.Popup
          data-slot="modal-content"
          className={cn(
            "fixed bottom-0 left-1/2 z-50 flex grid max-h-[95vh] w-full max-w-md -translate-x-1/2 flex-col overflow-hidden rounded-t-2xl border border-border bg-popover text-popover-foreground shadow-xl duration-100 outline-none sm:top-1/2 sm:bottom-auto sm:max-h-[90vh] sm:-translate-y-1/2 sm:rounded-xl data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
        >
          {children}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function ModalHeader({
  className,
  children,
  onClose,
  ...props
}: React.ComponentProps<"div"> & { onClose?: () => void }) {
  return (
    <div
      data-slot="modal-header"
      className={cn(
        "flex items-center justify-between gap-3 border-b border-border p-4",
        className
      )}
      {...props}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {onClose && (
        <DialogPrimitive.Close
          data-slot="modal-close"
          className="cursor-pointer rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close dialog"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={2} />
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function ModalTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="modal-title"
      className={cn(
        "text-base font-semibold tracking-tight text-foreground",
        className
      )}
      {...props}
    />
  )
}

function ModalDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="modal-description"
      className={cn(
        "mt-0.5 font-mono text-[10px] text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function ModalBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="modal-body"
      className={cn("flex-1 space-y-4 overflow-y-auto p-5", className)}
      {...props}
    />
  )
}

function ModalFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="modal-footer"
      className={cn("border-t border-border bg-popover p-3", className)}
      {...props}
    />
  )
}

export {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
}
