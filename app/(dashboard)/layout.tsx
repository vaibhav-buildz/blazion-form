"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const navItems = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Settings", href: "/dashboard/settings/identity" },
    { name: "Profile", href: "/dashboard/profile" },
  ]

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 h-screen sticky top-0 border-r border-border bg-secondary py-6 flex flex-col justify-between shrink-0 overflow-y-auto">
        <div>
          <div className="mb-8 px-6">
            <h1 className="text-lg font-semibold text-foreground font-heading">Blazion Form</h1>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block w-full px-6 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-l-4 border-primary bg-transparent text-foreground"
                      : "border-l-4 border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex flex-1 flex-col h-screen overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-end border-b border-border bg-card px-8 shrink-0" />

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}
