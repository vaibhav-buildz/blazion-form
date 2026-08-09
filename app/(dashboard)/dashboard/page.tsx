import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { FormCard } from "@/components/dashboard/FormCard"
import { CreateFormButton } from "@/components/dashboard/CreateFormButton"




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

  // Supabase query to fetch user's forms with response count filtering by user_id
  const { data: forms, error } = await supabase
    .from("forms")
    .select("*, responses(count)")
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
            <FormCard key={form.id} form={form} />
          ))}
        </div>

      )}
    </div>
  )
}
