import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(req: NextRequest) {
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
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { email, role, workspaceName } = await req.json()

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Valid email address is required" }, { status: 400 })
    }

    const allowedRoles = ["Admin", "Editor", "Viewer"]
    const memberRole = allowedRoles.includes(role) ? role : "Editor"

    const inviteRecord = {
      id: crypto.randomUUID(),
      email: email.trim().toLowerCase(),
      role: memberRole,
      status: "Invited",
      invitedBy: user.email,
      invitedAt: new Date().toISOString(),
      workspaceName: workspaceName || "Default Workspace",
    }

    return NextResponse.json({
      success: true,
      message: `Invitation successfully sent to ${email} as ${memberRole}`,
      member: inviteRecord,
    })
  } catch (err: any) {
    console.error("Workspace invite error:", err)
    return NextResponse.json({ error: err.message || "Failed to invite member" }, { status: 500 })
  }
}
