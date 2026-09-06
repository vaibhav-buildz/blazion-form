import { NextResponse } from "next/server"
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js"
import { summarizeResponsesWithAI } from "@/lib/ai"

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: formId } = await props.params

    const admin = createSupabaseAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: form } = await admin
      .from("forms")
      .select("title, settings")
      .eq("id", formId)
      .single()

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 })
    }

    const { data: responses, error } = await admin
      .from("responses")
      .select("answers")
      .eq("form_id", formId)
      .limit(100)

    if (error || !responses || responses.length === 0) {
      return NextResponse.json(
        { error: "No responses available to summarize yet." },
        { status: 400 }
      )
    }

    const answersList = responses.map((r) => r.answers)
    const summary = await summarizeResponsesWithAI(form.title, answersList)

    return NextResponse.json({ summary })
  } catch (err: any) {
    console.error("AI Summary route error:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to generate AI summary" },
      { status: 500 }
    )
  }
}
