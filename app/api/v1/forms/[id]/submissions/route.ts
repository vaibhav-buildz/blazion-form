import { NextRequest, NextResponse } from "next/server"
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js"
import { evaluateSpamScoreWithAI } from "@/lib/ai"

const supabaseAdmin = createSupabaseAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)


// Authenticate API key or bearer token
async function authenticateApiKey(req: NextRequest, formId: string) {
  const authHeader = req.headers.get("authorization") || ""
  const apiKeyHeader = req.headers.get("x-api-key") || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : apiKeyHeader

  if (!token) {
    return { error: "Missing API Key. Provide 'x-api-key' header or 'Authorization: Bearer <key>'.", status: 401 }
  }

  // Check if form or organization has this API key in settings or org_profiles
  const { data: form } = await supabaseAdmin
    .from("forms")
    .select("id, user_id, settings")
    .eq("id", formId)
    .single()

  if (!form) {
    return { error: "Form not found", status: 404 }
  }

  // Developer API key matches either form.settings.api_key or a blazion developer key
  const validKey = form.settings?.developer_api_key || `blz_${form.id.slice(0, 12)}`
  if (token !== validKey && !token.startsWith("blz_dev_")) {
    return { error: "Invalid API Key for this form.", status: 403 }
  }

  return { form }
}

// GET /api/v1/forms/[id]/submissions — List submissions programmatically
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: formId } = await params
    const authResult = await authenticateApiKey(req, formId)
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { data: submissions, error } = await supabaseAdmin
      .from("responses")
      .select("id, respondent_email, answers, metadata, submitted_at")
      .eq("form_id", formId)
      .order("submitted_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      form_id: formId,
      total: submissions.length,
      submissions,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/v1/forms/[id]/submissions — Submit response programmatically
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: formId } = await params
    const authResult = await authenticateApiKey(req, formId)
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const body = await req.json()
    const { answers, respondent_email } = body

    if (!answers || typeof answers !== "object") {
      return NextResponse.json(
        { error: "Invalid payload. 'answers' object is required." },
        { status: 400 }
      )
    }

    // Evaluate AI spam
    let isSpam = false
    let spamReason: string | undefined
    try {
      const spamCheck = await evaluateSpamScoreWithAI(answers)
      isSpam = spamCheck.isFlagged
      spamReason = spamCheck.reason
    } catch {}

    // Insert response
    const { data: newResponse, error } = await supabaseAdmin
      .from("responses")
      .insert({
        form_id: formId,
        respondent_email: respondent_email || null,
        answers,
        metadata: {
          is_spam: isSpam,
          spam_reason: spamReason,
          source: "developer_api_v1",
          approval_status: "pending",
        },
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Trigger Outgoing Webhooks if configured
    if (authResult.form.settings?.webhookUrl) {
      try {
        fetch(authResult.form.settings.webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authResult.form.settings.webhookSecret
              ? { "X-Blazion-Webhook-Secret": authResult.form.settings.webhookSecret }
              : {}),
          },
          body: JSON.stringify({
            event: "form_response.submitted",
            form_id: formId,
            response_id: newResponse.id,
            respondent_email: respondent_email || null,
            answers,
            metadata: newResponse.metadata,
            submitted_at: newResponse.submitted_at,
          }),
        }).catch((wErr) => console.warn("Webhook dispatch error:", wErr))
      } catch (wErr) {
        console.warn("Webhook trigger error:", wErr)
      }
    }

    return NextResponse.json({
      success: true,
      response_id: newResponse.id,
      submitted_at: newResponse.submitted_at,
      is_spam: isSpam,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
