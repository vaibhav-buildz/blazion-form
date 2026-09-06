"use client"

import React, { useState } from "react"
import { Sparkles, AlertTriangle, CheckCircle, AlertCircle, ArrowRight, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FormAuditResult } from "@/lib/ai"

interface FormAuditorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formTitle: string
  formDescription: string
  questions: any[]
  onSelectQuestion?: (questionId: string) => void
}

export function FormAuditorModal({
  open,
  onOpenChange,
  formTitle,
  formDescription,
  questions,
  onSelectQuestion,
}: FormAuditorModalProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<FormAuditResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runAudit = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/ai/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formTitle,
          formDescription,
          questions: questions.map((q) => ({
            id: q.id,
            title: q.title,
            type: q.type,
            required: q.required,
            options: q.options,
          })),
        }),
      })
      if (!res.ok) {
        throw new Error("Audit service failed to respond")
      }
      const data = await res.json()
      setResult(data)
    } catch (err: any) {
      setError(err?.message || "Failed to audit form.")
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (open && !result && !loading) {
      runAudit()
    }
  }, [open])

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 dark:text-emerald-400 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40"
    if (score >= 60) return "text-amber-600 dark:text-amber-400 border-amber-200 bg-amber-50 dark:bg-amber-950/40"
    return "text-red-600 dark:text-red-400 border-red-200 bg-red-50 dark:bg-red-950/40"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <DialogTitle className="text-xl font-bold">AI Form Auditor</DialogTitle>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Gemini is reviewing your questions for clarity, fatigue, and conversion...
            </p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-sm space-y-2">
            <p className="font-semibold">{error}</p>
            <button
              onClick={runAudit}
              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
            >
              Retry Audit
            </button>
          </div>
        ) : result ? (
          <div className="space-y-6 pt-2">
            {/* Score header */}
            <div className="flex items-center justify-between p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-xs uppercase font-bold tracking-wider text-slate-500">
                  Form Health Score
                </div>
                <div className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">
                  {result.summary}
                </div>
              </div>
              <div
                className={`text-2xl font-black px-4 py-2 rounded-xl border ${getScoreColor(
                  result.overallScore
                )}`}
              >
                {result.overallScore}/100
              </div>
            </div>

            {/* Suggestions list */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Actionable Recommendations ({result.suggestions?.length || 0})
              </h3>

              {(!result.suggestions || result.suggestions.length === 0) ? (
                <div className="flex items-center gap-2 p-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-sm">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  Your form is in great shape! No major issues detected.
                </div>
              ) : (
                result.suggestions.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {item.severity === "high" ? (
                          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                        ) : item.severity === "medium" ? (
                          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />
                        )}
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                          {item.type.replace("_", " ")}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          item.severity === "high"
                            ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                            : item.severity === "medium"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        }`}
                      >
                        {item.severity}
                      </span>
                    </div>

                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {item.message}
                    </p>

                    {item.questionId && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (item.questionId && onSelectQuestion) {
                              onSelectQuestion(item.questionId)
                              onOpenChange(false)
                            }
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          Go to question {item.questionTitle ? `("${item.questionTitle}")` : ""}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={runAudit}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Re-run Audit
              </button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
