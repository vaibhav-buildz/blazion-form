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
    const { form_id, ...questionData } = body

    if (!form_id) {
      return NextResponse.json({ error: "form_id is required" }, { status: 400 })
    }

    // Verify form belongs to user
    const { data: form, error: formError } = await supabase
      .from("forms")
      .select("user_id")
      .eq("id", form_id)
      .single()

    if (formError || !form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 })
    }

    if (form.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Insert question
    const { data: newQuestion, error: insertError } = await supabase
      .from("questions")
      .insert([
        {
          form_id,
          ...questionData
        },
      ])
      .select()
      .single()

    if (insertError) {
      console.error("Error creating question:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json(newQuestion)
  } catch (error: any) {
    console.error("Server error creating question:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
