import { NextResponse } from "next/server"
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js"

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: formId } = await props.params
    const body = await request.json()
    const { eventType, questionId } = body

    if (!eventType || !questionId) {
      return NextResponse.json({ ok: true })
    }

    const admin = createSupabaseAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: form } = await admin
      .from("forms")
      .select("settings")
      .eq("id", formId)
      .single()

    if (form) {
      const settings = form.settings || {}
      const analytics = settings.analytics || { questions: {}, totalViews: 0, totalStarts: 0 }

      if (!analytics.questions[questionId]) {
        analytics.questions[questionId] = { views: 0, answers: 0, drops: 0 }
      }

      if (eventType === "question_viewed") {
        analytics.questions[questionId].views = (analytics.questions[questionId].views || 0) + 1
      } else if (eventType === "question_answered") {
        analytics.questions[questionId].answers = (analytics.questions[questionId].answers || 0) + 1
      } else if (eventType === "question_abandoned") {
        analytics.questions[questionId].drops = (analytics.questions[questionId].drops || 0) + 1
      }

      settings.analytics = analytics
      await admin.from("forms").update({ settings }).eq("id", formId)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Analytics event error:", err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
