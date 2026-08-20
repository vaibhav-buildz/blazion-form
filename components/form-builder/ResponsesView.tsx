"use client"

import * as React from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  Download,
  ChevronLeft,
  Inbox,
  FileText,
  Table as TableIcon,
  BarChart3,
  MessageSquare,
} from "lucide-react"

interface Question {
  id: string
  title: string
  type: string
  options?: string[]
  position: number
}

interface FormResponse {
  id: string
  answers: Record<string, any>
  respondent_email?: string | null
  verification_method?: "login" | "otp" | string | null
  submitted_at?: string
  created_at?: string
}

interface ResponsesViewProps {
  form: {
    id: string
    title: string
    slug: string
    status: string
    created_at: string
  }
  questions: Question[]
  responses: FormResponse[]
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "-"
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return "-"
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function getTypeLabel(type: string): string {
  const map: Record<string, string> = {
    short_text: "Short Text",
    long_text: "Long Text",
    multiple_choice: "Multiple Choice",
    checkbox: "Checkbox",
    dropdown: "Dropdown",
    file_upload: "File Upload",
    section_break: "Section Break",
  }
  return map[type] || type
}

function FileDownloadLink({ path }: { path: string }) {
  const [loading, setLoading] = React.useState(false)

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!path || loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/files/signed-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      })
      const data = await res.json()
      if (res.ok && data.signedUrl) {
        window.open(data.signedUrl, "_blank", "noopener,noreferrer")
      } else {
        alert(data.error || "Failed to generate download link")
      }
    } catch (err: any) {
      console.error("Error fetching signed URL:", err)
      alert("Error generating download link")
    } finally {
      setLoading(false)
    }
  }

  const fileName = path.split("/").pop()?.replace(/^\d+-/, "") || "File"

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={loading}
      className="h-8 px-2.5 gap-1.5 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10 border-primary/20 shrink-0"
      title={fileName}
    >
      <FileText className="h-3.5 w-3.5" />
      <span className="max-w-[120px] truncate">{loading ? "Loading..." : fileName}</span>
      <Download className="h-3 w-3 ml-0.5 opacity-70" />
    </Button>
  )
}

export function ResponsesView({ form, questions, responses }: ResponsesViewProps) {
  const printableQuestions = React.useMemo(
    () => questions.filter((q) => q.type !== "section_break"),
    [questions]
  )

  const hasRespondentEmail = React.useMemo(() => {
    return responses.some((r) => Boolean(r.respondent_email))
  }, [responses])

  const hasVerificationMethod = React.useMemo(() => {
    return responses.some((r) => Boolean(r.verification_method))
  }, [responses])

  const handleExportCSV = () => {
    if (!responses || responses.length === 0) return

    const headers = [
      "Submitted At",
      ...(hasRespondentEmail ? ["Respondent Email"] : []),
      ...(hasVerificationMethod ? ["Verification Method"] : []),
      ...printableQuestions.map(
        (q) => `"${(q.title || "Untitled Question").replace(/"/g, '""')}"`
      ),
    ]

    const rows = responses.map((resp) => {
      const dateStr = resp.submitted_at || resp.created_at
      const submittedAt = dateStr ? new Date(dateStr).toLocaleString() : "-"
      const emailCol = hasRespondentEmail
        ? [`"${(resp.respondent_email || "").replace(/"/g, '""')}"`]
        : []
      const verifCol = hasVerificationMethod
        ? [`"${(resp.verification_method || "").replace(/"/g, '""')}"`]
        : []
      const answers = printableQuestions.map((q) => {
        const val = resp.answers?.[q.id]
        let formatted = ""
        if (Array.isArray(val)) {
          formatted = val.join(", ")
        } else if (val !== undefined && val !== null) {
          formatted = String(val)
        }
        return `"${formatted.replace(/"/g, '""')}"`
      })
      return [`"${submittedAt}"`, ...emailCol, ...verifCol, ...answers].join(",")
    })

    const csvContent = [headers.join(","), ...rows].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `${form.title || "Form"}_Responses.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background p-8 space-y-6 max-w-6xl mx-auto">
      {/* Top Header Section */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="mb-4 -ml-2 text-muted-foreground hover:text-foreground gap-1.5 font-medium"
        >
          <Link href="/dashboard">
            <ChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {form.title || "Untitled Form"}
            </h1>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary border border-primary/20">
              {responses.length} {responses.length === 1 ? "Response" : "Responses"}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={responses.length === 0}
            className="gap-1.5 text-xs font-semibold shrink-0"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="table" className="space-y-6">
        <div className="inline-flex bg-muted/40 p-1.5 rounded-xl border border-border/50">
          <TabsList className="bg-transparent p-0 gap-1 h-auto">
            <TabsTrigger
              value="table"
              className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium transition-all text-muted-foreground hover:text-foreground gap-2"
            >
              <TableIcon className="h-4 w-4" />
              Table View
            </TabsTrigger>
            <TabsTrigger
              value="summary"
              className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium transition-all text-muted-foreground hover:text-foreground gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Summary View
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TABLE VIEW */}
        <TabsContent value="table" className="space-y-4">
          {responses.length === 0 ? (
            <Card className="border-2 border-dashed border-border rounded-2xl p-16 text-center bg-card shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 text-muted-foreground mb-4">
                <Inbox className="h-8 w-8 text-muted-foreground/60" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-1">
                No responses yet
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Share your form link to start collecting responses from users.
              </p>
            </Card>
          ) : (
            <Card className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
              <div className="overflow-x-auto w-full">
                <Table className="min-w-full">
                  <TableHeader className="bg-muted/50 backdrop-blur-sm sticky top-0 border-b border-border z-10">
                    <TableRow className="hover:bg-transparent border-border">
                      <TableHead className="w-48 min-w-[180px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground py-3.5 px-4">
                        Submitted At
                      </TableHead>
                      {hasRespondentEmail && (
                        <TableHead className="w-56 min-w-[200px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground py-3.5 px-4">
                          Respondent Email
                        </TableHead>
                      )}
                      {printableQuestions.map((q) => (
                        <TableHead
                          key={q.id}
                          className="min-w-[200px] max-w-[320px] font-semibold text-[11px] uppercase tracking-wider text-muted-foreground py-3.5 px-4 last:pr-6"
                        >
                          {q.title || "Untitled Question"}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {responses.map((resp) => (
                      <TableRow
                        key={resp.id}
                        className="even:bg-muted/20 hover:bg-muted/40 transition-colors border-border"
                      >
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap py-3.5 px-4 font-mono align-top">
                          {formatDate(resp.submitted_at || resp.created_at)}
                        </TableCell>
                        {hasRespondentEmail && (
                          <TableCell className="text-xs text-foreground whitespace-nowrap py-3.5 px-4 font-mono align-top">
                            {resp.respondent_email ? (
                              <div className="flex flex-col gap-1 items-start">
                                <span>{resp.respondent_email}</span>
                                {resp.verification_method === "login" && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400 border border-blue-500/20 font-sans">
                                    Login-verified
                                  </span>
                                )}
                                {resp.verification_method === "otp" && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-sans">
                                    OTP-verified
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground/60 italic">—</span>
                            )}
                          </TableCell>
                        )}

                        {printableQuestions.map((q) => {
                          const val = resp.answers?.[q.id]

                          if (q.type === "file_upload") {
                            return (
                              <TableCell key={q.id} className="min-w-[200px] max-w-[320px] py-3.5 px-4 text-sm align-top last:pr-6">
                                {val && typeof val === "string" && val.trim() ? (
                                  <FileDownloadLink path={val} />
                                ) : (
                                  <span className="text-xs text-muted-foreground/60 italic">—</span>
                                )}
                              </TableCell>
                            )
                          }

                          if (Array.isArray(val)) {
                            if (val.length === 0) {
                              return (
                                <TableCell key={q.id} className="min-w-[200px] max-w-[320px] py-3.5 px-4 text-sm align-top last:pr-6">
                                  <span className="text-xs text-muted-foreground/60 italic">—</span>
                                </TableCell>
                              )
                            }
                            return (
                              <TableCell key={q.id} className="min-w-[200px] max-w-[320px] py-3.5 px-4 text-sm align-top last:pr-6">
                                <div className="flex flex-wrap items-center gap-1.5 max-w-[280px]">
                                  {val.map((item, i) => (
                                    <span
                                      key={i}
                                      className="inline-flex items-center whitespace-normal break-words rounded-md bg-secondary text-secondary-foreground px-2 py-0.5 text-xs font-medium border border-border/50"
                                    >
                                      {String(item)}
                                    </span>
                                  ))}
                                </div>
                              </TableCell>
                            )
                          }

                          const displayStr =
                            val !== undefined && val !== null && val !== ""
                              ? String(val)
                              : ""
                          return (
                            <TableCell key={q.id} className="min-w-[200px] max-w-[320px] py-3.5 px-4 text-sm align-top last:pr-6">
                              {displayStr ? (
                                <span
                                  className="block max-w-[280px] break-words text-foreground text-sm"
                                  title={displayStr}
                                >
                                  {displayStr}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground/60 italic">—</span>
                              )}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* SUMMARY VIEW */}
        <TabsContent value="summary" className="space-y-4">
          {responses.length === 0 ? (
            <Card className="border-2 border-dashed border-border rounded-2xl p-16 text-center bg-card shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 text-muted-foreground mb-4">
                <Inbox className="h-8 w-8 text-muted-foreground/60" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-1">
                No responses yet
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Share your form link to start collecting responses from users.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {printableQuestions.map((q) => {
                const isOptionType = [
                  "multiple_choice",
                  "checkbox",
                  "dropdown",
                ].includes(q.type)

                if (isOptionType) {
                  const counts: Record<string, number> = {}
                  const options = q.options || []
                  options.forEach((opt) => (counts[opt] = 0))

                  let totalAnswersCount = 0
                  responses.forEach((resp) => {
                    const val = resp.answers?.[q.id]
                    if (Array.isArray(val)) {
                      val.forEach((opt) => {
                        counts[opt] = (counts[opt] || 0) + 1
                        totalAnswersCount++
                      })
                    } else if (val) {
                      counts[val] = (counts[val] || 0) + 1
                      totalAnswersCount++
                    }
                  })

                  const baseDenominator =
                    q.type === "checkbox" ? responses.length : totalAnswersCount

                  return (
                    <Card
                      key={q.id}
                      className="p-6 border border-border rounded-xl bg-card shadow-sm space-y-5"
                    >
                      <div className="flex items-center justify-between gap-4 pb-2 border-b border-border/40">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <h3 className="text-lg font-semibold text-foreground">
                              {q.title || "Untitled Question"}
                            </h3>
                            <span className="bg-muted text-muted-foreground text-[11px] font-medium px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-border/50">
                              {getTypeLabel(q.type)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {options.length} options · {responses.length} total responses
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 pt-1">
                        {options.map((opt, idx) => {
                          const count = counts[opt] || 0
                          const pct =
                            baseDenominator > 0
                              ? Math.round((count / baseDenominator) * 100)
                              : 0

                          return (
                            <div key={idx} className="space-y-1.5">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-foreground">{opt}</span>
                                <span className="font-semibold text-xs text-primary">
                                  {count} ({pct}%)
                                </span>
                              </div>
                              <div className="h-2.5 w-full rounded-full bg-primary/10 overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </Card>
                  )
                }

                if (q.type === "file_upload") {
                  const fileResponses = responses
                    .map((r) => r.answers?.[q.id])
                    .filter((v) => typeof v === "string" && v.trim() !== "")

                  return (
                    <Card
                      key={q.id}
                      className="p-6 border border-border rounded-xl bg-card shadow-sm space-y-5"
                    >
                      <div className="flex items-center justify-between gap-4 pb-2 border-b border-border/40">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <h3 className="text-lg font-semibold text-foreground">
                              {q.title || "Untitled Question"}
                            </h3>
                            <span className="bg-muted text-muted-foreground text-[11px] font-medium px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-border/50">
                              {getTypeLabel(q.type)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {fileResponses.length} {fileResponses.length === 1 ? "file" : "files"} uploaded
                          </p>
                        </div>
                      </div>

                      {fileResponses.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-2">
                          No files uploaded.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                          {fileResponses.map((filePath, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border text-xs text-foreground"
                            >
                              <span
                                className="truncate max-w-[180px] font-medium"
                                title={filePath.split("/").pop()?.replace(/^\d+-/, "")}
                              >
                                {filePath.split("/").pop()?.replace(/^\d+-/, "") || "Uploaded file"}
                              </span>
                              <FileDownloadLink path={filePath} />
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  )
                }

                // Text Questions (short_text / long_text)
                const textResponses = responses
                  .map((r) => r.answers?.[q.id])
                  .filter((v) => v !== undefined && v !== null && String(v).trim() !== "")

                return (
                  <Card
                    key={q.id}
                    className="p-6 border border-border rounded-xl bg-card shadow-sm space-y-5"
                  >
                    <div className="flex items-center justify-between gap-4 pb-2 border-b border-border/40">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-lg font-semibold text-foreground">
                            {q.title || "Untitled Question"}
                          </h3>
                          <span className="bg-muted text-muted-foreground text-[11px] font-medium px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-border/50">
                            {getTypeLabel(q.type)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground/70 inline" />
                          {textResponses.length} {textResponses.length === 1 ? "response" : "responses"}
                        </p>
                      </div>
                    </div>

                    {textResponses.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-2">
                        No text answers submitted.
                      </p>
                    ) : (
                      <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                        {textResponses.map((text, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-lg bg-muted/30 border border-border/60 border-l-4 border-l-primary/60 text-sm text-foreground leading-relaxed italic"
                          >
                            &ldquo;{String(text)}&rdquo;
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
