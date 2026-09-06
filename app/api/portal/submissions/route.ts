import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js"

const supabaseAdmin = createSupabaseAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    let email = searchParams.get("email")?.trim().toLowerCase()

    // Also check authenticated user session if email not provided
    if (!email) {
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
      if (user?.email) {
        email = user.email.toLowerCase()
      }
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email address is required to look up your submissions." },
        { status: 400 }
      )
    }

    // Query responses where respondent_email = email
    const { data: responses, error } = await supabaseAdmin
      .from("responses")
      .select(`
        id,
        form_id,
        respondent_email,
        answers,
        metadata,
        submitted_at,
        forms:form_id (
          id,
          title,
          slug,
          settings
        )
      `)
      .eq("respondent_email", email)
      .order("submitted_at", { ascending: false })

    if (error) {
      console.error("Portal fetch error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const formatted = (responses || []).map((r: any) => {
      const formInfo = Array.isArray(r.forms) ? r.forms[0] : r.forms
      const metadata = r.metadata || {}
      return {
        id: r.id,
        formId: r.form_id,
        formTitle: formInfo?.title || "Untitled Form",
        formSlug: formInfo?.slug,
        createdAt: r.submitted_at,
        status: metadata.approval_status || "submitted",
        certificateUrl: metadata.certificate_url || null,
        personaReport: metadata.persona_report || null,
        answersCount: Object.keys(r.answers || {}).length,
      }
    })

    return NextResponse.json({ email, submissions: formatted })
  } catch (err: any) {
    console.error("Portal API exception:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
