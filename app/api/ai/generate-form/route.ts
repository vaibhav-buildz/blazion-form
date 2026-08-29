import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { generateFormWithAI } from "@/lib/ai"

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
          } catch {
            // Ignored in Route Handler when cookies are managed by middleware
          }
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
    const body = await req.json().catch(() => ({}))
    const { description } = body

    if (!description || typeof description !== "string" || !description.trim()) {
      return NextResponse.json(
        { error: "Please provide a description for the form." },
        { status: 400 }
      )
    }

    const generated = await generateFormWithAI(description)

    const slug = nanoid(10)
    const { data: newForm, error: formError } = await supabase
      .from("forms")
      .insert([
        {
          title: generated.formTitle || "Untitled Form",
          slug,
          status: "draft",
          user_id: user.id,
        },
      ])
      .select()
      .single()

    if (formError || !newForm) {
      console.error("Error creating form in DB:", formError)
      return NextResponse.json(
        { error: "AI generation failed, please try again" },
        { status: 500 }
      )
    }

    if (generated.questions && generated.questions.length > 0) {
      const questionsToInsert = generated.questions.map((q, index) => ({
        form_id: newForm.id,
        type: q.type,
        title: q.title,
        description: q.description || "",
        required: Boolean(q.required),
        position: index,
        options: Array.isArray(q.options) ? q.options : [],
        settings: q.settings || {},
      }))

      const { error: questionsError } = await supabase
        .from("questions")
        .insert(questionsToInsert)

      if (questionsError) {
        console.error("Error inserting generated questions:", questionsError)
        return NextResponse.json(
          { error: "AI generation failed, please try again" },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ formId: newForm.id })
  } catch (error: any) {
    console.error("AI form generation route error:", error)
    return NextResponse.json(
      { error: "AI generation failed, please try again" },
      { status: 500 }
    )
  }
}
