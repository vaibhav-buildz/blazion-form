import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js"
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
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    let formQuery = supabase
      .from("forms")
      .select("id, title, settings, status")
      .eq("status", "published")

    if (isUuid) {
      formQuery = formQuery.or(`id.eq.${id},slug.eq.${id}`)
    } else {
      formQuery = formQuery.eq("slug", id)
    }

    const { data: form, error: formError } = await formQuery.maybeSingle()

    if (formError || !form) {
      return NextResponse.json(
        { error: "Form not found or not published" },
        { status: 404 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { email, code } = body

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ error: "Verification code is required" }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanCode = code.trim()

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const dbClient = createSupabaseAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey!
    )

    const nowIso = new Date().toISOString()

    // Find non-expired record matching form_id, email, and code
    const { data: records, error: fetchError } = await dbClient
      .from("email_otp_verifications")
      .select("id, expires_at, verified")
      .eq("form_id", form.id)
      .eq("email", cleanEmail)
      .eq("code", cleanCode)
      .gte("expires_at", nowIso)
      .order("created_at", { ascending: false })

    if (fetchError || !records || records.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired verification code. Please request a new code." },
        { status: 400 }
      )
    }

    const matchingRecord = records[0]

    // Mark as verified
    await dbClient
      .from("email_otp_verifications")
      .update({ verified: true })
      .eq("id", matchingRecord.id)

    return NextResponse.json({
      success: true,
      verified: true,
      message: "Email successfully verified",
    })
  } catch (error: any) {
    console.error("Error verifying OTP:", error)
    return NextResponse.json(
      { error: error.message || "Failed to verify code" },
      { status: 500 }
    )
  }
}
