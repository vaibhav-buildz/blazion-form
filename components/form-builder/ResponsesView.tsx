"use client"

import * as React from "react"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
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
import { Download, ArrowLeft, Inbox } from "lucide-react"

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

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={loading}
      className="h-8 gap-1.5 text-xs text-primary hover:text-primary"
    >
      <Download className="h-3.5 w-3.5" />
      {loading ? "Generating..." : "Download"}
    </Button>
  )
}

export function ResponsesView({ form, questions, responses }: ResponsesViewProps) {
  const handleExportCSV = () => {
    if (!responses || responses.length === 0) return

    const headers = [
      "Submitted At",
      ...questions.map(
        (q) => `"${(q.title || "Untitled Question").replace(/"/g, '""')}"`
      ),
    ]

    const rows = responses.map((resp) => {
      const dateStr = resp.submitted_at || resp.created_at
      const submittedAt = dateStr ? new Date(dateStr).toLocaleString() : "-"
      const answers = questions.map((q) => {

        const val = resp.answers?.[q.id]
        let formatted = ""
        if (Array.isArray(val)) {
          formatted = val.join(", ")
        } else if (val !== undefined && val !== null) {
          formatted = String(val)
        }
        return `"${formatted.replace(/"/g, '""')}"`
      })
      return [`"${submittedAt}"`, ...answers].join(",")
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
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground gap-1 mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">
              {form.title || "Untitled Form"}
            </h1>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {responses.length} {responses.length === 1 ? "Response" : "Responses"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={responses.length === 0}
            className="gap-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Main Tabs Container */}
      <Tabs defaultValue="table" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="table">Table View</TabsTrigger>
            <TabsTrigger value="summary">Summary View</TabsTrigger>
          </TabsList>
        </div>

        {/* TABLE VIEW */}
        <TabsContent value="table" className="space-y-4">
          {responses.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2 border-border bg-card">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
                <Inbox className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                No responses yet
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Share your form link to start collecting responses from users.
              </p>
            </Card>
          ) : (
            <Card className="border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-44 font-semibold">Submitted At</TableHead>
                    {questions.map((q) => (
                      <TableHead key={q.id} className="min-w-44 font-semibold">
                        {q.title || "Untitled Question"}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.map((resp) => (
                    <TableRow key={resp.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap" suppressHydrationWarning>
                        {resp.submitted_at || resp.created_at
                          ? new Date(resp.submitted_at || resp.created_at!).toLocaleString("en-US")
                          : "-"}
                      </TableCell>

                      {questions.map((q) => {
                        const val = resp.answers?.[q.id]
                        if (q.type === "file_upload") {
                          return (
                            <TableCell key={q.id} className="text-sm">
                              {val && typeof val === "string" ? (
                                <FileDownloadLink path={val} />
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          )
                        }

                        let display = "-"
                        if (Array.isArray(val)) {
                          display = val.length > 0 ? val.join(", ") : "-"
                        } else if (val !== undefined && val !== null && val !== "") {
                          display = String(val)
                        }
                        return (
                          <TableCell key={q.id} className="text-sm">
                            {display}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* SUMMARY VIEW */}
        <TabsContent value="summary" className="space-y-6">
          {responses.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2 border-border bg-card">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
                <Inbox className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                No responses yet
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Share your form link to start collecting responses from users.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {questions.map((q) => {
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
                    <Card key={q.id} className="p-6 border-border space-y-4">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">
                          {q.title || "Untitled Question"}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {options.length} options · {responses.length} responses
                        </p>
                      </div>

                      <div className="space-y-3">
                        {options.map((opt, idx) => {
                          const count = counts[opt] || 0
                          const pct =
                            baseDenominator > 0
                              ? Math.round((count / baseDenominator) * 100)
                              : 0

                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-medium text-foreground">
                                  {opt}
                                </span>
                                <span className="text-muted-foreground font-mono">
                                  {count} ({pct}%)
                                </span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full bg-primary transition-all duration-300"
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
                    <Card key={q.id} className="p-6 border-border space-y-4">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">
                          {q.title || "Untitled Question"}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {fileResponses.length} file uploads
                        </p>
                      </div>

                      {fileResponses.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">
                          No files uploaded.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {fileResponses.map((filePath, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2.5 rounded-md bg-muted/40 border border-border text-xs text-foreground"
                            >
                              <span className="truncate max-w-[200px]">
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

                // Text Questions Summary
                const textResponses = responses
                  .map((r) => r.answers?.[q.id])
                  .filter((v) => v !== undefined && v !== null && v !== "")

                return (
                  <Card key={q.id} className="p-6 border-border space-y-4">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">
                        {q.title || "Untitled Question"}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {textResponses.length} text responses
                      </p>
                    </div>

                    {textResponses.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">
                        No text answers submitted.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {textResponses.map((text, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-md bg-muted/40 border border-border text-xs text-foreground"
                          >
                            {String(text)}
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
