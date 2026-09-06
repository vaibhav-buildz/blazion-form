import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { nanoid } from "nanoid"

export async function POST(req: NextRequest) {
  try {
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

    const body = await req.json()
    const { title, description, questions = [], settings = {} } = body

    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}-${nanoid(6)}`

    // Create form
    const { data: form, error: formError } = await supabase
      .from("forms")
      .insert({
        user_id: user.id,
        title,
        description: description || "",
        slug,
        status: "draft",
        settings,
      })
      .select()
      .single()

    if (formError || !form) {
      return NextResponse.json({ error: formError?.message || "Failed to create form" }, { status: 500 })
    }

    // Insert questions if provided
    if (questions.length > 0) {
      const formattedQuestions = questions.map((q: any, idx: number) => ({
        form_id: form.id,
        title: q.title,
        type: q.type,
        required: Boolean(q.required),
        position: idx,
        options: q.options || null,
        settings: q.settings || {},
      }))

      const { error: questionsError } = await supabase
        .from("questions")
        .insert(formattedQuestions)

      if (questionsError) {
        console.warn("Questions insert error:", questionsError)
      }
    }

    return NextResponse.json({ formId: form.id, slug: form.slug })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
