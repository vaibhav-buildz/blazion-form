import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
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
      return NextResponse.json(
        { error: "Unauthorized. User session not found." },
        { status: 401 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const confirmation = body.confirmation?.trim()

    // Confirmation must match "DELETE" or user's email
    if (
      confirmation !== "DELETE" &&
      confirmation?.toLowerCase() !== user.email?.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "Invalid confirmation text. Must match 'DELETE' or your email." },
        { status: 400 }
      )
    }

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const supabaseAdmin = createSupabaseAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey!
    )

    // 1. Find user forms to cascade delete child records
    const { data: userForms } = await supabaseAdmin
      .from("forms")
      .select("id")
      .eq("user_id", user.id)

    const formIds = (userForms || []).map((f) => f.id)

    if (formIds.length > 0) {
      await supabaseAdmin.from("questions").delete().in("form_id", formIds)
      await supabaseAdmin.from("responses").delete().in("form_id", formIds)
      await supabaseAdmin
        .from("email_otp_verifications")
        .delete()
        .in("form_id", formIds)
      await supabaseAdmin.from("forms").delete().in("id", formIds)
    }

    // 2. Delete org profile & profile records
    await supabaseAdmin.from("org_profiles").delete().eq("user_id", user.id)
    await supabaseAdmin.from("profiles").delete().eq("id", user.id).catch(() => {})

    // 3. Delete auth user record via Admin API
    const { error: deleteUserError } =
      await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (deleteUserError) {
      console.error("Error deleting auth user:", deleteUserError)
      return NextResponse.json(
        { error: deleteUserError.message || "Failed to delete user account." },
        { status: 500 }
      )
    }

    // 4. Sign out session
    await supabase.auth.signOut().catch(() => {})

    return NextResponse.json({ success: true, message: "Account deleted successfully." })
  } catch (err: any) {
    console.error("Unexpected error in /api/user/delete:", err)
    return NextResponse.json(
      { error: err?.message || "Internal server error." },
      { status: 500 }
    )
  }
}
