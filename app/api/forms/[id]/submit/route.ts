import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { resend } from "@/lib/email/resend"
import {
  generateNotificationEmail,
  generateRespondentConfirmationEmail,
} from "@/lib/email/notification-template"

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
    console.log("API /api/forms/[id]/submit ROUTE REACHED for param id/slug:", id)

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    let formQuery = supabase
      .from("forms")
      .select("id, title, user_id, settings, status")
      .eq("status", "published")

    if (isUuid) {
      formQuery = formQuery.or(`id.eq.${id},slug.eq.${id}`)
    } else {
      formQuery = formQuery.eq("slug", id)
    }

    const { data: form, error: formError } = await formQuery.maybeSingle()

    if (formError || !form) {
      console.error("Form error or not found in submit route:", formError)
      return NextResponse.json(
        { error: "Form not found or not published" },
        { status: 404 }
      )
    }


    const body = await req.json()
    console.log("INCOMING SUBMIT BODY:", JSON.stringify(body, null, 2))
    const { answers, respondent_email } = body

    if (!answers || typeof answers !== "object") {
      return NextResponse.json(
        { error: "Invalid response data" },
        { status: 400 }
      )
    }

    const insertRow: Record<string, any> = {
      form_id: form.id,
      answers,
    }
    if (respondent_email && typeof respondent_email === "string" && respondent_email.trim()) {
      insertRow.respondent_email = respondent_email.trim()
    }

    // Insert response into responses table
    const { data: response, error: insertError } = await supabase
      .from("responses")
      .insert([insertRow])
      .select()
      .maybeSingle()

    if (insertError) {
      console.error("Supabase insert error saving response:", insertError)
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    console.log("SUCCESSFULLY INSERTED RESPONSE:", response)

    // Insert corresponding rows into file_uploads table for file_upload questions
    if (response?.id) {
      try {
        const { data: questions } = await supabase
          .from("questions")
          .select("id, type")
          .eq("form_id", form.id)

        const fileUploadQuestions = (questions || []).filter(
          (q: any) => q.type === "file_upload"
        )

        for (const q of fileUploadQuestions) {
          const storagePath = answers[q.id]
          if (typeof storagePath === "string" && storagePath.trim()) {
            const pathParts = storagePath.split("/")
            const fileNameRaw = pathParts.pop() || ""
            const fileName = fileNameRaw.replace(/^\d+-/, "") || fileNameRaw
            let fileSize = 0

            try {
              const folder = pathParts.join("/")
              const { data: files } = await supabase.storage
                .from("response-files")
                .list(folder, { search: fileNameRaw })

              const matchingFile = files?.find((f) => f.name === fileNameRaw)
              if (matchingFile?.metadata?.size) {
                fileSize = matchingFile.metadata.size
              }
            } catch (err) {
              console.error("Error fetching file size from storage:", err)
            }

            const { error: fileInsertError } = await supabase
              .from("file_uploads")
              .insert([
                {
                  response_id: response.id,
                  question_id: q.id,
                  storage_path: storagePath,
                  file_name: fileName,
                  file_size: fileSize,
                },
              ])

            if (fileInsertError) {
              console.error("Supabase insert error for file_uploads:", fileInsertError)
            }
          }
        }
      } catch (err) {
        console.error("Error processing file_uploads on submit:", err)
      }
    }

    // Send email notification to form owner if enabled
    try {
      const notifyOnResponse = form.settings?.notify_on_response !== false
      if (notifyOnResponse && form.user_id) {
        // Fetch form owner's email
        const serviceRoleKey =
          process.env.SUPABASE_SERVICE_ROLE_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        const supabaseAdmin = createSupabaseAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey!
        )

        let ownerEmail: string | null = null
        try {
          const { data: userData, error: userError } =
            await supabaseAdmin.auth.admin.getUserById(form.user_id)
          if (userData?.user?.email) {
            ownerEmail = userData.user.email
          } else if (userError) {
            console.error("Error fetching user email via getUserById:", userError)
          }
        } catch (adminErr) {
          console.error("Exception fetching form owner user via admin:", adminErr)
        }

        // Fallback to org_profiles contact_email if getUserById didn't yield an email
        if (!ownerEmail) {
          try {
            const { data: profile } = await supabase
              .from("org_profiles")
              .select("contact_email")
              .eq("user_id", form.user_id)
              .maybeSingle()
            if (profile?.contact_email) {
              ownerEmail = profile.contact_email
            }
          } catch (profErr) {
            console.error("Error fetching profile contact_email fallback:", profErr)
          }
        }

        if (ownerEmail) {
          // Fetch questions to build answersSummary
          const { data: formQuestions } = await supabase
            .from("questions")
            .select("id, type, title, position")
            .eq("form_id", form.id)
            .order("position", { ascending: true })

          const answersSummary: Array<{ question: string; answer: string }> = []
          if (formQuestions && Array.isArray(formQuestions)) {
            for (const q of formQuestions) {
              if (q.type === "section_break") continue
              const ansVal = answers[q.id]
              if (ansVal !== undefined && ansVal !== null && ansVal !== "") {
                let formattedAns = ""
                if (Array.isArray(ansVal)) {
                  formattedAns = ansVal.join(", ")
                } else if (typeof ansVal === "object") {
                  formattedAns = JSON.stringify(ansVal)
                } else {
                  formattedAns = String(ansVal)
                }
                answersSummary.push({
                  question: q.title || "Untitled Question",
                  answer: formattedAns,
                })
              }
            }
          }

          const origin = new URL(req.url).origin
          const responseUrl = `${origin}/dashboard/forms/${form.id}/responses`
          const submittedAt = new Date().toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          })

          const html = generateNotificationEmail({
            formTitle: form.title || "Untitled Form",
            submittedAt,
            answersSummary,
            responseUrl,
          })

          const emailResult = await resend.emails.send({
            from: "Blazion Form <onboarding@resend.dev>",
            to: [ownerEmail],
            subject: `New response to "${form.title || "Untitled Form"}"`,
            html,
          })
          console.log("Email notification sent successfully:", emailResult)
        } else {
          console.warn("Could not find owner email for form submission notification:", form.user_id)
        }
      }
    } catch (emailErr) {
      console.error("Failed to send response notification email:", emailErr)
    }

    // Send confirmation email to respondent if respondent_email is present
    if (respondent_email && typeof respondent_email === "string" && respondent_email.trim()) {
      try {
        const { data: formQuestions } = await supabase
          .from("questions")
          .select("id, type, title, position")
          .eq("form_id", form.id)
          .order("position", { ascending: true })

        const allAnswersSummary: Array<{ question: string; answer: string }> = []
        if (formQuestions && Array.isArray(formQuestions)) {
          for (const q of formQuestions) {
            if (q.type === "section_break") continue
            const ansVal = answers[q.id]
            if (ansVal !== undefined && ansVal !== null && ansVal !== "") {
              let formattedAns = ""
              if (Array.isArray(ansVal)) {
                formattedAns = ansVal.join(", ")
              } else if (typeof ansVal === "object") {
                formattedAns = JSON.stringify(ansVal)
              } else {
                formattedAns = String(ansVal)
              }
              allAnswersSummary.push({
                question: q.title || "Untitled Question",
                answer: formattedAns,
              })
            }
          }
        }

        const submittedAt = new Date().toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        })

        const respondentHtml = generateRespondentConfirmationEmail({
          formTitle: form.title || "Untitled Form",
          submittedAt,
          answersSummary: allAnswersSummary,
        })

        const respEmailResult = await resend.emails.send({
          from: "Blazion Form <onboarding@resend.dev>",
          to: [respondent_email.trim()],
          subject: `Your response to "${form.title || "Untitled Form"}" has been recorded`,
          html: respondentHtml,
        })
        console.log("Respondent confirmation email sent successfully:", respEmailResult)
      } catch (respEmailErr) {
        console.error("Failed to send respondent confirmation email:", respEmailErr)
      }
    }

    return NextResponse.json({ success: true, responseId: response?.id })

  } catch (error: any) {
    console.error("Server error submitting form:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
