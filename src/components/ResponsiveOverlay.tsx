import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { useMediaQuery } from "@/hooks/use-media-query"

type ResponsiveOverlayProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  subtitle?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  /** Add the standard bottom padding for the safe-area / fixed footer. */
  withFooter?: boolean
}

/**
 * Renders a Dialog on desktop (>= 768px) and a Drawer on mobile, sharing
 * the same body / footer / title. Drawer body scrolls independently while
 * header and footer stay pinned. The desktop dialog centers the content.
 */
export function ResponsiveOverlay({
  open,
  onOpenChange,
  title,
  description,
  subtitle,
  children,
  footer,
  withFooter = true,
}: ResponsiveOverlayProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")

  const headerMeta = (subtitle || description) && (
    <div className="flex items-center justify-between gap-2">
      {description}
      {subtitle}
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {headerMeta}
          </DialogHeader>
          {children}
          {withFooter && footer && <DialogFooter>{footer}</DialogFooter>}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{title}</DrawerTitle>
          {headerMeta && (
            <div className="flex items-center justify-between gap-2">
              {description}
              {subtitle}
            </div>
          )}
        </DrawerHeader>
        <DrawerBody>{children}</DrawerBody>
        {withFooter && footer && <DrawerFooter>{footer}</DrawerFooter>}
      </DrawerContent>
    </Drawer>
  )
}
