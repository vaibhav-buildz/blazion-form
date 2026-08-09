import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
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
    const body = await req.json()
    const formId = body.formId || body.form_id
    const orderedIds: string[] = body.orderedIds

    if (!formId || !Array.isArray(orderedIds)) {
      return NextResponse.json(
        { error: "formId and orderedIds array are required" },
        { status: 400 }
      )
    }

    // Verify form belongs to user
    const { data: form, error: formError } = await supabase
      .from("forms")
      .select("user_id")
      .eq("id", formId)
      .single()

    if (formError || !form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 })
    }

    if (form.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Update each question's position field based on orderedIds index
    const updatePromises = orderedIds.map((id, index) =>
      supabase
        .from("questions")
        .update({ position: index })
        .eq("id", id)
        .eq("form_id", formId)
    )

    const results = await Promise.all(updatePromises)
    const hasError = results.some((r) => r.error)

    if (hasError) {
      const firstError = results.find((r) => r.error)?.error
      console.error("Error reordering questions:", firstError)
      return NextResponse.json(
        { error: firstError?.message || "Failed to update positions" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Server error reordering questions:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
