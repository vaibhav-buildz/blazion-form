import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { nanoid } from "nanoid"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // 1. Fetch form
    const { data: existingForm, error: formError } = await supabase
      .from("forms")
      .select("*")
      .eq("id", id)
      .single()

    if (formError || !existingForm) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 })
    }

    if (existingForm.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // 2. Fetch questions
    const { data: questions } = await supabase
      .from("questions")
      .select("*")
      .eq("form_id", existingForm.id)
      .order("position", { ascending: true })

    // 3. Create duplicated form
    const newSlug = nanoid(10)
    const { data: newForm, error: createError } = await supabase
      .from("forms")
      .insert([
        {
          user_id: user.id,
          title: `Copy of ${existingForm.title || "Untitled Form"}`,
          description: existingForm.description || "",
          status: "draft",
          slug: newSlug,
          settings: existingForm.settings || {},
        },
      ])
      .select()
      .single()

    if (createError || !newForm) {
      console.error("Error creating duplicate form:", createError)
      return NextResponse.json(
        { error: createError?.message || "Failed to create duplicate form" },
        { status: 500 }
      )
    }

    // 4. Duplicate questions
    if (questions && questions.length > 0) {
      const newQuestions = questions.map((q) => ({
        form_id: newForm.id,
        type: q.type,
        title: q.title,
        description: q.description,
        required: q.required,
        position: q.position,
        options: q.options,
        settings: q.settings,
      }))

      const { error: insertQuestionsError } = await supabase
        .from("questions")
        .insert(newQuestions)

      if (insertQuestionsError) {
        console.error("Error duplicating questions:", insertQuestionsError)
      }
    }

    return NextResponse.json({ success: true, newFormId: newForm.id })
  } catch (error: any) {
    console.error("Server error duplicating form:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
