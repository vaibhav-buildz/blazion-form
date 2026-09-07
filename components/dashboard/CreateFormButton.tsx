"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"

export function CreateFormButton() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)

  const [createError, setCreateError] = React.useState<string | null>(null)

  async function handleCreateForm() {
    setLoading(true)
    setCreateError(null)
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
      setCreateError(err?.message || "Something went wrong creating the form.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative inline-block">
      <Button onClick={handleCreateForm} disabled={loading} className="gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        {loading ? "Creating..." : "Create Form"}
      </Button>
      {createError && (
        <div className="absolute top-full mt-2 right-0 z-50 p-2 text-xs bg-destructive text-destructive-foreground rounded-md shadow-lg whitespace-nowrap">
          {createError}
        </div>
      )}
    </div>
  )
}
