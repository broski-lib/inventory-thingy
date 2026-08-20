import { UserButton, OrganizationSwitcher } from "@clerk/tanstack-react-start"

export function AppHeader() {
  return (
    <header className="flex gap-3">
      <OrganizationSwitcher hidePersonal />
      <div className="ml-auto flex items-center gap-2">
        <UserButton />
      </div>
    </header>
  )
}
