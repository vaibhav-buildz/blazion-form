"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

export function SignOutButton() {
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
      variant="outline"
      size="sm"
      onClick={handleSignOut}
      disabled={loading}
    >
      {loading ? "Signing out..." : "Sign Out"}
    </Button>
  )
}
