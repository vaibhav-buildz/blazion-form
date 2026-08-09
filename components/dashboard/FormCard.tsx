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
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ExternalLink,
  Edit3,
  Trash2,
  Loader2,
  BarChart3,
  MoreVertical,
  Copy,
} from "lucide-react"

interface FormCardProps {
  form: {
    id: string
    title: string
    slug: string
    status: string
    created_at: string
    responses?: Array<{ count: number }>
    [key: string]: any
  }
}

export function FormCard({ form }: FormCardProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isDuplicating, setIsDuplicating] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)

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

  const handleDuplicate = async () => {
    setIsDuplicating(true)
    try {
      const res = await fetch(`/api/forms/${form.id}/duplicate`, {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to duplicate form")
      }

      router.push(`/dashboard/forms/${data.newFormId}/edit`)
    } catch (err: any) {
      console.error("Duplicate form error:", err)
      alert(err.message || "Failed to duplicate form")
    } finally {
      setIsDuplicating(false)
    }
  }

  const formTitle = form.title || "Untitled Form"
  const responseCount = Array.isArray(form.responses)
    ? form.responses[0]?.count || 0
    : typeof form.responses_count === "number"
    ? form.responses_count
    : 0

  return (
    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <Card className="flex flex-col justify-between border-border transition-all duration-200 hover:border-primary/50 hover:shadow-md group">
        <CardHeader className="space-y-3">
          <CardTitle className="text-xl font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {formTitle}
          </CardTitle>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${
                form.status === "published"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-muted text-muted-foreground border border-border"
              }`}
            >
              {form.status === "published" ? "Published" : "Draft"}
            </span>

            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary border border-primary/20">
              {responseCount} {responseCount === 1 ? "response" : "responses"}
            </span>

            <span className="text-muted-foreground ml-auto">
              Created {new Date(form.created_at).toLocaleDateString()}
            </span>
          </div>
        </CardHeader>

        <CardFooter className="flex items-center justify-between gap-2 pt-4 border-t border-border mt-2">
          {/* Left Action: Visible Edit Button */}
          <Button
            variant="outline"
            size="sm"
            asChild
            className="border-primary/40 text-primary hover:bg-primary/10 font-medium"
          >
            <Link
              href={`/dashboard/forms/${form.id}/edit`}
              className="gap-1.5 text-xs"
            >
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </Link>
          </Button>

          {/* Right Action: Three-dot Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
              >
                {isDuplicating || isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreVertical className="h-4 w-4" />
                )}
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {form.status === "published" ? (
                <DropdownMenuItem asChild>
                  <a
                    href={`/f/${form.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-pointer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" /> View Public Form
                  </a>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem disabled>
                  <ExternalLink className="mr-2 h-4 w-4" /> View Public Form (Draft)
                </DropdownMenuItem>
              )}

              <DropdownMenuItem asChild>
                <Link
                  href={`/dashboard/forms/${form.id}/responses`}
                  className="cursor-pointer"
                >
                  <BarChart3 className="mr-2 h-4 w-4" /> View Responses
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleDuplicate}
                disabled={isDuplicating}
                className="cursor-pointer"
              >
                {isDuplicating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                Duplicate
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardFooter>
      </Card>

      {/* Delete Confirmation Modal */}
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
  )
}
