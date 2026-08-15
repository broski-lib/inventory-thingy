import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ClerkProvider } from "@clerk/tanstack-react-start"
import {
  HeadContent,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"

import appCss from "../styles.css?url"
import { Button } from "@/components/ui/button"

function ErrorFallback({ error, reset }: ErrorComponentProps) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-secondary p-4">
      <div className="max-w-sm space-y-4 rounded-xl border border-destructive/30 bg-card p-6 text-center">
        <h1 className="text-lg font-semibold text-destructive">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "An unexpected error occurred."}
        </p>
        <Button onClick={reset} variant="outline" size="sm">
          Try again
        </Button>
      </div>
    </main>
  )
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Inventory Thingy",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
    ],
  }),
  notFoundComponent: () => (
    <main className="container mx-auto p-4 pt-16">
      <h1>404</h1>
      <p>The requested page could not be found.</p>
    </main>
  ),
  errorComponent: ErrorFallback,
  shellComponent: RootDocument,
})

let browserQueryClient: QueryClient | undefined

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: true,
      },
    },
  })
}

function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient()
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient()
  }
  return browserQueryClient
}

function RootDocument({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient()
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-svh bg-secondary antialiased">
        <QueryClientProvider client={queryClient}>
          <ClerkProvider>
            {children}
          </ClerkProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  )
}
