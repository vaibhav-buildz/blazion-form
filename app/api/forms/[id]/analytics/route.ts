import { NextResponse } from "next/server"
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js"

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
      .select("settings, questions(id, title, position, type)")
      .eq("id", formId)
      .single()

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 })
    }

    const analytics = form.settings?.analytics || { questions: {} }
    const questions = ((form as any).questions || []).sort(
      (a: any, b: any) => a.position - b.position
    )

    const heatmap = questions.map((q: any) => {
      const stats = analytics.questions?.[q.id] || { views: 0, answers: 0, drops: 0 }
      const completionRate = stats.views > 0 ? Math.round((stats.answers / stats.views) * 100) : 100
      return {
        questionId: q.id,
        title: q.title,
        type: q.type,
        views: stats.views,
        answers: stats.answers,
        drops: stats.drops,
        completionRate,
      }
    })

    return NextResponse.json({ heatmap })
  } catch (err: any) {
    console.error("Fetch analytics error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
