import { describe, it, expect, vi, beforeEach } from "vitest"
import { resolveActor, logActivity } from "@/lib/activity.server"
import type { ActivityActor, ActivityLogInput } from "@/lib/activity"

const mockInsert = vi.fn().mockReturnValue({ values: vi.fn() })
const mockDb = { insert: mockInsert }

vi.mock("@/lib/db.server", () => ({
  getDb: () => mockDb,
}))

const mockGetUser = vi.fn()

vi.mock("@clerk/tanstack-react-start/server", () => ({
  clerkClient: () => ({
    users: {
      getUser: mockGetUser,
    },
  }),
}))

describe("resolveActor", () => {
  it("uses first + last name when available", async () => {
    mockGetUser.mockResolvedValueOnce({
      firstName: "Jane",
      lastName: "Doe",
      username: "janedoe",
      emailAddresses: [{ emailAddress: "jane@example.com" }],
    })
    const actor = await resolveActor("user_123")
    expect(actor.userId).toBe("user_123")
    expect(actor.userName).toBe("Jane Doe")
    expect(actor.userEmail).toBe("jane@example.com")
  })

  it("falls back to username when name is missing", async () => {
    mockGetUser.mockResolvedValueOnce({
      firstName: null,
      lastName: null,
      username: "janedoe",
      emailAddresses: [{ emailAddress: "jane@example.com" }],
    })
    const actor = await resolveActor("user_123")
    expect(actor.userName).toBe("janedoe")
  })

  it("falls back to email prefix when name and username are missing", async () => {
    mockGetUser.mockResolvedValueOnce({
      firstName: null,
      lastName: null,
      username: null,
      emailAddresses: [{ emailAddress: "jane@example.com" }],
    })
    const actor = await resolveActor("user_123")
    expect(actor.userName).toBe("jane")
  })

  it('falls back to "Unknown user" when no identifiable info', async () => {
    mockGetUser.mockResolvedValueOnce({
      firstName: null,
      lastName: null,
      username: null,
      emailAddresses: [],
    })
    const actor = await resolveActor("user_123")
    expect(actor.userName).toBe("Unknown user")
    expect(actor.userEmail).toBe("")
  })

  it("returns fallback actor for empty userId", async () => {
    mockGetUser.mockClear()
    const actor = await resolveActor("")
    expect(actor.userId).toBe("")
    expect(actor.userName).toBe("Unknown user")
    expect(actor.userEmail).toBe("")
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it("returns userId with fallback name on Clerk error", async () => {
    mockGetUser.mockRejectedValueOnce(new Error("not found"))
    const actor = await resolveActor("user_123")
    expect(actor.userId).toBe("user_123")
    expect(actor.userName).toBe("Unknown user")
    expect(actor.userEmail).toBe("")
  })

  it("handles missing email", async () => {
    mockGetUser.mockResolvedValueOnce({
      firstName: "Bob",
      lastName: "Smith",
      username: null,
      emailAddresses: [],
    })
    const actor = await resolveActor("user_456")
    expect(actor.userId).toBe("user_456")
    expect(actor.userName).toBe("Bob Smith")
    expect(actor.userEmail).toBe("")
  })
})

describe("logActivity", () => {
  const actor: ActivityActor = {
    userId: "user_1",
    userName: "Test User",
    userEmail: "test@example.com",
    orgId: "org_1",
  }

  const input: ActivityLogInput = {
    itemId: "item_1",
    itemName: "Test Item",
    itemQrCode: "X7R2-M9WP",
    action: "created",
  }

  beforeEach(() => {
    mockInsert.mockClear()
  })

  it("inserts activity log entry", async () => {
    await logActivity(actor, input)
    expect(mockInsert).toHaveBeenCalled()
  })

  it("skips when userId is empty", async () => {
    await logActivity({ ...actor, userId: "" }, input)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it("skips when orgId is empty", async () => {
    await logActivity({ ...actor, orgId: "" }, input)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it("coerces nullable fields to null in the insert", async () => {
    await logActivity(actor, {
      ...input,
      fromLocation: undefined,
      toLocation: undefined,
      quantity: undefined,
    })
    expect(mockInsert).toHaveBeenCalled()
  })
})
