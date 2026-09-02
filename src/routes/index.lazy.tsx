import { createLazyFileRoute, Link } from "@tanstack/react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArmchairIcon,
  ArrowRight01Icon,
  BarcodeScanIcon,
  BoxIcon,
  Camera01Icon,
  CheckmarkCircle01Icon,
  HistoryIcon,
  QrCodeIcon,
  Sofa01Icon,
  Table01Icon,
  Tag01Icon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export const Route = createLazyFileRoute("/")({
  component: LandingRoute,
})

function LandingRoute() {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <SiteNav />
      <Hero />
      <ValueSection />
      <FeatureGrid />
      <WorkflowSection />
      <AudienceSection />
      <CtaSection />
      <SiteFooter />
    </main>
  )
}

function SiteNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto h-[env(safe-area-inset-top)]" />
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <span
            aria-hidden
            className="flex items-center justify-center text-primary-foreground"
          >
            <img src="/logo.svg" alt="" className="size-6" />
          </span>
          Inventory Thingy
        </Link>
        <nav className="ml-6 hidden items-center gap-5 text-sm text-muted-foreground md:flex">
          <a
            href="#features"
            className="transition-colors hover:text-foreground"
          >
            Features
          </a>
          <a
            href="#workflow"
            className="transition-colors hover:text-foreground"
          >
            Workflow
          </a>
          <a
            href="#audience"
            className="transition-colors hover:text-foreground"
          >
            Built for
          </a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/login/$"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-9"
            )}
          >
            Log in
          </Link>
          <Link
            to="/sign-up/$"
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "h-9"
            )}
          >
            Create account
          </Link>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-secondary">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent"
      />
      <div className="relative mx-auto grid w-full max-w-5xl gap-10 px-4 py-16 md:grid-cols-[1.1fr_1fr] md:py-24">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            <HugeiconsIcon
              icon={QrCodeIcon}
              size={12}
              strokeWidth={2}
              className="text-primary"
            />
            inventory thingy · v1
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            Where is the camelback sofa?
            <br />
            <span className="text-primary">Inventory Thingy knows.</span>
          </h1>
          <p className="max-w-md text-base text-muted-foreground">
            QR-tag inventory for furniture staging crews. Register a piece,
            print its tag, and scan it when it moves. Warehouse, truck, set,
            back: everyone on the crew gets the same answer, without
            spreadsheet archaeology.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              to="/sign-up/$"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-12 px-6 text-base"
              )}
            >
              Start tracking inventory
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={16}
                strokeWidth={1.8}
              />
            </Link>
            <Link
              to="/login/$"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-12 px-6 text-base"
              )}
            >
              I already have an account
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            Free during the pilot. Once you&apos;re in, invite your crew from
            the workspace switcher.
          </p>
        </div>

        <HeroPreview />
      </div>
    </section>
  )
}

function HeroPreview() {
  return (
    <div className="relative">
      <Card className="relative overflow-hidden border-border bg-card p-0 shadow-md [--card-spacing:--spacing(0)]">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          <span className="flex size-2.5 rounded-full bg-destructive/70" />
          <span className="flex size-2.5 rounded-full bg-warning/70" />
          <span className="flex size-2.5 rounded-full bg-success/70" />
          <span className="ml-2">Recent activity</span>
        </div>
        <div className="divide-y divide-border">
          {[
            {
              tone: "success" as const,
              icon: CheckmarkCircle01Icon,
              label: "Checked in",
              item: "Mid-century lounge chair",
              meta: "Warehouse A · Bay 3",
              who: "Sam",
            },
            {
              tone: "default" as const,
              icon: Tag01Icon,
              label: "Registered",
              item: "Camelback sofa, oat",
              meta: "QR · STH-0193",
              who: "Maya",
            },
            {
              tone: "warning" as const,
              icon: HistoryIcon,
              label: "Relocated",
              item: "Walnut side tables (×6)",
              meta: "Truck 2 · Staging",
              who: "Devon",
            },
          ].map((row) => (
            <div
              key={row.label + row.item}
              className="flex items-start gap-3 px-4 py-3"
            >
              <span
                className={cn(
                  "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                  row.tone === "success" && "bg-success/10 text-success",
                  row.tone === "warning" &&
                    "bg-warning/10 text-warning-foreground",
                  row.tone === "default" && "bg-primary/10 text-primary"
                )}
              >
                <HugeiconsIcon icon={row.icon} size={16} strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {row.label}
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    ·
                  </span>{" "}
                  <span className="text-foreground">{row.item}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {row.meta} · {row.who}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 border-t border-border">
          {[
            { label: "Available", value: 142 },
            { label: "Staged", value: 18 },
            { label: "Repair", value: 4 },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={cn(
                "px-4 py-3 text-center",
                i > 0 && "border-l border-border"
              )}
            >
              <p className="text-xl font-semibold text-foreground">
                {stat.value}
              </p>
              <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function ValueSection() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-12 md:grid-cols-3 md:py-16">
        {[
          {
            title: "Every piece has a tag",
            body: "Photo, condition, location, and one QR tag per piece. No more 'ask Devon, he knows where the rug is.'",
          },
          {
            title: "A scan updates the record",
            body: "Point your phone at a tag, pick a status, and the location and history update with it. The next person who scans sees what you changed.",
          },
          {
            title: "Who moved it, and when",
            body: "Every check-out, move, and condition change is logged with the crew member who did it. When a client asks where the credenza has been, the answer is on the tag.",
          },
        ].map((card) => (
          <Card key={card.title} className="h-full">
            <CardContent className="gap-2">
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                {card.title}
              </h3>
              <p className="text-sm text-muted-foreground">{card.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}

function FeatureGrid() {
  const features = [
    {
      icon: QrCodeIcon,
      title: "QR per item",
      body: "Every piece gets its own QR code, printed at three sizes: small for plants and jewelry, large for paintings and rugs.",
    },
    {
      icon: BarcodeScanIcon,
      title: "Phone-first scanning",
      body: "Look up an item with a phone camera. No scanner hardware, no app install.",
    },
    {
      icon: Camera01Icon,
      title: "Photo evidence",
      body: "Snap a photo on intake. Photos follow the piece through check-out, repair, and retirement.",
    },
    {
      icon: HistoryIcon,
      title: "Full item history",
      body: "Every status change, move, and condition update shows who did it and when. No more arguing about it at wrap.",
    },
    {
      icon: BoxIcon,
      title: "Bulk stock on racks",
      body: "Pillows and glassware can't wear tags. Track them as quantities on a rack with its own QR, and print a rack sheet for counting.",
    },
    {
      icon: UserMultipleIcon,
      title: "Per-workspace data",
      body: "One workspace per staging company. The other outfit sharing your warehouse can't see your counts.",
    },
  ]
  return (
    <section id="features" className="border-b border-border bg-secondary">
      <div className="mx-auto w-full max-w-5xl px-4 py-16 md:py-20">
        <div className="mb-10 max-w-xl space-y-2">
          <p className="text-[11px] font-bold tracking-[0.2em] text-primary uppercase">
            What you get
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            From the warehouse floor to the install.
          </h2>
          <p className="text-sm text-muted-foreground">
            Built around the real workflow of moving furniture between
            warehouse, truck, and project. Not a generic asset tracker.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="h-full">
              <CardContent className="gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <HugeiconsIcon
                    icon={feature.icon}
                    size={20}
                    strokeWidth={1.7}
                  />
                </span>
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">{feature.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

function WorkflowSection() {
  const steps = [
    {
      n: "01",
      title: "Register a piece",
      body: "Snap a photo, name it, set the condition, and print a QR tag. About 30 seconds.",
    },
    {
      n: "02",
      title: "Scan to update",
      body: "Point the camera at the tag and check it out, move it, or send it to repair. Bulk-scan a truck of tagged pieces without stopping.",
    },
    {
      n: "03",
      title: "Read the history",
      body: "Every action is logged against the item with who did it and when. One screen for the whole story at wrap, or after damage.",
    },
  ]
  return (
    <section id="workflow" className="border-b border-border">
      <div className="mx-auto w-full max-w-5xl px-4 py-16 md:py-20">
        <div className="mb-10 max-w-xl space-y-2">
          <p className="text-[11px] font-bold tracking-[0.2em] text-primary uppercase">
            How it works
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            From warehouse to install, in three moves.
          </h2>
        </div>
        <ol className="grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <li
              key={step.n}
              className="rounded-xl border border-border bg-card p-5"
            >
              <p className="text-xs font-bold tracking-wider text-primary uppercase">
                Step {step.n}
              </p>
              <h3 className="mt-2 text-base font-semibold tracking-tight text-foreground">
                {step.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function AudienceSection() {
  const audiences = [
    {
      icon: Sofa01Icon,
      title: "Furniture staging companies",
      body: "Warehouses full of pieces moving across a dozen active jobs. Hand off a tag and the new crew knows exactly what they're loading.",
    },
    {
      icon: ArmchairIcon,
      title: "Interior designers",
      body: "Consignment pieces, client-owned antiques, and loaners that move through every install.",
    },
    {
      icon: Table01Icon,
      title: "Set decorators & production",
      body: "Film and TV staging runs short and moves fast. A tag per piece and a record per move, so wrap is a scan instead of a search.",
    },
  ]
  return (
    <section id="audience" className="border-b border-border bg-secondary">
      <div className="mx-auto w-full max-w-5xl px-4 py-16 md:py-20">
        <div className="mb-10 max-w-xl space-y-2">
          <p className="text-[11px] font-bold tracking-[0.2em] text-primary uppercase">
            Built for
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            Teams who move real furniture, not just SKUs.
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {audiences.map((audience) => (
            <Card key={audience.title} className="h-full">
              <CardContent className="gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-lg bg-accent text-primary">
                  <HugeiconsIcon
                    icon={audience.icon}
                    size={22}
                    strokeWidth={1.6}
                  />
                </span>
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  {audience.title}
                </h3>
                <p className="text-sm text-muted-foreground">{audience.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

function CtaSection() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto w-full max-w-5xl px-4 py-16 md:py-20">
        <div className="overflow-hidden rounded-2xl border border-primary/30 bg-primary p-8 text-primary-foreground md:p-12">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Tag a sofa in the next five minutes.
              </h2>
              <p className="text-sm text-primary-foreground/80 md:text-base">
                Create a workspace, register your first piece, and print a QR
                tag. We&apos;ll walk you through it.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                to="/sign-up/$"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-12 bg-primary-foreground px-6 text-base text-primary hover:bg-primary-foreground/90"
                )}
              >
                Create a workspace
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={16}
                  strokeWidth={1.8}
                />
              </Link>
              <Link
                to="/login/$"
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "h-12 border-primary-foreground/30 bg-transparent px-6 text-base text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                )}
              >
                Log in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function SiteFooter() {
  return (
    <footer className="bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-8 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex items-center justify-center text-primary-foreground"
          >
            <img src="/logo.svg" alt="" className="size-6" />
          </span>
          <span>Inventory Thingy · furniture inventory for staging teams</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/legal" className="transition-colors hover:text-foreground">
            Privacy Policy
          </Link>
          <Link to="/legal" className="transition-colors hover:text-foreground">
            Terms of Service
          </Link>
          <Link
            to="/login/$"
            className="transition-colors hover:text-foreground"
          >
            Log in
          </Link>
          <Link
            to="/sign-up/$"
            className="transition-colors hover:text-foreground"
          >
            Create account
          </Link>
        </div>
      </div>
    </footer>
  )
}
