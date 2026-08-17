export interface AnswerSummaryPair {
  question: string
  answer: string
}

export interface NotificationEmailProps {
  formTitle: string
  submittedAt: string
  answersSummary: AnswerSummaryPair[]
  responseUrl: string
}

function escapeHtml(str: string): string {
  if (!str) return ""
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export function generateNotificationEmail({
  formTitle,
  submittedAt,
  answersSummary,
  responseUrl,
}: NotificationEmailProps): string {
  const first5 = (answersSummary || []).slice(0, 5)

  const answersHtml =
    first5.length > 0
      ? first5
          .map((pair) => {
            const rawAnswer = pair.answer ?? ""
            const truncatedAnswer =
              rawAnswer.length > 100
                ? rawAnswer.slice(0, 100) + "..."
                : rawAnswer

            return `
              <div style="margin-bottom: 12px; padding: 12px 16px; background-color: #f8f9fa; border-radius: 6px; border-left: 3px solid #4A5D23;">
                <div style="font-weight: 600; color: #2d3748; font-size: 14px; margin-bottom: 4px;">${escapeHtml(
                  pair.question
                )}</div>
                <div style="color: #4a5568; font-size: 14px; white-space: pre-wrap; word-break: break-word;">${escapeHtml(
                  truncatedAnswer
                )}</div>
              </div>
            `
          })
          .join("")
      : `<p style="color: #718096; font-style: italic; font-size: 14px;">No answers provided.</p>`

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New response to ${escapeHtml(formTitle)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 24px; color: #2d3748; line-height: 1.5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center">
        <div style="max-width: 600px; width: 100%; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); text-align: left;">
          <div style="background-color: #4A5D23; padding: 24px 32px;">
            <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.5px;">Blazion Form</h1>
          </div>
          <div style="padding: 32px;">
            <h2 style="margin-top: 0; margin-bottom: 8px; color: #1a202c; font-size: 18px; font-weight: 600;">
              New response to "${escapeHtml(formTitle)}"
            </h2>
            <p style="color: #718096; font-size: 13px; margin-top: 0; margin-bottom: 24px;">
              Submitted on ${escapeHtml(submittedAt)}
            </p>
            
            <div style="margin-bottom: 28px;">
              ${answersHtml}
            </div>

            <div style="text-align: center; margin-top: 32px; margin-bottom: 12px;">
              <a href="${escapeHtml(
                responseUrl
              )}" target="_blank" style="background-color: #4A5D23; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(74, 93, 35, 0.2);">
                View all responses
              </a>
            </div>
          </div>
          <div style="background-color: #f8f9fa; padding: 16px 32px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #edf2f7;">
            Sent via Blazion Form &bull; Notification Email
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
