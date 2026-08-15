import { UserButton, OrganizationSwitcher } from "@clerk/tanstack-react-start"
import { shadcn } from '@clerk/ui/themes'


export function AppHeader() {
  return (
    <header className="flex gap-3">
      <OrganizationSwitcher
        hidePersonal
        appearance={{
          theme: shadcn,
        }}
      />
      <div className="ml-auto flex items-center gap-2">
        <UserButton
          appearance={{
            theme: shadcn,
          }}
        />
      </div>
    </header>
  )
}
