"use client"

import * as React from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Award,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Mail,
} from "lucide-react"

interface SubmissionItem {
  id: string
  formId: string
  formTitle: string
  formSlug: string
  createdAt: string
  status: "pending" | "approved" | "rejected" | "submitted"
  certificateUrl: string | null
  personaReport: string | null
  answersCount: number
}

export default function RespondentPortalPage() {
  const [email, setEmail] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [hasSearched, setHasSearched] = React.useState(false)
  const [submissions, setSubmissions] = React.useState<SubmissionItem[]>([])
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [selectedPersonaReport, setSelectedPersonaReport] = React.useState<{
    title: string
    report: string
  } | null>(null)

  // Auto-fill logged in user email if available
  React.useEffect(() => {
    async function checkUser() {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user?.email) {
          setEmail(user.email)
          fetchSubmissions(user.email)
        }
      } catch {}
    }
    checkUser()
  }, [])

  const fetchSubmissions = async (lookupEmail: string) => {
    if (!lookupEmail.trim()) {
      setErrorMessage("Please enter an email address.")
      return
    }
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const res = await fetch(
        `/api/portal/submissions?email=${encodeURIComponent(lookupEmail.trim())}`
      )
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to find submissions")
      }
      setSubmissions(data.submissions || [])
      setHasSearched(true)
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchSubmissions(email)
  }

  // Format date in Indian format: DD-MM-YYYY
  const formatIndianDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      const day = String(d.getDate()).padStart(2, "0")
      const month = String(d.getMonth() + 1).padStart(2, "0")
      const year = d.getFullYear()
      const hours = String(d.getHours()).padStart(2, "0")
      const minutes = String(d.getMinutes()).padStart(2, "0")
      return `${day}-${month}-${year} at ${hours}:${minutes}`
    } catch {
      return dateStr
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </span>
        )
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        )
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" /> Under Review
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Submitted
          </span>
        )
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-md shadow-primary/20">
                ⚡
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Respondent Portal</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Track your form submissions, approval workflows, and download completion certificates.
            </p>
          </div>
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors self-start sm:self-auto"
          >
            Back to Blazion Forms <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Email Lookup Card */}
        <Card className="p-6 border-border shadow-sm space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">Track by Email</h2>
            <p className="text-xs text-muted-foreground">
              Enter the email address you used when submitting the form to find all your records.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 text-sm"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Looking up...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" /> Find My Submissions
                </>
              )}
            </Button>
          </form>

          {errorMessage && (
            <p className="text-xs text-destructive font-medium">{errorMessage}</p>
          )}
        </Card>

        {/* Submissions List */}
        {hasSearched && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Your Submissions ({submissions.length})
              </h3>
            </div>

            {submissions.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-border space-y-3">
                <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                <h4 className="text-base font-semibold">No submissions found</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  We couldn't find any recorded submissions for <strong>{email}</strong>. Check for any typos or submit using an email verification field.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {submissions.map((sub) => (
                  <Card
                    key={sub.id}
                    className="p-5 border-border shadow-xs hover:shadow-md transition-shadow space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                      <div>
                        <h4 className="font-semibold text-base">{sub.formTitle}</h4>
                        <p className="text-xs text-muted-foreground">
                          Submitted on {formatIndianDate(sub.createdAt)} • {sub.answersCount} fields filled
                        </p>
                      </div>
                      <div>{getStatusBadge(sub.status)}</div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      {sub.certificateUrl && (
                        <a
                          href={sub.certificateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
                        >
                          <Award className="w-3.5 h-3.5" /> Download Certificate
                        </a>
                      )}

                      {sub.personaReport && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setSelectedPersonaReport({
                              title: sub.formTitle,
                              report: sub.personaReport!,
                            })
                          }
                          className="text-xs gap-1.5 text-primary border-primary/20 hover:bg-primary/10"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-primary" /> View AI Persona Insights
                        </Button>
                      )}

                      {sub.formSlug && (
                        <Link
                          href={`/f/${sub.formSlug}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground ml-auto transition-colors"
                        >
                          View Form <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI Persona Report Modal */}
        {selectedPersonaReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <Card className="max-w-lg w-full p-6 border-border shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="w-5 h-5" />
                  <h3 className="font-bold text-base">AI Persona Feedback</h3>
                </div>
                <button
                  onClick={() => setSelectedPersonaReport(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕ Close
                </button>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase">
                  {selectedPersonaReport.title}
                </div>
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 text-xs text-foreground leading-relaxed whitespace-pre-line max-h-80 overflow-y-auto font-sans">
                  {selectedPersonaReport.report}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPersonaReport(null)}
                >
                  Close
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
