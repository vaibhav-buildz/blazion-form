import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
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
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)

    let formQuery = supabase
      .from("forms")
      .select("settings, status")
      .eq("status", "published")

    if (isUuid) {
      formQuery = formQuery.or(`id.eq.${slug},slug.eq.${slug}`)
    } else {
      formQuery = formQuery.eq("slug", slug)
    }

    const { data: form, error: formError } = await formQuery.maybeSingle()

    if (formError || !form) {
      return NextResponse.json(
        { error: "Form not found or not published" },
        { status: 404 }
      )
    }

    const hash = form.settings?.password_hash
    if (!hash) {
      return NextResponse.json({ success: true })
    }

    const body = await req.json()
    const { password } = body

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      )
    }

    const isValid = await bcrypt.compare(password, hash)
    if (!isValid) {
      return NextResponse.json(
        { error: "Incorrect password. Please try again." },
        { status: 401 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error verifying form password:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
