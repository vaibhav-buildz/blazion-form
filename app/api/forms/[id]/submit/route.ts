import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

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

  try {
    // Lookup published form by slug or id
    const { data: form, error: formError } = await supabase
      .from("forms")
      .select("id, status")
      .or(`id.eq.${id},slug.eq.${id}`)
      .eq("status", "published")
      .single()

    if (formError || !form) {
      return NextResponse.json(
        { error: "Form not found or not published" },
        { status: 404 }
      )
    }

    const body = await req.json()
    const { answers } = body

    if (!answers || typeof answers !== "object") {
      return NextResponse.json(
        { error: "Invalid response data" },
        { status: 400 }
      )
    }

    // Insert response into responses table
    const { data: response, error: insertError } = await supabase
      .from("responses")
      .insert([
        {
          form_id: form.id,
          answers,
        },
      ])
      .select()
      .single()

    if (insertError) {
      console.error("Error saving form response:", insertError)
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, responseId: response?.id })
  } catch (error: any) {
    console.error("Server error submitting form:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
