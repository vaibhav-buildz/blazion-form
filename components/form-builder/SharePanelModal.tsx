"use client"

import React, { useState, useRef } from "react"
import { Copy, Check, QrCode, Code2, Download, Share2, ExternalLink } from "lucide-react"
import { QRCodeCanvas } from "qrcode.react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface SharePanelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formTitle: string
  formSlug: string
  formId: string
}

export function SharePanelModal({
  open,
  onOpenChange,
  formTitle,
  formSlug,
}: SharePanelModalProps) {
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedEmbed, setCopiedEmbed] = useState(false)
  const qrRef = useRef<HTMLDivElement | null>(null)

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
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Share2 className="w-5 h-5" />
            </div>
            <DialogTitle className="text-xl font-bold">Share Form</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-3">
          {/* 1. Direct Public Link */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Direct Public Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 select-all focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? "Copied!" : "Copy"}</span>
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* 2. QR Code (qrcode.react) */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Scan QR Code
                </span>
              </div>
              <button
                type="button"
                onClick={handleDownloadQR}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <Download className="w-3.5 h-3.5" /> Download PNG
              </button>
            </div>

            <div ref={qrRef} className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 rounded-xl">
              <QRCodeCanvas
                value={publicUrl}
                size={180}
                level="H"
                includeMargin={true}
              />
              <p className="text-[11px] text-slate-400 mt-2">
                Scan with any smartphone camera to open form
              </p>
            </div>
          </div>

          {/* 3. iFrame Embed Generator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-slate-600 dark:text-slate-400" /> Embed iFrame in Website
              </label>
              <button
                type="button"
                onClick={handleCopyEmbed}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {copiedEmbed ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedEmbed ? "Copied Embed Snippet!" : "Copy Code"}</span>
              </button>
            </div>

            <div className="relative">
              <textarea
                readOnly
                rows={3}
                value={embedCode}
                className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-hidden"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Paste this HTML snippet into WordPress, Webflow, Shopify, or any HTML page.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
