"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { nanoid } from "nanoid"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { QuestionCard, type Question } from "./QuestionCard"
import { QuestionSettings } from "./QuestionSettings"
import { Copy, Check, Clock, Settings } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { FormSettingsDialog } from "./FormSettingsDialog"

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"


interface FormBuilderProps {
  form: {
    id: string
    title: string
    slug: string
    status: string
    settings?: Record<string, any>
    [key: string]: any
  }
  initialQuestions?: any[]
}

const QUESTION_TYPES = [
  { id: "short_text", label: "Short Text" },
  { id: "long_text", label: "Long Text" },
  { id: "multiple_choice", label: "Multiple Choice" },
  { id: "checkbox", label: "Checkbox" },
  { id: "dropdown", label: "Dropdown" },
]

export function FormBuilder({ form: initialForm, initialQuestions = [] }: FormBuilderProps) {
  const router = useRouter()
  const [form, setForm] = React.useState(initialForm)
  const [title, setTitle] = React.useState(
    form.title === "Untitled Form" ? "" : form.title || ""
  )
  const [status, setStatus] = React.useState<string>(form.status || "draft")
  const [slug, setSlug] = React.useState<string>(form.slug)
  const [questions, setQuestions] = React.useState<Question[]>(initialQuestions)
  const [selectedQuestionId, setSelectedQuestionId] = React.useState<string | null>(null)
  const [isPublishing, setIsPublishing] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [publicUrl, setPublicUrl] = React.useState("")
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false)


  const isLocked = status === "published"

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setPublicUrl(`${window.location.origin}/f/${slug}`)
    }
  }, [slug])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )

  const handleTitleChange = (val: string) => {
    if (isLocked) return
    setTitle(val)
    const titleToSave = val.trim() || "Untitled Form"
    fetch(`/api/forms/${form.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: titleToSave }),
    }).catch((err) => console.error("Failed to update form title", err))
  }

  const handlePublish = async () => {
    setIsPublishing(true)
    try {
      // Flush all current questions to Supabase DB before publishing
      const flushPromises = questions.map((q) =>
        fetch(`/api/questions/${q.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: q.title.trim() || "Untitled Question",
            description: q.description || "",
            required: q.required,
            options: q.options || [],
            settings: q.settings || {},
          }),
        })
      )
      await Promise.all(flushPromises)

      const slugToSave = form.slug || slug || nanoid(10)
      const titleToSave = title.trim() || "Untitled Form"
      const res = await fetch(`/api/forms/${form.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published", slug: slugToSave, title: titleToSave }),
      })
      if (res.ok) {
        setStatus("published")
        setSlug(slugToSave)
        if (typeof window !== "undefined") {
          setPublicUrl(`${window.location.origin}/f/${slugToSave}`)
        }
      } else {
        console.error("Failed to publish form")
      }

    } catch (err) {
      console.error("Error publishing form", err)
    } finally {
      setIsPublishing(false)
    }
  }


  const handleUnpublish = async () => {
    setIsPublishing(true)
    try {
      const res = await fetch(`/api/forms/${form.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft" }),
      })
      if (res.ok) {
        setStatus("draft")
        router.refresh()
      } else {
        console.error("Failed to unpublish form")
      }
    } catch (err) {
      console.error("Error unpublishing form", err)
    } finally {
      setIsPublishing(false)
    }
  }

  const handleCopyLink = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleAddQuestion = async (typeId: string) => {
    if (isLocked) return
    const isOptionsType = ["multiple_choice", "checkbox", "dropdown"].includes(typeId)
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      type: typeId,
      title: "",
      description: "",
      required: false,
      position: questions.length,
      options: isOptionsType ? ["Option 1", "Option 2"] : [],
      settings: {}
    }

    setQuestions((prev) => [...prev, newQuestion])
    setSelectedQuestionId(newQuestion.id)

    try {
      await fetch("/api/questions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form_id: form.id,
          ...newQuestion,
          title: "Untitled Question",
        }),
      })
    } catch (error) {
      console.error("Failed to persist question", error)
    }
  }

  const pendingQuestionUpdates = React.useRef<Record<string, Partial<Question>>>({})
  const questionTimeouts = React.useRef<Record<string, NodeJS.Timeout>>({})

  const handleUpdateQuestion = (id: string, updates: Partial<Question>) => {
    if (isLocked) return
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updates } : q))
    )

    pendingQuestionUpdates.current[id] = {
      ...(pendingQuestionUpdates.current[id] || {}),
      ...updates,
    }

    if (questionTimeouts.current[id]) {
      clearTimeout(questionTimeouts.current[id])
    }

    questionTimeouts.current[id] = setTimeout(async () => {
      const payload = pendingQuestionUpdates.current[id]
      if (!payload) return
      delete pendingQuestionUpdates.current[id]

      const finalPayload = { ...payload }
      if (typeof finalPayload.title === "string") {
        finalPayload.title = finalPayload.title.trim() || "Untitled Question"
      }

      try {
        await fetch(`/api/questions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(finalPayload),
        })
      } catch (err) {
        console.error("Failed to persist question update", err)
      }
    }, 400)
  }


  const handleDeleteQuestion = async (id: string) => {
    if (isLocked) return
    setQuestions((prev) => prev.filter((q) => q.id !== id))
    if (selectedQuestionId === id) setSelectedQuestionId(null)

    try {
      await fetch(`/api/questions/${id}`, { method: "DELETE" })
    } catch (error) {
      console.error("Failed to delete question", error)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    if (isLocked) return
    const { active, over } = event
    if (over && active.id !== over.id) {
      setQuestions((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        const reordered = arrayMove(items, oldIndex, newIndex).map((q, idx) => ({
          ...q,
          position: idx,
        }))

        // Persist new order to backend API
        fetch("/api/questions/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            formId: form.id,
            orderedIds: reordered.map((q) => q.id),
          }),
        }).catch((error) => console.error("Failed to reorder questions", error))

        return reordered
      })
    }
  }

  const [expiresAt, setExpiresAt] = React.useState<string | null>(
    form.settings?.expires_at || null
  )
  const [selectedDate, setSelectedDate] = React.useState<string>(() => {
    if (form.settings?.expires_at) {
      const d = new Date(form.settings.expires_at)
      if (!isNaN(d.getTime())) return d.toISOString().split("T")[0]
    }
    return ""
  })
  const [selectedTime, setSelectedTime] = React.useState<string>(() => {
    if (form.settings?.expires_at) {
      const d = new Date(form.settings.expires_at)
      if (!isNaN(d.getTime())) {
        const hh = String(d.getHours()).padStart(2, "0")
        const mm = String(d.getMinutes()).padStart(2, "0")
        return `${hh}:${mm}`
      }
    }
    return "18:00"
  })

  const handleSaveExpiry = async (dateStr: string, timeStr: string) => {
    if (!dateStr) return
    const combined = new Date(`${dateStr}T${timeStr || "00:00"}:00`)
    if (isNaN(combined.getTime())) return

    const isoString = combined.toISOString()
    setExpiresAt(isoString)

    const updatedSettings = {
      ...(form.settings || {}),
      expires_at: isoString,
    }

    try {
      await fetch(`/api/forms/${form.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: updatedSettings }),
      })
    } catch (err) {
      console.error("Failed to save expiry date", err)
    }
  }

  const handleClearExpiry = async () => {
    setExpiresAt(null)
    setSelectedDate("")
    setSelectedTime("18:00")

    const updatedSettings = {
      ...(form.settings || {}),
      expires_at: null,
    }

    try {
      await fetch(`/api/forms/${form.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: updatedSettings }),
      })
    } catch (err) {
      console.error("Failed to clear expiry date", err)
    }
  }

  const formatExpiryDisplay = (isoString: string | null): string => {
    if (!isoString) return ""
    try {
      const d = new Date(isoString)
      if (isNaN(d.getTime())) return ""
      return d.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    } catch {
      return ""
    }
  }

  const selectedQuestion = questions.find((q) => q.id === selectedQuestionId)

  return (

    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Top Navigation Bar */}
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="w-1/3 max-w-md">
          <Input
            disabled={isLocked}
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="text-center font-semibold text-lg border-transparent hover:border-border focus:border-border disabled:opacity-100"
            placeholder="Untitled Form"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Settings Dialog Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
            className="h-9 gap-1.5 text-xs border-border"
          >
            <Settings className="h-3.5 w-3.5 text-muted-foreground" /> Settings
          </Button>

          {/* Expiry Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isLocked}
                className="h-9 gap-1.5 text-xs border-border"
              >
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {expiresAt ? (
                  <span className="text-foreground font-medium">
                    Expires: {formatExpiryDisplay(expiresAt)}
                  </span>
                ) : (
                  <span>Expiry</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-4 space-y-4">
              <div className="space-y-1">
                <h4 className="font-semibold text-sm leading-none">Form Expiry</h4>
                <p className="text-xs text-muted-foreground">
                  Set a date & time to close form responses automatically.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Expiry Date</Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value)
                      if (e.target.value) {
                        handleSaveExpiry(e.target.value, selectedTime)
                      }
                    }}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Expiry Time</Label>
                  <Input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => {
                      setSelectedTime(e.target.value)
                      if (selectedDate) {
                        handleSaveExpiry(selectedDate, e.target.value)
                      }
                    }}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {expiresAt && (
                <div className="pt-2 border-t border-border flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearExpiry}
                    className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    Clear Expiry
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          <FormSettingsDialog
            form={form}
            open={isSettingsOpen}
            onOpenChange={setIsSettingsOpen}
            onSettingsSaved={(newSettings) => {
              setForm((prev) => ({ ...prev, settings: newSettings }))
              if (newSettings.expires_at) {
                setExpiresAt(newSettings.expires_at)
              } else if (newSettings.expires_at === null) {
                setExpiresAt(null)
              }
            }}
          />


          {isLocked ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-medium hidden md:inline">
                This form is published and locked.
              </span>
              <Button
                variant="outline"
                disabled={isPublishing}
                onClick={handleUnpublish}
                className="border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 text-xs shrink-0"
              >
                {isPublishing ? "Updating..." : "Unpublish to Edit"}
              </Button>
            </div>
          ) : (
            <Button
              variant="default"
              disabled={isPublishing}
              onClick={handlePublish}
            >
              {isPublishing ? "Publishing..." : "Publish"}
            </Button>
          )}
        </div>
      </header>


      {/* Public URL Bar when Published */}
      {status === "published" && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-2 flex items-center justify-between gap-4 text-sm shrink-0">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Form is Live
          </div>
          <div className="flex items-center gap-2 flex-1 max-w-xl">
            <Input
              readOnly
              value={publicUrl}
              className="h-8 text-xs font-mono bg-background"
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 shrink-0 text-xs gap-1"
              onClick={handleCopyLink}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy Link
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Main 3-Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Question Types */}
        <aside className="w-64 border-r border-border bg-card p-4 space-y-4 shrink-0 overflow-y-auto">
          <fieldset disabled={isLocked} className="space-y-4">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Question Types
              </h3>
              <div className="space-y-2">
                {QUESTION_TYPES.map((type) => (
                  <Button
                    key={type.id}
                    variant="outline"
                    disabled={isLocked}
                    className="w-full justify-start text-left font-normal"
                    onClick={() => handleAddQuestion(type.id)}
                  >
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>
          </fieldset>
        </aside>

        {/* Center Canvas */}
        <main className="flex-1 bg-background p-8 overflow-y-auto">
          <div className="mx-auto max-w-2xl space-y-6">
            <Card className="p-6">
              <Input
                disabled={isLocked}
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="text-2xl font-bold border-none shadow-none focus-visible:ring-0 px-0 disabled:opacity-100"
                placeholder="Untitled Form"
              />
            </Card>

            {questions.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-border p-12 text-center bg-card">
                <p className="text-sm text-muted-foreground">
                  No questions yet. Add one from the left panel.
                </p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={questions.map((q) => q.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {questions.map((question) => (
                      <QuestionCard
                        key={question.id}
                        question={question}
                        disabled={isLocked}
                        isSelected={selectedQuestionId === question.id}
                        onSelect={setSelectedQuestionId}
                        onUpdate={handleUpdateQuestion}
                        onDelete={handleDeleteQuestion}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </main>

        {/* Right Sidebar: Settings / Inspector */}
        <aside className="w-72 border-l border-border bg-card p-6 shrink-0 overflow-y-auto">
          {selectedQuestion ? (
            <QuestionSettings 
              question={selectedQuestion} 
              disabled={isLocked}
              onUpdate={handleUpdateQuestion} 
            />
          ) : (
            <div className="flex h-full items-center justify-center text-center">
              <p className="text-sm text-muted-foreground">
                Select a question to edit its settings
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}



