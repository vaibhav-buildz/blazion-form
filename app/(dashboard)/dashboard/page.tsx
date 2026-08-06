import * as React from "react"
import { Button } from "@/components/ui/button"

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-5xl p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Your Forms</h1>
      </div>

      <div className="rounded-lg border-2 border-dashed border-border p-12 text-center bg-card">
        <p className="text-sm text-muted-foreground mb-4">
          No forms yet. Create your first form.
        </p>
        <Button variant="default">Create Form</Button>
      </div>
    </div>
  )
}
