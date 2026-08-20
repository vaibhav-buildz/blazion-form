import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"
import { resend } from "@/lib/email/resend"

const emailSchema = z.string().email("Invalid email address")

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
    const emailResult = emailSchema.safeParse(body.email)

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error.issues[0]?.message || "Invalid email address" },
        { status: 400 }
      )
    }

    const email = emailResult.data.trim().toLowerCase()

    // Generate 6-digit numeric OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes

    // Admin client for DB write
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const dbClient = createSupabaseAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey!
    )

    // Save record to email_otp_verifications
    const { error: dbError } = await dbClient
      .from("email_otp_verifications")
      .insert([
        {
          form_id: form.id,
          email,
          code,
          verified: false,
          expires_at: expiresAt,
        },
      ])

    if (dbError) {
      console.error("Error saving OTP to database:", dbError)
    }

    // Send email with Resend
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #111827; margin-bottom: 8px;">Verify your email address</h2>
        <p style="color: #4b5563; font-size: 14px; margin-bottom: 20px;">
          You requested an email verification code to respond to <strong>${form.title || "the form"}</strong>.
        </p>
        <div style="background-color: #f3f4f6; padding: 16px; text-align: center; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1f2937; margin-bottom: 20px;">
          ${code}
        </div>
        <p style="color: #6b7280; font-size: 12px;">
          This code will expire in 10 minutes. If you did not request this code, you can safely ignore this email.
        </p>
      </div>
    `

    const resendResult = await resend.emails.send({
      from: "Blazion Form <onboarding@resend.dev>",
      to: [email],
      subject: `Your verification code for "${form.title || "Blazion Form"}"`,
      html: htmlBody,
    })

    console.log("OTP Email sent result:", resendResult)

    return NextResponse.json({
      success: true,
      message: "Verification code sent to your email",
    })
  } catch (error: any) {
    console.error("Error sending OTP:", error)
    return NextResponse.json({ error: error.message || "Failed to send verification code" }, { status: 500 })
  }
}
