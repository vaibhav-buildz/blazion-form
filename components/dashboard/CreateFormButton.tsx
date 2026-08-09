"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"

export function CreateFormButton() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)

  async function handleCreateForm() {
    setLoading(true)
    try {
      const res = await fetch("/api/forms/create", {
        method: "POST",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to create form.")
      }

      const form = await res.json()
      router.push(`/dashboard/forms/${form.id}/edit`)
    } catch (err: any) {
      console.error("Create form error:", err)
      alert(err?.message || "Something went wrong creating the form.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleCreateForm} disabled={loading} className="gap-2">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      {loading ? "Creating..." : "Create Form"}
    </Button>
  )
}
