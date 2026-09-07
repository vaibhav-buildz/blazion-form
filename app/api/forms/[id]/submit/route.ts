import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { resend } from "@/lib/email/resend"
import {
  generateNotificationEmail,
  generateRespondentConfirmationEmail,
} from "@/lib/email/notification-template"
import { evaluateSpamScoreWithAI, generatePersonaReportWithAI } from "@/lib/ai"
import { generateCertificatePdf } from "@/lib/certificate"
import { createApprovalToken } from "@/lib/approval-token"
import { formatDateTimeDDMMYYYY } from "@/lib/utils"


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

    // Check response limit enforcement
    if (form.settings?.response_limit) {
      const limit = parseInt(form.settings.response_limit, 10)
      if (!isNaN(limit) && limit > 0) {
        const serviceRoleKey =
          process.env.SUPABASE_SERVICE_ROLE_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        const tempAdmin = createSupabaseAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey!
        )
        const { count, error: countError } = await tempAdmin
          .from("responses")
          .select("*", { count: "exact", head: true })
          .eq("form_id", form.id)

        if (!countError && count !== null && count >= limit) {
          return NextResponse.json(
            { error: "This form has reached its response limit." },
            { status: 403 }
          )
        }
      }
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

    const mode: "none" | "login" | "otp" =
      form.settings?.email_verification_mode ||
      (form.settings?.collect_email ? "otp" : "none")

    const cleanEmail = respondent_email ? respondent_email.trim().toLowerCase() : ""

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const adminSupabase = createSupabaseAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey!
    )

    let verifiedRespondentEmail: string | null = null
    let verificationMethod: "login" | "otp" | null = null

    if (mode === "login") {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user || !user.email) {
        return NextResponse.json(
          { error: "Authentication required to submit this form" },
          { status: 401 }
        )
      }

      verifiedRespondentEmail = user.email
      verificationMethod = "login"
    } else if (mode === "otp") {
      if (!cleanEmail) {
        return NextResponse.json(
          { error: "Respondent email is required for OTP verification" },
          { status: 400 }
        )
      }

      const now = Date.now()

      const { data: verifications, error: verifError } = await adminSupabase
        .from("email_otp_verifications")
        .select("id, verified, expires_at")
        .eq("form_id", form.id)
        .eq("email", cleanEmail)
        .eq("verified", true)
        .order("created_at", { ascending: false })

      const validVerification = verifications?.find((v) => {
        const expTime = new Date(v.expires_at).getTime()
        return v.verified && (!isNaN(expTime) && expTime >= now - 60 * 60 * 1000)
      })

      if (verifError || !validVerification) {
        return NextResponse.json(
          { error: "Email verification required before submission" },
          { status: 403 }
        )
      }

      verifiedRespondentEmail = cleanEmail
      verificationMethod = "otp"
    } else {
      // mode === 'none'
      if (respondent_email && typeof respondent_email === "string" && respondent_email.trim()) {
        verifiedRespondentEmail = respondent_email.trim()
      }
      verificationMethod = null
    }

    // AI Spam/Bot Authenticity Scoring (Batch A #5)
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
    const userAgent = req.headers.get("user-agent") || ""
    const spamCheck = await evaluateSpamScoreWithAI(answers, clientIp, userAgent)

    // AI Persona Report (Batch A #4)
    let personaReport: string | null = null
    if (form.settings?.aiPersonaPrompt && typeof form.settings.aiPersonaPrompt === "string" && form.settings.aiPersonaPrompt.trim()) {
      try {
        personaReport = await generatePersonaReportWithAI(form.settings.aiPersonaPrompt, answers, form.title || "Form")
      } catch (pErr) {
        console.warn("Persona report generation skipped on error:", pErr)
      }
    }

    const metadata: Record<string, any> = {
      spamScore: spamCheck.score,
      isFlaggedSpam: spamCheck.isFlagged,
      spamReason: spamCheck.reason,
      personaReport: personaReport || undefined,
      submittedAt: new Date().toISOString(),
    }

    const insertRow: Record<string, any> = {
      form_id: form.id,
      answers,
      metadata,
    }
    if (verifiedRespondentEmail) {
      insertRow.respondent_email = verifiedRespondentEmail
    }
    if (verificationMethod) {
      insertRow.verification_method = verificationMethod
    }

    // Insert response into responses table using adminSupabase to bypass RLS for public submissions
    let { data: response, error: insertError } = await adminSupabase
      .from("responses")
      .insert([insertRow])
      .select()
      .maybeSingle()


    if (insertError && verificationMethod && insertError.message?.includes("verification_method")) {
      console.warn("Retrying response insert without verification_method column...")
      delete insertRow.verification_method
      const fallbackResult = await adminSupabase
        .from("responses")
        .insert([insertRow])
        .select()
        .maybeSingle()
      response = fallbackResult.data
      insertError = fallbackResult.error
    }

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

            const { error: fileInsertError } = await adminSupabase
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
          const submittedAt = formatDateTimeDDMMYYYY(new Date())

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

    // Send confirmation email to respondent if verified email is present
    const targetRespondentEmail = verifiedRespondentEmail || (typeof respondent_email === "string" ? respondent_email.trim() : null)
    if (targetRespondentEmail) {
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

        const submittedAt = formatDateTimeDDMMYYYY(new Date())

        const respondentHtml = generateRespondentConfirmationEmail({
          formTitle: form.title || "Untitled Form",
          submittedAt,
          answersSummary: allAnswersSummary,
        })

        const respEmailResult = await resend.emails.send({
          from: "Blazion Form <onboarding@resend.dev>",
          to: [targetRespondentEmail],
          subject: `Your response to "${form.title || "Untitled Form"}" has been recorded`,
          html: respondentHtml,
        })
        console.log("Respondent confirmation email sent successfully:", respEmailResult)
      } catch (respEmailErr) {
        console.error("Failed to send respondent confirmation email:", respEmailErr)
      }
    }

    // 19. Auto PDF Certificate generation
    let certificateUrl: string | null = null
    if (form.settings?.certificateEnabled && response?.id) {
      try {
        const doc = generateCertificatePdf({
          formTitle: form.title || "Form",
          respondentName: verifiedRespondentEmail || answers["name"] || answers["full_name"] || undefined,
          respondentEmail: verifiedRespondentEmail || undefined,
          submissionDate: new Date(),
          responseId: response.id,
          templateText: form.settings?.certificateTemplate || undefined,
        })
        const pdfArrayBuffer = doc.output("arraybuffer")
        const pdfBuffer = Buffer.from(pdfArrayBuffer)
        const storagePath = `${form.id}/${response.id}.pdf`

        const { error: certUploadErr } = await adminSupabase.storage
          .from("certificates")
          .upload(storagePath, pdfBuffer, {
            contentType: "application/pdf",
            upsert: true,
          })

        if (!certUploadErr) {
          const { data: publicUrlData } = adminSupabase.storage
            .from("certificates")
            .getPublicUrl(storagePath)
          certificateUrl = publicUrlData?.publicUrl || null
          if (certificateUrl) {
            metadata.certificateUrl = certificateUrl
            await adminSupabase
              .from("responses")
              .update({ metadata })
              .eq("id", response.id)
          }
        }
      } catch (certErr) {
        console.error("Failed to generate/upload certificate PDF:", certErr)
      }
    }

    // 13. Generic Webhook POST
    if (form.settings?.webhookUrl) {
      try {
        fetch(form.settings.webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(form.settings.webhookSecret ? { "X-Blazion-Webhook-Secret": form.settings.webhookSecret } : {}),
          },
          body: JSON.stringify({
            event: "form_response.submitted",
            form_id: form.id,
            form_title: form.title,
            response_id: response?.id,
            submitted_at: new Date().toISOString(),
            answers,
            metadata,
          }),
        }).catch((wErr) => console.warn("Webhook dispatch error:", wErr))
      } catch (wErr) {
        console.warn("Webhook trigger error:", wErr)
      }
    }

    // 18. Slot booking lock
    try {
      const bookedSlots = form.settings?.bookedSlots || []
      let slotModified = false
      for (const [qId, val] of Object.entries(answers)) {
        if (val && typeof val === "object" && (val as any).slot && (val as any).date) {
          bookedSlots.push({
            questionId: qId,
            date: (val as any).date,
            slot: (val as any).slot,
            responseId: response?.id,
            bookedAt: Date.now(),
          })
          slotModified = true
        }
      }
      if (slotModified) {
        const updatedSettings = { ...form.settings, bookedSlots }
        await adminSupabase.from("forms").update({ settings: updatedSettings }).eq("id", form.id)
      }
    } catch (slotErr) {
      console.error("Error locking booked slot:", slotErr)
    }

    // 20. Approval Workflow Initiation
    if (form.settings?.approvalWorkflow?.enabled && response?.id) {
      try {
        const stages = form.settings.approvalWorkflow.stages || []
        const stage1 = stages[0]
        if (stage1 && stage1.approverEmail) {
          const origin = new URL(req.url).origin
          const approveToken = createApprovalToken({
            responseId: response.id,
            formId: form.id,
            stage: 1,
            approverEmail: stage1.approverEmail,
            action: "approve",
          })
          const rejectToken = createApprovalToken({
            responseId: response.id,
            formId: form.id,
            stage: 1,
            approverEmail: stage1.approverEmail,
            action: "reject",
          })

          metadata.approvals = {
            status: "pending",
            currentStage: 1,
            history: [],
          }
          await adminSupabase.from("responses").update({ metadata }).eq("id", response.id)

          await resend.emails.send({
            from: "Blazion Approvals <onboarding@resend.dev>",
            to: [stage1.approverEmail],
            subject: `Action Required: Stage 1 Approval for "${form.title}"`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0f172a;">New Submission Awaiting Your Approval</h2>
                <p>A new response has been submitted for <strong>${form.title}</strong>.</p>
                <div style="margin: 24px 0;">
                  <a href="${origin}/api/approvals/${approveToken}?action=approve" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-right: 12px; display: inline-block;">Approve</a>
                  <a href="${origin}/api/approvals/${rejectToken}?action=reject" style="background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reject</a>
                </div>
              </div>
            `,
          })
        }
      } catch (apprErr) {
        console.error("Error triggering approval workflow:", apprErr)
      }
    }

    return NextResponse.json({
      success: true,
      responseId: response?.id,
      personaReport,
      certificateUrl,
    })


  } catch (error: any) {
    console.error("Server error submitting form:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
