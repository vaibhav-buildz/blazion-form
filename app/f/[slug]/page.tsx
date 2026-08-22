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

  // Check form expiry
  if (form.settings?.expires_at) {
    const expiresAt = new Date(form.settings.expires_at)
    if (!isNaN(expiresAt.getTime()) && expiresAt < new Date()) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center space-y-3 max-w-md border border-border bg-card p-8 rounded-lg shadow-sm">
            <h1 className="text-2xl font-bold text-foreground">
              Form Closed
            </h1>
            <p className="text-muted-foreground text-sm">
              This form has closed and is no longer accepting responses.
            </p>
          </div>
        </div>
      )
    }
  }

  // Check form response limit
  const rawLimit = form.settings?.response_limit
  const responseLimitNum =
    rawLimit !== undefined && rawLimit !== null && rawLimit !== ""
      ? Number(rawLimit)
      : null

  let initialResponseCount = 0

  if (
    responseLimitNum !== null &&
    !isNaN(responseLimitNum) &&
    responseLimitNum > 0
  ) {
    const { count: responseCount, error: countError } = await supabase
      .from("responses")
      .select("id", { count: "exact", head: true })
      .eq("form_id", form.id)

    initialResponseCount = responseCount ?? 0

    if (countError) {
      console.error("Error querying response count:", countError)
    }

    if (initialResponseCount >= responseLimitNum) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center space-y-3 max-w-md border border-border bg-card p-8 rounded-lg shadow-sm">
            <h1 className="text-2xl font-bold text-foreground">
              Form Closed
            </h1>
            <p className="text-muted-foreground text-sm">
              This form is no longer accepting responses (response limit reached).
            </p>
          </div>
        </div>
      )
    }
  }

  // Fetch questions for this form ordered by position
  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("form_id", form.id)
    .order("position", { ascending: true })

  return (
    <PublicFormFill
      form={form}
      questions={questions || []}
      initialResponseCount={initialResponseCount}
    />
  )
}
