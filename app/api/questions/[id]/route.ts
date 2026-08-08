import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params

    // Get the question to find its form_id
    const { data: question, error: questionError } = await supabase
      .from("questions")
      .select("form_id")
      .eq("id", id)
      .single()

    if (questionError || !question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 })
    }

    // Verify form belongs to user
    const { data: form, error: formError } = await supabase
      .from("forms")
      .select("user_id")
      .eq("id", question.form_id)
      .single()

    if (formError || !form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 })
    }

    if (form.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Delete question
    const { error: deleteError } = await supabase
      .from("questions")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("Error deleting question:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Server error deleting question:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
