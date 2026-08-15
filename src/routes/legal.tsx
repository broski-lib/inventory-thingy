import { createFileRoute } from "@tanstack/react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert01Icon,
  ArrowUpRight01Icon,
  BoxIcon,
  Camera01Icon,
  LegalDocument01Icon,
  PrinterIcon,
  Shield01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/legal")({
  component: LegalPage,
})

function LegalPage() {
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print()
    }
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur print:hidden">
        <div className="mx-auto h-[env(safe-area-inset-top)]" />
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground"
            >
              <img src="/logo.svg" alt="" className="size-4" />
            </span>
            <span className="text-sm font-semibold tracking-tight">
              Inventory Thingy
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "hidden h-9 sm:inline-flex"
              )}
            >
              <HugeiconsIcon icon={PrinterIcon} size={14} strokeWidth={1.8} />
              Print / Save PDF
            </button>
            <a
              href="https://inventory.brockshaffer.dev"
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ size: "sm" }), "h-9")}
            >
              Go to App
              <HugeiconsIcon
                icon={ArrowUpRight01Icon}
                size={14}
                strokeWidth={1.8}
              />
            </a>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <section className="relative overflow-hidden border-b border-border bg-secondary print:hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent"
        />
        <div className="relative mx-auto w-full max-w-4xl px-4 py-14 text-center md:py-16">
          <Badge variant="secondary" className="mb-4">
            Legal & Compliance
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Terms & Privacy Documentation
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
            Official agreements for Inventory Thingy — multi-workspace QR
            furniture tracking for staging teams and decorators.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3 text-xs text-muted-foreground">
            <span>
              Effective Date:{" "}
              <strong className="font-semibold text-foreground">
                August 15, 2026
              </strong>
            </span>
            <span aria-hidden className="text-muted-foreground/50">
              •
            </span>
            <span>
              Domain:{" "}
              <strong className="font-semibold text-foreground">
                inventory.brockshaffer.dev
              </strong>
            </span>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10 sm:px-6">
        {/* Pilot Banner Alert */}
        <Alert variant="warning">
          <HugeiconsIcon icon={Alert01Icon} />
          <AlertTitle>Free Pilot Version Notice</AlertTitle>
          <AlertDescription>
            Inventory Thingy is currently operating in a free pilot phase (v1).
            All terms reflect this tier. Advanced notification will be provided
            to workspace administrators prior to any future subscription or
            pricing changes.
          </AlertDescription>
        </Alert>

        {/* Tab Navigation for Tabs View */}
        <Tabs defaultValue="privacy" className="w-full">
          <TabsList className="mx-auto mb-8 grid w-full max-w-md grid-cols-2 print:hidden">
            <TabsTrigger value="privacy">
              <HugeiconsIcon icon={Shield01Icon} size={14} strokeWidth={1.8} />
              Privacy Policy
            </TabsTrigger>
            <TabsTrigger value="terms">
              <HugeiconsIcon
                icon={LegalDocument01Icon}
                size={14}
                strokeWidth={1.8}
              />
              Terms of Service
            </TabsTrigger>
          </TabsList>

          {/* ================= PRIVACY POLICY ================= */}
          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader className="border-b pb-6">
                <div className="flex items-center justify-between">
                  <Badge>Privacy Policy</Badge>
                  <span className="text-xs text-muted-foreground">
                    Last updated: August 2026
                  </span>
                </div>
                <CardTitle className="pt-2 text-2xl">
                  Data Protection & Privacy Standards
                </CardTitle>
                <CardDescription>
                  How Inventory Thingy collects, uses, and isolates data across
                  workspaces.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-8 pt-6 text-sm leading-relaxed text-muted-foreground">
                {/* Section 1 */}
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      1
                    </span>
                    Information We Collect
                  </h3>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Card className="bg-secondary">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium">
                          <HugeiconsIcon
                            icon={UserGroupIcon}
                            size={16}
                            strokeWidth={1.8}
                            className="text-primary"
                          />
                          Account & Member Data
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1 p-4 pt-0 text-xs text-muted-foreground">
                        <p>• Account credentials (email, password hashes).</p>
                        <p>• Workspace names and co-worker invitations.</p>
                        <p>• User attribution attached to item actions.</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-secondary">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium">
                          <HugeiconsIcon
                            icon={BoxIcon}
                            size={16}
                            strokeWidth={1.8}
                            className="text-primary"
                          />
                          Inventory & Timeline Content
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1 p-4 pt-0 text-xs text-muted-foreground">
                        <p>
                          • Furniture items, descriptions, condition status.
                        </p>
                        <p>
                          • Location logs (Warehouse Bay, Truck, Project Set).
                        </p>
                        <p>• Photos uploaded during intake/inspection.</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Camera Callout Card */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-start gap-3">
                      <HugeiconsIcon
                        icon={Camera01Icon}
                        size={20}
                        strokeWidth={1.6}
                        className="mt-0.5 shrink-0 text-primary"
                      />
                      <div className="space-y-1">
                        <h4 className="text-xs font-semibold text-foreground">
                          Camera Access for Phone-First Scanning
                        </h4>
                        <p className="text-xs leading-normal text-muted-foreground">
                          The Service requests browser permission to access your
                          device camera solely to scan QR tags in real time.
                          Camera frames are processed{" "}
                          <strong className="font-semibold text-foreground">
                            locally in browser memory
                          </strong>{" "}
                          and are never recorded or saved to external servers.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Section 2 */}
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      2
                    </span>
                    How We Use Your Data
                  </h3>
                  <ul className="list-disc space-y-1.5 pl-5 text-xs text-muted-foreground sm:text-sm">
                    <li>
                      <strong className="font-semibold text-foreground">
                        Core Inventory Tracking:
                      </strong>{" "}
                      Generating unique QR tags, updating item locations, and
                      logging condition changes.
                    </li>
                    <li>
                      <strong className="font-semibold text-foreground">
                        Workspace Isolation:
                      </strong>{" "}
                      Keeping staging inventories isolated between teams via
                      workspace boundaries.
                    </li>
                    <li>
                      <strong className="font-semibold text-foreground">
                        Audit Timelines:
                      </strong>{" "}
                      Attributing check-outs, relocations, and repairs to
                      specific team members for job accountability.
                    </li>
                  </ul>
                </div>

                <Separator />

                {/* Section 3 */}
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      3
                    </span>
                    Data Sharing & Privacy Protections
                  </h3>
                  <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                    <div className="rounded-lg border bg-secondary p-3">
                      <span className="mb-1 block font-semibold text-foreground">
                        No Sale of Personal Data
                      </span>
                      We never sell, rent, or trade your workspace records or
                      photos to advertising networks.
                    </div>
                    <div className="rounded-lg border bg-secondary p-3">
                      <span className="mb-1 block font-semibold text-foreground">
                        Workspace Boundary Controls
                      </span>
                      Inventory logs are restricted to authenticated members who
                      join your explicit workspace.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================= TERMS OF SERVICE ================= */}
          <TabsContent value="terms" className="space-y-6">
            <Card>
              <CardHeader className="border-b pb-6">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">Terms of Service</Badge>
                  <span className="text-xs text-muted-foreground">
                    Last updated: August 2026
                  </span>
                </div>
                <CardTitle className="pt-2 text-2xl">
                  Service Agreement & Usage Terms
                </CardTitle>
                <CardDescription>
                  Rules and liabilities governing your access to the Inventory
                  Thingy platform.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-8 pt-6 text-sm leading-relaxed text-muted-foreground">
                {/* Section 1 */}
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      1
                    </span>
                    Description of Platform
                  </h3>
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    Inventory Thingy is a web-based asset management tool
                    designed for home staging companies, interior designers, and
                    set decorators to tag items with unique QRs, log location
                    moves, attach condition photos, and manage team workspaces.
                  </p>
                </div>

                <Separator />

                {/* Section 2 */}
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      2
                    </span>
                    Pilot Phase Terms & Availability
                  </h3>
                  <div className="space-y-2 rounded-lg border bg-secondary p-4 text-xs text-muted-foreground">
                    <p>
                      <strong className="font-semibold text-foreground">
                        Free Access:
                      </strong>{" "}
                      The Service is offered free during the pilot phase (v1).
                    </p>
                    <p>
                      <strong className="font-semibold text-foreground">
                        No Guarantees / SLAs:
                      </strong>{" "}
                      Provided on an "as-is" and "as-available" basis without
                      formal uptime service level agreements.
                    </p>
                    <p>
                      <strong className="font-semibold text-foreground">
                        Future Revisions:
                      </strong>{" "}
                      We reserve the right to introduce paid features or tier
                      limits for future updates, with advance notice given.
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Section 3 */}
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      3
                    </span>
                    Account Security & Content Ownership
                  </h3>
                  <ul className="list-disc space-y-1.5 pl-5 text-xs text-muted-foreground sm:text-sm">
                    <li>
                      <strong className="font-semibold text-foreground">
                        Workspace Management:
                      </strong>{" "}
                      Workspace creators are responsible for team member
                      invitations and revoking access for departing staff.
                    </li>
                    <li>
                      <strong className="font-semibold text-foreground">
                        Content Ownership:
                      </strong>{" "}
                      You retain ownership of all furniture logs, project
                      records, and photos uploaded to your account.
                    </li>
                  </ul>
                </div>

                <Separator />

                {/* Section 4 */}
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      4
                    </span>
                    Limitation of Liability
                  </h3>
                  <div className="rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed text-muted-foreground">
                    IN NO EVENT SHALL INVENTORY THINGY OR ITS OPERATORS BE
                    LIABLE FOR ANY INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
                    DAMAGES, INCLUDING LOSS OF INVENTORY DATA, STAGING
                    DISCREPANCIES, OR UNRECORDED ASSET DAMAGE ARISING FROM USE
                    OF THE SERVICE.
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Contact Footer Banner */}
        <div className="overflow-hidden rounded-2xl border border-primary/30 bg-primary p-6 text-primary-foreground md:p-8">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h4 className="text-base font-semibold">
                Questions about your workspace data?
              </h4>
              <p className="text-xs text-primary-foreground/80">
                Visit the app portal to manage your team workspaces or account
                settings.
              </p>
            </div>
            <a
              href="https://inventory.brockshaffer.dev"
              target="_blank"
              rel="noreferrer"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-11 bg-primary-foreground px-6 text-base text-primary hover:bg-primary-foreground/90"
              )}
            >
              Go to Inventory Thingy
              <HugeiconsIcon
                icon={ArrowUpRight01Icon}
                size={16}
                strokeWidth={1.8}
              />
            </a>
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground print:hidden">
        <p>© 2026 Inventory Thingy • Furniture Inventory for Staging Teams</p>
      </footer>
    </div>
  )
}
