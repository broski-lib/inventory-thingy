import { createFileRoute } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import {
  BarcodeScanIcon,
  BoxIcon,
  Camera01Icon,
  DeliveryTruck01Icon,
  Home01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { getSession } from "@/lib/auth"

export const Route = createFileRoute("/")({
  loader: async () => {
    return {
      session: await getSession(),
    }
  },
  component: App,
})

const stats = [
  { label: "Available", value: "214" },
  { label: "Staged", value: "38" },
  { label: "Repair", value: "9" },
]

const items = [
  {
    code: "ITG-SFA-0142",
    name: "Nolan boucle sofa",
    status: "Reserved",
    place: "Warehouse B, Aisle 3",
    next: "Elm Street install",
    condition: "Good",
  },
  {
    code: "ITG-TBL-0098",
    name: "Oak pedestal dining table",
    status: "Available",
    place: "Warehouse A, Bay 1",
    next: "Ready",
    condition: "Excellent",
  },
  {
    code: "ITG-CHR-0317",
    name: "Black cane accent chair",
    status: "Repair",
    place: "Intake bench",
    next: "Loose leg",
    condition: "Repair",
  },
]

const moves = ["Scan QR", "Confirm item", "Set room", "Add photo"]

function App() {
  const { session: initialSession } = Route.useLoaderData()
  const { data: sessionData } = authClient.useSession()
  const session = sessionData || initialSession

  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [passkeys, setPasskeys] = useState<any[]>([])

  useEffect(() => {
    if (session) {
      ;(authClient as any).passkey.list().then(({ data }: any) => {
        if (data) setPasskeys(data)
      })
    }
  }, [session])

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const { error: magicLinkError } = await (authClient as any).signIn.magicLink({
        email,
        name: isSignUp ? name : undefined,
        callbackURL: window.location.origin,
      })

      if (magicLinkError) {
        setError(magicLinkError.message || "Failed to send magic link")
      } else {
        setMagicLinkSent(true)
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasskeySignIn = async () => {
    setIsLoading(true)
    setError("")

    try {
      const { error: passkeyError } = await (authClient as any).signIn.passkey()
      if (passkeyError) {
        setError(passkeyError.message || "Failed to sign in with Passkey")
      } else {
        window.location.reload()
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred during Passkey sign in")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddPasskey = async () => {
    try {
      const nameInput = prompt("Enter a name for this Passkey:", "My Device")
      if (!nameInput) return
      const { error: passkeyAddError } = await (authClient as any).passkey.add({ name: nameInput })
      if (passkeyAddError) {
        alert(passkeyAddError.message || "Failed to add Passkey")
      } else {
        const { data } = await (authClient as any).passkey.list()
        if (data) setPasskeys(data)
      }
    } catch (err: any) {
      alert(err?.message || "An error occurred")
    }
  }


  if (!session) {
    return (
      <main className="min-h-svh bg-[#f7f8f4] text-[#20231f] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-[#dfe3dc] rounded-2xl p-8 shadow-sm transition-all duration-300">
          <div className="text-center mb-8">
            <p className="text-xs font-bold tracking-[0.2em] text-[#6d7569] uppercase">
              inventory-thingy
            </p>
            <h2 className="text-3xl font-semibold mt-2 tracking-tight">
              {magicLinkSent ? "Link Sent" : isSignUp ? "Create account" : "Welcome back"}
            </h2>
            <p className="text-sm text-[#6d7569] mt-2">
              {magicLinkSent
                ? `We sent a magic link to ${email}. Click the link to log in.`
                : isSignUp
                  ? "Sign up to start managing furniture ops"
                  : "Sign in to access your dashboard"}
            </p>
          </div>

          {!magicLinkSent ? (
            <div className="space-y-4">
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {isSignUp && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#6d7569]">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-11 px-3 border border-[#dfe3dc] rounded-lg bg-transparent outline-none focus:border-[#23312b] transition-colors text-sm"
                      placeholder="John Doe"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#6d7569]">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 px-3 border border-[#dfe3dc] rounded-lg bg-transparent outline-none focus:border-[#23312b] transition-colors text-sm"
                    placeholder="you@example.com"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 rounded-lg bg-[#23312b] text-white font-semibold uppercase tracking-wider text-xs hover:bg-[#1a2520] transition-colors mt-2 cursor-pointer"
                >
                  {isLoading
                    ? "Processing..."
                    : isSignUp
                      ? "Send Sign Up Link"
                      : "Send Magic Link"}
                </Button>
              </form>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-[#dfe3dc]"></div>
                <span className="flex-shrink mx-4 text-xs uppercase tracking-widest text-[#6d7569] font-medium">Or</span>
                <div className="flex-grow border-t border-[#dfe3dc]"></div>
              </div>

              <Button
                type="button"
                onClick={handlePasskeySignIn}
                disabled={isLoading}
                variant="outline"
                className="w-full h-11 rounded-lg border-[#dfe3dc] bg-white text-xs font-semibold uppercase tracking-wider hover:bg-muted transition-colors cursor-pointer"
              >
                Sign In with Passkey
              </Button>

              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp)
                    setError("")
                  }}
                  className="text-xs font-semibold tracking-wider uppercase text-[#23312b] hover:underline cursor-pointer"
                >
                  {isSignUp
                    ? "Already have an account? Sign In"
                    : "Don't have an account? Sign Up"}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center mt-6">
              <button
                onClick={() => {
                  setMagicLinkSent(false)
                  setError("")
                }}
                className="text-xs font-semibold tracking-wider uppercase text-[#23312b] hover:underline cursor-pointer"
              >
                ← Back to Sign In
              </button>
            </div>
          )}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-svh bg-[#f7f8f4] text-[#20231f]">
      <section className="mx-auto flex min-h-svh w-full max-w-md flex-col px-4 pt-4 pb-28">
        <header className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-[0.18em] text-[#6d7569] uppercase">
              {session.user.email}
            </p>
            <h1 className="truncate text-2xl font-semibold tracking-normal">
              Hi, {session.user.name ? session.user.name.split(" ")[0] : "User"}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-11 rounded-lg border-[#dfe3dc] bg-white text-[10px] tracking-wider font-bold cursor-pointer"
              onClick={async () => {
                await authClient.signOut()
                window.location.reload()
              }}
            >
              Sign out
            </Button>
            <Button
              size="icon"
              className="size-11 rounded-lg"
              aria-label="Scan QR"
            >
              <HugeiconsIcon icon={BarcodeScanIcon} size={22} strokeWidth={1.8} />
            </Button>
          </div>
        </header>

        <div className="mt-5 rounded-lg bg-[#23312b] p-4 text-white shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-white/70">Today</p>
              <p className="mt-1 text-3xl font-semibold">12 moves</p>
            </div>
            <div className="rounded-md bg-white/10 p-3">
              <HugeiconsIcon
                icon={DeliveryTruck01Icon}
                size={28}
                strokeWidth={1.6}
              />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-md bg-white/10 p-2">
                <p className="text-lg font-semibold">{stat.value}</p>
                <p className="truncate text-xs text-white/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#dfe3dc] bg-white px-3 text-sm shadow-sm">
            <HugeiconsIcon
              icon={Search01Icon}
              size={18}
              strokeWidth={1.8}
              className="text-[#687064]"
            />
            <input
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#8a9285]"
              placeholder="Search tag, piece, project"
            />
          </label>
          <Button
            variant="outline"
            size="icon"
            className="size-11 rounded-lg bg-white border-[#dfe3dc]"
          >
            <HugeiconsIcon icon={Camera01Icon} size={20} strokeWidth={1.8} />
          </Button>
        </div>

        <section className="mt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Security (Passkeys)</h2>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-md border-[#dfe3dc] bg-white text-[10px] uppercase font-bold cursor-pointer"
              onClick={handleAddPasskey}
            >
              Add Passkey
            </Button>
          </div>
          <div className="mt-3 space-y-2">
            {passkeys.length === 0 ? (
              <p className="text-xs text-[#6d7569] bg-white border border-[#dfe3dc] rounded-lg p-3 shadow-sm text-center">
                No passkeys registered yet. Add one to sign in instantly.
              </p>
            ) : (
              passkeys.map((pk) => (
                <div
                  key={pk.id}
                  className="flex items-center justify-between rounded-lg border border-[#dfe3dc] bg-white p-3 shadow-sm"
                >
                  <div>
                    <p className="text-xs font-semibold">{pk.name}</p>
                    <p className="text-[10px] text-[#6d7569]">
                      Added on {new Date(pk.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-[#23312b] bg-[#eef2ea] px-2 py-1 rounded-md uppercase">
                    Active
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">QR workflow</h2>
            <span className="text-xs font-medium text-[#6d7569]">
              small team
            </span>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {moves.map((move, index) => (
              <div
                key={move}
                className="flex aspect-square flex-col justify-between rounded-lg border border-[#dfe3dc] bg-white p-2 shadow-sm"
              >
                <span className="text-xs font-semibold text-[#65705f]">
                  0{index + 1}
                </span>
                <span className="text-[11px] leading-tight font-medium">
                  {move}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 flex flex-1 flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Inventory</h2>
            <Button variant="ghost" className="h-8 px-2 text-sm">
              View all
            </Button>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {items.map((item) => (
              <article
                key={item.code}
                className="rounded-lg border border-[#dfe3dc] bg-white p-3 shadow-sm"
              >
                <div className="flex gap-3">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-[#eef2ea]">
                    <HugeiconsIcon icon={BoxIcon} size={26} strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {item.name}
                        </p>
                        <p className="mt-0.5 text-xs text-[#6d7569]">
                          {item.code}
                        </p>
                      </div>
                      <span className="rounded-md bg-[#eef2ea] px-2 py-1 text-[11px] font-medium">
                        {item.status}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-[1fr_auto] gap-2 text-xs">
                      <span className="truncate text-[#596156]">
                        {item.place}
                      </span>
                      <span className="font-medium">{item.condition}</span>
                      <span className="col-span-2 truncate text-[#596156]">
                        {item.next}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>

      <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-[#dfe3dc] bg-white/95 px-4 pt-2 pb-4 backdrop-blur">
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="ghost"
            className="h-12 flex-col gap-1 rounded-lg text-xs"
          >
            <HugeiconsIcon icon={Home01Icon} size={20} strokeWidth={1.7} />
            Home
          </Button>
          <Button className="h-12 rounded-lg">
            <HugeiconsIcon icon={BarcodeScanIcon} size={20} strokeWidth={1.8} />
            Scan
          </Button>
          <Button
            variant="ghost"
            className="h-12 flex-col gap-1 rounded-lg text-xs"
          >
            <HugeiconsIcon icon={BoxIcon} size={20} strokeWidth={1.7} />
            Stock
          </Button>
        </div>
      </nav>
    </main>
  )
}
