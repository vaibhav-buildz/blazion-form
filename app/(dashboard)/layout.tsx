import * as React from "react"
import Link from "next/link"
import { SignOutButton } from "@/components/SignOutButton"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-white p-6">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-slate-900">Blazion Form</h1>
        </div>
        <nav className="space-y-1">
          <Link
            href="/dashboard"
            className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/settings"
            className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            Settings
          </Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col">
        {/* Top Bar */}
        <header className="flex h-16 items-center justify-between border-b bg-white px-8">
          <div />
          <SignOutButton />
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
