import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ResponsesView } from "@/components/form-builder/ResponsesView"

export const revalidate = 0

export default async function ResponsesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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

  // Fetch form and verify ownership
  const { data: form, error: formError } = await supabase
    .from("forms")
    .select("*")
    .eq("id", id)
    .single()

  if (formError || !form || form.user_id !== user.id) {
    redirect("/dashboard")
  }

  // Fetch questions for this form ordered by position
  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("form_id", form.id)
    .order("position", { ascending: true })

  // Fetch responses for this form ordered by submitted_at descending (or fallback to id)
  const { data: responses, error: responsesError } = await supabase
    .from("responses")
    .select("*")
    .eq("form_id", form.id)
    .order("submitted_at", { ascending: false })

  console.log("RESPONSES PAGE QUERY DEBUG:", {
    formId: form.id,
    userId: user.id,
    responsesCount: responses?.length ?? 0,
    responses,
    error: responsesError,
  })



  return (
    <ResponsesView
      form={form}
      questions={questions || []}
      responses={responses || []}
    />
  )
}
