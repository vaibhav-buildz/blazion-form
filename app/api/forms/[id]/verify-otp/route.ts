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

    console.log("[VERIFY-OTP LOOKUP INPUTS]", {
      routeParamId: id,
      resolvedFormId: form.id,
      rawEmailInput: email,
      cleanEmailNormalized: cleanEmail,
      rawCodeInput: code,
      cleanCodeNormalized: cleanCode,
    })

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const dbClient = createSupabaseAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey!
    )

    const now = Date.now()
    const nowIso = new Date().toISOString()

    // Find recent OTP verifications for this form and email
    const { data: records, error: fetchError } = await dbClient
      .from("email_otp_verifications")
      .select("*")
      .eq("form_id", form.id)
      .eq("email", cleanEmail)
      .order("created_at", { ascending: false })
      .limit(10)

    console.log("[VERIFY-OTP DEBUG QUERY RESULT]", {
      submittedFormId: form.id,
      submittedEmail: cleanEmail,
      submittedCode: cleanCode,
      serverNowIso: nowIso,
      serverNowTime: now,
      fetchError: fetchError?.message || null,
      recordsCount: records?.length || 0,
      records: records?.map((r) => {
        const expTime = new Date(r.expires_at).getTime()
        return {
          id: r.id,
          code: r.code,
          codeType: typeof r.code,
          codeMatch: String(r.code).trim() === cleanCode,
          expires_at: r.expires_at,
          expiresAtTime: expTime,
          isExpired: isNaN(expTime) || expTime < now,
          verified: r.verified,
          created_at: r.created_at,
        }
      }),
    })

    if (fetchError || !records || records.length === 0) {
      return NextResponse.json(
        { error: "No verification code requested for this email. Please request a new code." },
        { status: 400 }
      )
    }

    // Find the matching unexpired OTP record
    const matchingRecord = records.find((r) => {
      const isCodeMatch = String(r.code).trim() === cleanCode
      const expTime = new Date(r.expires_at).getTime()
      const isNotExpired = !isNaN(expTime) && expTime >= now
      return isCodeMatch && isNotExpired
    })

    if (!matchingRecord) {
      // Check if code matched an expired record
      const expiredMatch = records.find(
        (r) => String(r.code).trim() === cleanCode
      )
      if (expiredMatch) {
        return NextResponse.json(
          { error: "Verification code has expired. Please request a new code." },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: "Invalid verification code. Please check the code and try again." },
        { status: 400 }
      )
    }

    // Mark as verified
    const { error: updateErr } = await dbClient
      .from("email_otp_verifications")
      .update({ verified: true })
      .eq("id", matchingRecord.id)

    if (updateErr) {
      console.error("[VERIFY-OTP] Failed to update verified status:", updateErr)
    }

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
