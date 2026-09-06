import { NextRequest, NextResponse } from "next/server"
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js"
import { nanoid } from "nanoid"

const supabaseAdmin = createSupabaseAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// In-memory sliding window rate limiter: 60 requests/minute per key
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(key: string, limit = 60, windowMs = 60000): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(key)

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (record.count >= limit) {
    return false
  }

  record.count++
  return true
}

function getApiKey(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization") || ""
  const apiKeyHeader = req.headers.get("x-api-key") || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : apiKeyHeader
  return token ? token.trim() : null
}

// GET /api/v1/forms — List forms programmatically
export async function GET(req: NextRequest) {
  try {
    const token = getApiKey(req)
    if (!token) {
      return NextResponse.json(
        { error: "Missing API key. Provide 'x-api-key' or 'Authorization: Bearer <key>'." },
        { status: 401 }
      )
    }

    if (!checkRateLimit(token)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Maximum 60 requests per minute." },
        { status: 429 }
      )
    }

    // Query forms
    const { data: forms, error } = await supabaseAdmin
      .from("forms")
      .select("id, title, description, slug, status, created_at, settings")
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const formattedForms = (forms || []).map((f) => ({
      id: f.id,
      title: f.title,
      description: f.description,
      slug: f.slug,
      status: f.status,
      createdAt: f.created_at,
      collectEmail: Boolean(f.settings?.collect_email),
    }))

    return NextResponse.json({
      success: true,
      total: formattedForms.length,
      forms: formattedForms,
    })
  } catch (err: any) {
    console.error("V1 GET /forms error:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}

// POST /api/v1/forms — Create a new form programmatically
export async function POST(req: NextRequest) {
  try {
    const token = getApiKey(req)
    if (!token) {
      return NextResponse.json(
        { error: "Missing API key. Provide 'x-api-key' or 'Authorization: Bearer <key>'." },
        { status: 401 }
      )
    }

    if (!checkRateLimit(token)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Maximum 60 requests per minute." },
        { status: 429 }
      )
    }

    const body = await req.json()
    const { title, description, questions = [], settings = {} } = body

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Missing or invalid 'title' parameter." }, { status: 400 })
    }

    // Find any existing system/admin user or fallback user_id
    const { data: existingForm } = await supabaseAdmin
      .from("forms")
      .select("user_id")
      .limit(1)
      .maybeSingle()

    const userId = existingForm?.user_id || "00000000-0000-0000-0000-000000000000"
    const formSlug = nanoid(10)

    const { data: newForm, error: formError } = await supabaseAdmin
      .from("forms")
      .insert([
        {
          user_id: userId,
          title: title.trim(),
          description: description || "",
          slug: formSlug,
          status: "draft",
          settings: {
            ...settings,
            createdViaApi: true,
            developer_api_key: token,
          },
        },
      ])
      .select()
      .single()

    if (formError || !newForm) {
      return NextResponse.json({ error: formError?.message || "Failed to create form" }, { status: 500 })
    }

    // Insert questions if provided
    if (Array.isArray(questions) && questions.length > 0) {
      const questionRows = questions.map((q: any, idx: number) => ({
        form_id: newForm.id,
        title: q.title || `Question ${idx + 1}`,
        type: q.type || "short_text",
        required: Boolean(q.required),
        options: q.options || [],
        position: idx,
        settings: q.settings || {},
      }))

      await supabaseAdmin.from("questions").insert(questionRows)
    }

    return NextResponse.json({
      success: true,
      message: "Form created successfully",
      form: {
        id: newForm.id,
        title: newForm.title,
        slug: newForm.slug,
        status: newForm.status,
        editUrl: `/dashboard/forms/${newForm.id}/edit`,
        publicUrl: `/f/${newForm.slug}`,
      },
    })
  } catch (err: any) {
    console.error("V1 POST /forms error:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
