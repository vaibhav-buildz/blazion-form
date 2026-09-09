import { jsPDF } from "jspdf"
import { formatDateDDMMYYYY } from "./utils"

export interface CertificateData {
  formTitle: string
  respondentName?: string
  respondentEmail?: string
  submissionDate?: string | Date
  responseId: string
  templateText?: string
}

export function generateCertificatePdf(data: CertificateData): jsPDF {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  })

  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()

  // Background tint & ornate borders
  doc.setFillColor(253, 252, 248)
  doc.rect(0, 0, width, height, "F")

  // Outer Border
  doc.setDrawColor(20, 83, 45) // Forest Green
  doc.setLineWidth(3)
  doc.rect(10, 10, width - 20, height - 20)

  // Inner Gold Border
  doc.setDrawColor(202, 138, 4) // Amber / Gold
  doc.setLineWidth(1)
  doc.rect(14, 14, width - 28, height - 28)

  // Certificate Header
  doc.setFont("helvetica", "bold")
  doc.setFontSize(28)
  doc.setTextColor(15, 23, 42) // Slate 900
  doc.text("CERTIFICATE OF COMPLETION", width / 2, 40, { align: "center" })

  doc.setFont("helvetica", "italic")
  doc.setFontSize(14)
  doc.setTextColor(100, 116, 139)
  doc.text("This is proudly presented to", width / 2, 54, { align: "center" })

  // Recipient Name
  const recipient = data.respondentName || data.respondentEmail || "Participant"
  doc.setFont("helvetica", "bold")
  doc.setFontSize(26)
  doc.setTextColor(180, 83, 9) // Amber 700
  doc.text(recipient.toUpperCase(), width / 2, 75, { align: "center" })

  // Underline for name
  doc.setDrawColor(217, 119, 6)
  doc.setLineWidth(0.8)
  const nameWidth = doc.getTextWidth(recipient.toUpperCase())
  doc.line((width - nameWidth) / 2 - 5, 78, (width + nameWidth) / 2 + 5, 78)

  // Description / Reason
  doc.setFont("helvetica", "normal")
  doc.setFontSize(13)
  doc.setTextColor(51, 65, 85)

  let bodyText = data.templateText
    ? data.templateText
        .replace(/\{\{respondent_name\}\}/gi, recipient)
        .replace(/\{\{respondent_email\}\}/gi, data.respondentEmail || "")
        .replace(/\{\{form_title\}\}/gi, data.formTitle)
        .replace(/\{\{completion_date\}\}/gi, formatDateDDMMYYYY(data.submissionDate || new Date()))
        .replace(/\{\{response_id\}\}/gi, data.responseId)
    : `For successfully completing and submitting responses for "${data.formTitle}".`

  const splitBody = doc.splitTextToSize(bodyText, width - 60)
  doc.text(splitBody, width / 2, 95, { align: "center" })

  // Signatures & Metadata Footer
  const dateFormatted = formatDateDDMMYYYY(data.submissionDate || new Date())

  doc.setFontSize(10)
  doc.setTextColor(71, 85, 105)

  // Date on left
  doc.text(`Date Issued: ${dateFormatted}`, 30, height - 35)
  doc.line(30, height - 40, 75, height - 40)
  doc.text("Date of Verification", 30, height - 42)

  // Verification Seal in center
  doc.setDrawColor(202, 138, 4)
  doc.setFillColor(254, 243, 199)
  doc.circle(width / 2, height - 38, 12, "FD")
  doc.setFontSize(8)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(180, 83, 9)
  doc.text("OFFICIAL", width / 2, height - 40, { align: "center" })
  doc.text("VERIFIED", width / 2, height - 35, { align: "center" })

  // Authorized Issuer on right
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(71, 85, 105)
  doc.text("Authorized Signatory", width - 75, height - 35)
  doc.line(width - 75, height - 40, width - 30, height - 40)
  doc.text("FormSetu Verified Issuer", width - 75, height - 42)

  // Certificate ID Footer
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text(`Credential ID: ${data.responseId.slice(0, 16)}`, width / 2, height - 16, {
    align: "center",
  })

  return doc
}
