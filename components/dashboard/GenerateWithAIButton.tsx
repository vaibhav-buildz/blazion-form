"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Sparkles, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export function GenerateWithAIButton() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [description, setDescription] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleOpenChange = (nextOpen: boolean) => {
    if (loading) return
    setOpen(nextOpen)
    if (nextOpen) {
      setError(null)
    }
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) {
      setError("Please describe the form you want to create.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/ai/generate-form", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ description: description.trim() }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (res.status === 429) {
          setError(
            data.error ||
              "AI generation limit reached for today. Please try again later or contact support."
          )
          return
        }
        throw new Error(data.error || "AI generation failed, please try again")
      }

      if (!data.formId) {
        throw new Error("AI generation failed, please try again")
      }

      setOpen(false)
      setDescription("")
      router.push(`/dashboard/forms/${data.formId}/edit`)
    } catch (err: any) {
      console.error("AI form generator error:", err)
      setError(err?.message || "AI generation failed, please try again")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 border-accent/70 bg-gradient-to-r from-accent/15 via-accent/25 to-accent/15 hover:bg-accent/30 text-foreground font-medium shadow-xs ring-1 ring-accent/30 hover:ring-accent/60 transition-all duration-200"
        >
          <Sparkles className="h-4 w-4 text-primary" />
          <span>Generate with AI</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Form with AI
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Describe the form you want to build and AI will create the title, questions, options, and structure for you.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleGenerate} className="space-y-4 pt-1">
          <div className="space-y-2">
            <Label htmlFor="form-description" className="text-sm font-medium text-foreground">
              Describe the form you want to create
            </Label>
            <Textarea
              id="form-description"
              rows={4}
              placeholder="e.g. A job application form for a software engineer role, with questions for experience, resume upload, portfolio link, and key technical skills.&#10;&#10;or: A customer feedback survey for a restaurant collecting ratings, favorite dishes, and suggestions."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                if (error) setError(null)
              }}
              disabled={loading}
              className="resize-none border-input focus-visible:ring-primary text-foreground placeholder:text-muted-foreground/70"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !description.trim()}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating your form...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
