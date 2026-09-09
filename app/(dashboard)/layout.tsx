"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  // Close mobile drawer on route change
  React.useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  const navItems = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Settings", href: "/dashboard/settings/identity" },
    { name: "Profile", href: "/dashboard/profile" },
  ]

  const navContent = (
    <div>
      <div className="mb-8 px-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground font-heading">FormSetu</h1>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8 text-muted-foreground"
          onClick={() => setMobileMenuOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
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
  )

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 h-full border-r border-border bg-secondary py-6 flex-col justify-between shrink-0 overflow-y-auto">
        {navContent}
      </aside>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-50 w-64 h-full border-r border-border bg-secondary py-6 flex flex-col justify-between overflow-y-auto shadow-xl">
            {navContent}
          </aside>
        </div>
      )}

      {/* Main Container */}
      <div className="flex flex-1 flex-col min-w-0 min-h-0">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between md:justify-end border-b border-border bg-card px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-2 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="text-sm font-bold font-heading">FormSetu</span>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto min-h-0 bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}
