"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { Button, type ButtonProps } from "@/components/ui/button"

interface SignOutButtonProps {
  variant?: ButtonProps["variant"]
  size?: ButtonProps["size"]
  className?: string
}

export function SignOutButton({
  variant = "outline",
  size = "default",
  className = "",
}: SignOutButtonProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = React.useState(false)

  async function handleSignOut() {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      router.push("/login")
      router.refresh()
    } catch (error) {
      console.error("Error signing out:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSignOut}
      disabled={loading}
      className={className}
    >
      <LogOut className="mr-2 h-4 w-4" />
      {loading ? "Signing out..." : "Sign Out"}
    </Button>
  )
}
