import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function PATCH(
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()

    // Verify form belongs to user
    const { data: existingForm, error: fetchError } = await supabase
      .from("forms")
      .select("user_id")
      .eq("id", id)
      .single()

    if (fetchError || !existingForm) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 })
    }

    if (existingForm.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Update form
    const { data: updatedForm, error: updateError } = await supabase
      .from("forms")
      .update(body)
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating form:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json(updatedForm)
  } catch (error: any) {
    console.error("Server error updating form:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Verify form belongs to user
    const { data: existingForm, error: fetchError } = await supabase
      .from("forms")
      .select("user_id")
      .eq("id", id)
      .single()

    if (fetchError || !existingForm) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 })
    }

    if (existingForm.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Delete form
    const { error: deleteError } = await supabase
      .from("forms")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("Error deleting form:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Server error deleting form:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

