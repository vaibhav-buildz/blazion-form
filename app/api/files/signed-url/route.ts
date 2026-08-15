import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

async function handleSignedUrlRequest(path: string) {
  if (!path || typeof path !== "string") {
    return NextResponse.json(
      { error: "Path parameter is required" },
      { status: 400 }
    )
  }

  const pathSegments = path.split("/")
  const formId = pathSegments[0]

  if (!formId) {
    return NextResponse.json(
      { error: "Invalid path format" },
      { status: 400 }
    )
  }

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
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: form, error: formError } = await supabase
    .from("forms")
    .select("user_id")
    .eq("id", formId)
    .maybeSingle()

  if (formError || !form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 })
  }

  if (form.user_id !== user.id) {
    return NextResponse.json(
      { error: "Forbidden: You do not own this form" },
      { status: 403 }
    )
  }

  const { data, error: storageError } = await supabase.storage
    .from("response-files")
    .createSignedUrl(path, 3600)

  if (storageError || !data?.signedUrl) {
    return NextResponse.json(
      { error: storageError?.message || "Failed to generate signed URL" },
      { status: 500 }
    )
  }

  return NextResponse.json({ signedUrl: data.signedUrl })
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    return await handleSignedUrlRequest(body.path)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const path = searchParams.get("path") || ""
    return await handleSignedUrlRequest(path)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
