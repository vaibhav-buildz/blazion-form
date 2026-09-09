import { NextResponse } from "next/server"
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js"
import { verifyApprovalToken, createApprovalToken } from "@/lib/approval-token"
import { resend } from "@/lib/email/resend"

export async function GET(
  request: Request,
  props: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await props.params
    const { searchParams } = new URL(request.url)
    const actionParam = searchParams.get("action") as "approve" | "reject" | null

    const payload = verifyApprovalToken(token)
    if (!payload) {
      return new Response(
        `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;text-align:center;">
          <h2 style="color:#ef4444;">Invalid or Expired Approval Link</h2>
          <p>This verification link is invalid, corrupted, or has expired.</p>
        </body></html>`,
        { status: 400, headers: { "Content-Type": "text/html" } }
      )
    }

    const action = actionParam || payload.action

    const admin = createSupabaseAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: response, error: respErr } = await admin
      .from("responses")
      .select("id, form_id, metadata, respondent_email, answers")
      .eq("id", payload.responseId)
      .single()

    if (respErr || !response) {
      return new Response(
        `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;text-align:center;">
          <h2 style="color:#ef4444;">Submission Not Found</h2>
          <p>The response record for this approval cannot be located.</p>
        </body></html>`,
        { status: 404, headers: { "Content-Type": "text/html" } }
      )
    }

    const { data: form } = await admin
      .from("forms")
      .select("title, settings")
      .eq("id", payload.formId)
      .single()

    const metadata = response.metadata || {}
    const workflow = form?.settings?.approvalWorkflow
    const stages = workflow?.stages || []

    const approvals = metadata.approvals || {
      status: "pending",
      currentStage: payload.stage,
      history: [],
    }

    // Record this action
    approvals.history = approvals.history || []
    approvals.history.push({
      stage: payload.stage,
      approverEmail: payload.approverEmail,
      action,
      timestamp: new Date().toISOString(),
    })

    let isFinal = false

    if (action === "reject") {
      approvals.status = "rejected"
    } else {
      // Check if there is a next stage
      const nextStage = stages.find((s: any) => s.stage === payload.stage + 1)
      if (nextStage && nextStage.approverEmail) {
        approvals.currentStage = nextStage.stage
        // Dispatch email to next approver
        try {
          const origin = new URL(request.url).origin
          const approveToken = createApprovalToken({
            responseId: response.id,
            formId: payload.formId,
            stage: nextStage.stage,
            approverEmail: nextStage.approverEmail,
            action: "approve",
          })
          const rejectToken = createApprovalToken({
            responseId: response.id,
            formId: payload.formId,
            stage: nextStage.stage,
            approverEmail: nextStage.approverEmail,
            action: "reject",
          })

          await resend.emails.send({
            from: "FormSetu Approvals <onboarding@resend.dev>",
            to: [nextStage.approverEmail],
            subject: `Action Required: Stage ${nextStage.stage} Approval for "${form?.title}"`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
                <h2 style="color: #0f172a;">Submission Awaiting Your Stage ${nextStage.stage} Approval</h2>
                <p>A response for <strong>${form?.title}</strong> was approved by stage ${payload.stage} and now requires your review.</p>
                <div style="margin: 24px 0; display: flex; gap: 12px;">
                  <a href="${origin}/api/approvals/${approveToken}?action=approve" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">Approve</a>
                  &nbsp;&nbsp;
                  <a href="${origin}/api/approvals/${rejectToken}?action=reject" style="background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reject</a>
                </div>
              </div>
            `,
          })
        } catch (emailErr) {
          console.error("Failed to notify next approver:", emailErr)
        }
      } else {
        approvals.status = "approved"
        isFinal = true
      }
    }

    metadata.approvals = approvals
    await admin
      .from("responses")
      .update({ metadata })
      .eq("id", response.id)

    const isApprove = action === "approve"
    const color = isApprove ? "#10b981" : "#ef4444"
    const title = isApprove
      ? isFinal
        ? "Submission Fully Approved!"
        : `Stage ${payload.stage} Approved!`
      : "Submission Rejected"

    const message = isApprove
      ? isFinal
        ? `All approval stages are complete for "${form?.title || "Form"}".`
        : `Thank you. The submission has now advanced to Stage ${payload.stage + 1}.`
      : `You have rejected this submission.`

    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; padding: 40px 16px; margin: 0;">
          <div style="max-width: 500px; margin: 40px auto; background: white; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; padding: 32px; text-align: center;">
            <div style="width: 56px; height: 56px; border-radius: 50%; background: ${color}20; color: ${color}; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 28px; line-height: 56px;">
              ${isApprove ? "✓" : "✕"}
            </div>
            <h1 style="font-size: 22px; font-weight: 700; margin-bottom: 8px; color: #0f172a;">${title}</h1>
            <p style="color: #64748b; font-size: 15px; margin-bottom: 24px;">${message}</p>
            <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; font-size: 13px; color: #475569; text-align: left;">
              <div><strong>Form:</strong> ${form?.title || "Form"}</div>
              <div><strong>Response ID:</strong> ${response.id}</div>
              <div><strong>Reviewed by:</strong> ${payload.approverEmail}</div>
              <div><strong>Action:</strong> <span style="text-transform: capitalize; color: ${color}; font-weight: 600;">${action}</span></div>
            </div>
          </div>
        </body>
      </html>`,
      { status: 200, headers: { "Content-Type": "text/html" } }
    )
  } catch (err: any) {
    console.error("Approval action error:", err)
    return new Response(`Error: ${err?.message}`, { status: 500 })
  }
}
