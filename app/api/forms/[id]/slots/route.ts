import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: formIdOrSlug } = await params
    const { searchParams } = new URL(request.url)
    const targetDate = searchParams.get("date")

    if (!targetDate) {
      return NextResponse.json({ bookedSlots: [] })
    }

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const adminSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey!,
      {
        cookies: {
          getAll() { return [] },
          setAll() {},
        },
      }
    )

    // Resolve form ID if slug was passed
    const { data: form } = await adminSupabase
      .from("forms")
      .select("id")
      .or(`id.eq.${formIdOrSlug},slug.eq.${formIdOrSlug}`)
      .maybeSingle()

    if (!form) {
      return NextResponse.json({ bookedSlots: [] })
    }

    // Fetch responses for this form to check answers containing the targetDate
    const { data: responses, error } = await adminSupabase
      .from("responses")
      .select("answers")
      .eq("form_id", form.id)

    if (error || !responses) {
      return NextResponse.json({ bookedSlots: [] })
    }

    const bookedSlots: string[] = []

    for (const r of responses) {
      const answers = r.answers || {}
      for (const key of Object.keys(answers)) {
        const val = answers[key]
        if (typeof val === "string" && val.startsWith(targetDate)) {
          const slot = val.replace(targetDate, "").trim()
          if (slot && !bookedSlots.includes(slot)) {
            bookedSlots.push(slot)
          }
        }
      }
    }

    return NextResponse.json({ bookedSlots })
  } catch (err: any) {
    console.error("Fetch booked slots error:", err)
    return NextResponse.json({ bookedSlots: [] })
  }
}
