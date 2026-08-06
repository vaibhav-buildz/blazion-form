"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleCreateForm() {
    setLoading(true)
    setError(null)

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
      setError(err?.message || "Something went wrong creating the form.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Your Forms</h1>
      </div>

      <div className="rounded-lg border-2 border-dashed border-border p-12 text-center bg-card">
        <p className="text-sm text-muted-foreground mb-4">
          No forms yet. Create your first form.
        </p>
        <Button onClick={handleCreateForm} disabled={loading}>
          {loading ? "Creating..." : "Create Form"}
        </Button>
        {error && (
          <p className="mt-4 text-sm font-medium text-destructive">{error}</p>
        )}
      </div>
    </div>
  )
}
