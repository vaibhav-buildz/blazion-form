import * as React from "react"
import Link from "next/link"
import { SignOutButton } from "@/components/SignOutButton"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 h-full border-r border-border bg-card p-6 flex flex-col justify-between shrink-0">
        <div>
          <div className="mb-8">
            <h1 className="text-lg font-semibold text-foreground">Blazion Form</h1>
          </div>
          <nav className="space-y-1">
            <Link
              href="/dashboard"
              className="block w-full rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/settings/identity"
              className="block w-full rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Settings
            </Link>
          </nav>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-end border-b border-border bg-card px-8 shrink-0">
          <SignOutButton />
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}
