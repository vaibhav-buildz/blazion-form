"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ExternalLink, Edit3, Trash2, Loader2 } from "lucide-react"

interface FormCardProps {
  form: {
    id: string
    title: string
    slug: string
    status: string
    created_at: string
    [key: string]: any
  }
}

export function FormCard({ form }: FormCardProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/forms/${form.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to delete form")
      }

      router.refresh()
    } catch (err: any) {
      console.error("Delete form error:", err)
      alert(err.message || "Failed to delete form")
    } finally {
      setIsDeleting(false)
    }
  }

  const formTitle = form.title || "Untitled Form"

  return (
    <Card className="flex flex-col justify-between border-border hover:border-border/80 transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-semibold truncate">
            {formTitle}
          </CardTitle>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold shrink-0 ${
              form.status === "published"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {form.status === "published" ? "Published" : "Draft"}
          </span>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          Created {new Date(form.created_at).toLocaleDateString()}
        </CardDescription>
      </CardHeader>

      <CardFooter className="flex items-center justify-between gap-2 pt-4 border-t border-border">
        <div>
          {form.status === "published" ? (
            <Link
              href={`/f/${form.slug}`}
              target="_blank"
              className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground gap-1"
            >
              Public View <ExternalLink className="h-3 w-3" />
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground">Draft Mode</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link
              href={`/dashboard/forms/${form.id}/edit`}
              className="gap-1.5 text-xs"
            >
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </Link>
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={isDeleting}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                {isDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                <span className="sr-only">Delete</span>
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete '{formTitle}'?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the form and all its responses. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardFooter>
    </Card>
  )
}
