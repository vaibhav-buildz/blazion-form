import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CreateFormButton } from "@/components/dashboard/CreateFormButton"
import { ExternalLink, Edit3 } from "lucide-react"

export const revalidate = 0

export default async function DashboardPage() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Supabase query to fetch user's forms filtering by user_id
  const { data: forms, error } = await supabase
    .from("forms")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching forms for user:", user.id, error)
  }

  return (
    <div className="mx-auto max-w-5xl p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Your Forms</h1>
          <p className="text-sm text-muted-foreground">
            Manage and view your created forms
          </p>
        </div>
        <CreateFormButton />
      </div>

      {!forms || forms.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-border p-12 text-center bg-card">
          <p className="text-sm text-muted-foreground mb-4">
            No forms yet. Create your first form.
          </p>
          <CreateFormButton />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {forms.map((form) => (
            <Card
              key={form.id}
              className="flex flex-col justify-between border-border hover:border-border/80 transition-colors"
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg font-semibold truncate">
                    {form.title || "Untitled Form"}
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
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/dashboard/forms/${form.id}/edit`}
                    className="gap-1.5 text-xs"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Edit
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
