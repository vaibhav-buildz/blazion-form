import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { PublicFormFill } from "@/components/form-builder/PublicFormFill"

export const revalidate = 0

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
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

  // Fetch published form by slug
  const { data: form, error: formError } = await supabase
    .from("forms")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle()

  if (formError || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-3 max-w-md">
          <h1 className="text-2xl font-bold text-foreground">
            Form Not Available
          </h1>
          <p className="text-muted-foreground text-sm">
            This form is either not published or does not exist.
          </p>
        </div>
      </div>
    )
  }

  // Fetch questions for this form ordered by position
  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("form_id", form.id)
    .order("position", { ascending: true })

  return <PublicFormFill form={form} questions={questions || []} />
}
