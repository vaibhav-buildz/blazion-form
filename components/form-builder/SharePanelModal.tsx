"use client"

import React, { useState, useRef } from "react"
import { Copy, Check, QrCode, Code2, Download, Share2, ExternalLink, FileSpreadsheet } from "lucide-react"
import { QRCodeCanvas } from "qrcode.react"
import Papa from "papaparse"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ContactRow {
  name?: string
  phone?: string
  email?: string
  [key: string]: any
}

interface SharePanelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formTitle: string
  formSlug: string
  formId?: string
}

export function SharePanelModal({
  open,
  onOpenChange,
  formTitle,
  formSlug,
  formId,
}: SharePanelModalProps) {
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedEmbed, setCopiedEmbed] = useState(false)
  const [contacts, setContacts] = useState<ContactRow[]>([])
  const [csvError, setCsvError] = useState<string | null>(null)
  const qrRef = useRef<HTMLDivElement | null>(null)

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvError(null)

    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors && results.errors.length > 0) {
          setCsvError("Error parsing CSV: " + results.errors[0].message)
          return
        }
        const parsed: ContactRow[] = (results.data || []).map((row: any) => {
          const keys = Object.keys(row)
          const nameKey = keys.find((k) => /name|full_name|fullname/i.test(k))
          const phoneKey = keys.find((k) => /phone|mobile|contact|tel/i.test(k))
          const emailKey = keys.find((k) => /email|mail/i.test(k))

          return {
            name: nameKey ? row[nameKey] : row.name || "",
            phone: phoneKey ? row[phoneKey] : row.phone || "",
            email: emailKey ? row[emailKey] : row.email || "",
          }
        })

        if (parsed.length === 0) {
          setCsvError("No valid contact rows found in the CSV file.")
          return
        }

        setContacts(parsed)
        try {
          const storageKey = formId ? `blazion_contacts_${formId}` : "blazion_contacts_latest"
          localStorage.setItem(storageKey, JSON.stringify(parsed))
        } catch {}
      },
      error: (err) => {
        setCsvError("Failed to read CSV: " + err.message)
      },
    })
  }

  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const publicUrl = `${origin}/f/${formSlug}`
  const embedCode = `<iframe src="${publicUrl}" width="100%" height="750px" frameborder="0" marginheight="0" marginwidth="0" style="border:0;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.08);">Loading form…</iframe>`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedCode)
    setCopiedEmbed(true)
    setTimeout(() => setCopiedEmbed(false), 2000)
  }

  const handleDownloadQR = () => {
    if (!qrRef.current) return
    const canvas = qrRef.current.querySelector("canvas")
    if (canvas) {
      const pngUrl = canvas.toDataURL("image/png")
      const downloadLink = document.createElement("a")
      downloadLink.href = pngUrl
      downloadLink.download = `${formSlug}-qr-code.png`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Share2 className="w-5 h-5" />
            </div>
            <DialogTitle className="text-xl font-bold">Share Form</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-3">
          {/* 1. Direct Public Link */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Direct Public Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="flex-1 px-3 py-2 text-sm rounded-xl border border-border bg-card text-foreground select-all focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition shadow-xs"
              >
                {copiedLink ? <Check className="w-4 h-4 text-primary-foreground" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? "Copied!" : "Copy"}</span>
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* 2. QR Code (qrcode.react) */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Scan QR Code
                </span>
              </div>
              <button
                type="button"
                onClick={handleDownloadQR}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-border text-foreground hover:bg-muted transition"
              >
                <Download className="w-3.5 h-3.5" /> Download PNG
              </button>
            </div>

            <div ref={qrRef} className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-xl">
              <QRCodeCanvas
                value={publicUrl}
                size={180}
                level="H"
                includeMargin={true}
              />
              <p className="text-[11px] text-muted-foreground mt-2">
                Scan with any smartphone camera to open form
              </p>
            </div>
          </div>

          {/* 3. iFrame Embed Generator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-muted-foreground" /> Embed iFrame in Website
              </label>
              <button
                type="button"
                onClick={handleCopyEmbed}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                {copiedEmbed ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedEmbed ? "Copied Embed Snippet!" : "Copy Code"}</span>
              </button>
            </div>

            <div className="relative">
              <textarea
                readOnly
                rows={3}
                value={embedCode}
                className="w-full p-3 font-mono text-xs rounded-xl border border-border bg-card text-foreground focus:outline-hidden"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Paste this HTML snippet into WordPress, Webflow, Shopify, or any HTML page.
            </p>
          </div>

          {/* 4. CSV Bulk Contact Upload (Item 14) */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-primary" />
                Bulk Contact Broadcast (CSV)
              </label>
              <span className="text-[11px] text-muted-foreground">
                {contacts.length > 0 ? `${contacts.length} contacts loaded` : "Upload contact list"}
              </span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Upload a CSV file containing <code className="text-foreground font-mono">name</code>, <code className="text-foreground font-mono">phone</code>, and <code className="text-foreground font-mono">email</code> columns to broadcast this form to your audience.
            </p>

            <div className="flex flex-col gap-2">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvUpload}
                className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
              />
              {csvError && <p className="text-xs text-destructive font-medium">{csvError}</p>}
            </div>

            {contacts.length > 0 && (
              <div className="space-y-2 mt-2">
                <div className="max-h-40 overflow-y-auto border border-border rounded-xl text-xs">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase">
                      <tr>
                        <th className="py-2 px-3 text-left">#</th>
                        <th className="py-2 px-3 text-left">Name</th>
                        <th className="py-2 px-3 text-left">Phone</th>
                        <th className="py-2 px-3 text-left">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                      {contacts.slice(0, 10).map((c, i) => (
                        <tr key={i} className="hover:bg-muted/20">
                          <td className="py-1.5 px-3 text-muted-foreground font-mono">{i + 1}</td>
                          <td className="py-1.5 px-3 font-medium text-foreground">{c.name || "—"}</td>
                          <td className="py-1.5 px-3 text-foreground font-mono">{c.phone || "—"}</td>
                          <td className="py-1.5 px-3 text-muted-foreground">{c.email || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {contacts.length > 10 && (
                  <p className="text-[11px] text-muted-foreground italic">
                    Showing first 10 of {contacts.length} parsed contacts.
                  </p>
                )}

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/20 p-3 rounded-xl border border-border">
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <span className="font-semibold text-foreground block">SMS / WhatsApp Gateway</span>
                    <span>Direct sending requires MSG91 API configuration.</span>
                  </div>

                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-muted text-muted-foreground text-xs font-bold cursor-not-allowed opacity-75 border border-border shrink-0"
                    title="External SMS/WhatsApp integration is pending future MSG91 API key setup"
                  >
                    <span>Send Broadcast</span>
                    <span className="bg-secondary text-secondary-foreground border border-border text-[10px] px-2 py-0.5 rounded-full font-semibold">
                      Coming soon (MSG91)
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
