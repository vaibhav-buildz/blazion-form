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
import { Copy, Check, Settings, Split, Sparkles, Palette, Share2, History } from "lucide-react"
import { FormSettingsDialog } from "./FormSettingsDialog"
import { FormAuditorModal } from "./FormAuditorModal"
import { SmartFieldSuggestions } from "./SmartFieldSuggestions"
import { SharePanelModal } from "./SharePanelModal"
import { ThemeStudioModal, FormTheme } from "./ThemeStudioModal"
import { VersionHistoryModal, FormVersion } from "./VersionHistoryModal"
import { LanguageToggle } from "@/lib/i18n"

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
  { id: "file_upload", label: "File Upload" },
  { id: "signature", label: "E-Signature" },
  { id: "phone", label: "Indian Phone (+91)" },
  { id: "slot_booking", label: "Slot Booking" },
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
  const [isAuditorOpen, setIsAuditorOpen] = React.useState(false)
  const [isShareOpen, setIsShareOpen] = React.useState(false)
  const [isThemeOpen, setIsThemeOpen] = React.useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false)
  const [isMounted, setIsMounted] = React.useState(false)
  const [mobileTab, setMobileTab] = React.useState<"palette" | "canvas" | "inspector">("canvas")


  React.useEffect(() => {
    setIsMounted(true)
  }, [])


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
            rules: q.rules || [],
          }),
        })
      )
      await Promise.all(flushPromises)

      // Always generate a new unique slug when publishing from draft
      const newSlug = nanoid(10)
      const titleToSave = title.trim() || "Untitled Form"

      const existingVersions: FormVersion[] = form.settings?.versions || []
      const snapshot: FormVersion = {
        id: crypto.randomUUID(),
        versionNumber: existingVersions.length + 1,
        publishedAt: new Date().toISOString(),
        questions: JSON.parse(JSON.stringify(questions)),
        title: titleToSave,
        settings: form.settings || {},
      }
      const updatedVersions = [...existingVersions, snapshot]
      const updatedSettings = {
        ...(form.settings || {}),
        versions: updatedVersions,
      }

      const res = await fetch(`/api/forms/${form.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "published",
          slug: newSlug,
          title: titleToSave,
          settings: updatedSettings,
        }),
      })
      if (res.ok) {
        setStatus("published")
        setSlug(newSlug)
        setForm((prev) => ({
          ...prev,
          slug: newSlug,
          status: "published",
          settings: updatedSettings,
        }))
        if (typeof window !== "undefined") {
          setPublicUrl(`${window.location.origin}/f/${newSlug}`)
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

  const handleRollback = async (version: FormVersion) => {
    try {
      setQuestions(version.questions)
      setTitle(version.title)
      setForm((prev) => ({ ...prev, title: version.title, settings: version.settings || prev.settings }))
      await fetch(`/api/forms/${form.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: version.title,
          settings: version.settings || form.settings,
        }),
      })
      for (const q of version.questions) {
        await fetch(`/api/questions/${q.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(q),
        }).catch(() => {})
      }
    } catch (err) {
      console.error("Rollback error:", err)
    }
  }

  const handleSaveTheme = async (newTheme: FormTheme) => {
    const updatedSettings = { ...(form.settings || {}), theme: newTheme }
    setForm((prev) => ({ ...prev, settings: updatedSettings }))
    await fetch(`/api/forms/${form.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: updatedSettings }),
    })
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
        setForm((prev) => ({ ...prev, status: "draft" }))
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
    const defaultTitle = typeId === "section_break" ? "Section Title" : ""
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      type: typeId,
      title: defaultTitle,
      description: "",
      required: false,
      position: questions.length,
      options: isOptionsType ? ["Option 1", "Option 2"] : [],
      settings: typeId === "file_upload" ? { allowedTypes: ["image/*", "application/pdf", ".doc/.docx"], maxSizeMB: 5 } : {}
    }

    setQuestions((prev) => [...prev, newQuestion])
    setSelectedQuestionId(newQuestion.id)
    setMobileTab("canvas")

    try {
      await fetch("/api/questions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form_id: form.id,
          ...newQuestion,
          title: defaultTitle || "Untitled Question",
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

  const selectedQuestion = questions.find((q) => q.id === selectedQuestionId)

  return (

    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Top Navigation Bar */}
      <header className="flex flex-col lg:flex-row min-h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6 py-2.5 lg:py-0 gap-2 shrink-0">
        <div className="flex items-center justify-between w-full lg:w-auto gap-3">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            ← Back to Dashboard
          </Link>

          {/* Mobile Tab Switcher */}
          <div className="flex lg:hidden items-center bg-muted/60 p-0.5 rounded-lg border border-border text-xs">
            <button
              type="button"
              onClick={() => setMobileTab("palette")}
              className={`px-2 py-1 rounded-md font-medium transition ${
                mobileTab === "palette" ? "bg-card text-foreground shadow-2xs font-semibold" : "text-muted-foreground"
              }`}
            >
              Fields
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("canvas")}
              className={`px-2 py-1 rounded-md font-medium transition ${
                mobileTab === "canvas" ? "bg-card text-foreground shadow-2xs font-semibold" : "text-muted-foreground"
              }`}
            >
              Canvas
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("inspector")}
              className={`px-2 py-1 rounded-md font-medium transition ${
                mobileTab === "inspector" ? "bg-card text-foreground shadow-2xs font-semibold" : "text-muted-foreground"
              }`}
            >
              Inspector
            </button>
          </div>
        </div>

        <div className="w-full lg:w-1/3 max-w-md">
          <Input
            disabled={isLocked}
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="text-center font-semibold text-base sm:text-lg border-transparent hover:border-border focus:border-border disabled:opacity-100 h-9"
            placeholder="Untitled Form"
          />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto max-w-full pb-1 lg:pb-0 shrink-0">
          {/* Multilingual Switcher */}
          <LanguageToggle className="mr-1" />

          {/* AI Auditor Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAuditorOpen(true)}
            className="h-9 gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50/50"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" /> Audit
          </Button>

          {/* Theme Studio Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsThemeOpen(true)}
            className="h-9 gap-1.5 text-xs border-border"
          >
            <Palette className="h-3.5 w-3.5 text-pink-500" /> Theme
          </Button>

          {/* Share Panel Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsShareOpen(true)}
            className="h-9 gap-1.5 text-xs border-border"
          >
            <Share2 className="h-3.5 w-3.5 text-blue-500" /> Share
          </Button>

          {/* Version History Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHistoryOpen(true)}
            className="h-9 gap-1.5 text-xs border-border"
          >
            <History className="h-3.5 w-3.5 text-purple-500" /> History
          </Button>

          {/* Settings Dialog Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
            className="h-9 gap-1.5 text-xs border-border"
          >
            <Settings className="h-3.5 w-3.5 text-muted-foreground" /> Settings
          </Button>

          <FormAuditorModal
            open={isAuditorOpen}
            onOpenChange={setIsAuditorOpen}
            formTitle={title}
            formDescription=""
            questions={questions}
            onSelectQuestion={(qId) => setSelectedQuestionId(qId)}
          />

          <SharePanelModal
            open={isShareOpen}
            onOpenChange={setIsShareOpen}
            formTitle={title}
            formSlug={slug}
            formId={form.id}
          />

          <ThemeStudioModal
            open={isThemeOpen}
            onOpenChange={setIsThemeOpen}
            initialTheme={form.settings?.theme}
            formTitle={title}
            onSave={handleSaveTheme}
          />

          <VersionHistoryModal
            open={isHistoryOpen}
            onOpenChange={setIsHistoryOpen}
            versions={form.settings?.versions || []}
            currentQuestions={questions}
            onRollback={handleRollback}
          />

          <FormSettingsDialog
            form={form}
            open={isSettingsOpen}
            onOpenChange={setIsSettingsOpen}
            onSettingsSaved={(newSettings, newSlug) => {
              console.log("[FormBuilder] onSettingsSaved received newSettings:", newSettings, "newSlug:", newSlug)
              setForm((prev) => {
                const updated = {
                  ...prev,
                  settings: newSettings,
                  ...(newSlug ? { slug: newSlug } : {}),
                }
                console.log("[FormBuilder] Updated local form state:", updated)
                return updated
              })
              if (newSlug) {
                setSlug(newSlug)
                setPublicUrl(`${window.location.origin}/f/${newSlug}`)
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
        <div className="bg-success/10 border-b border-success/20 px-6 py-2 flex items-center justify-between gap-4 text-sm shrink-0">
          <div className="flex items-center gap-2 text-success font-medium shrink-0">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
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
                  <Check className="h-3.5 w-3.5 text-success" />
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
        <aside className={`${mobileTab === "palette" ? "flex flex-col w-full" : "hidden"} lg:block lg:w-64 border-r border-border bg-card p-4 space-y-4 shrink-0 overflow-y-auto`}>
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
              <div className="pt-4 border-t border-border mt-4">
                <Button
                  variant="secondary"
                  disabled={isLocked}
                  className="w-full justify-start text-left font-medium border border-border/60 bg-muted/60 hover:bg-muted text-foreground gap-2"
                  onClick={() => handleAddQuestion("section_break")}
                >
                  <Split className="h-4 w-4 text-muted-foreground" />
                  Section Break
                </Button>
              </div>
            </div>
          </fieldset>
        </aside>

        {/* Center Canvas */}
        <main className={`${mobileTab === "canvas" ? "flex-1" : "hidden"} lg:block lg:flex-1 bg-background p-4 sm:p-8 overflow-y-auto`}>
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

            {!isLocked && (
              <SmartFieldSuggestions
                formTitle={title}
                currentQuestions={questions}
                onAddSuggestedField={async (suggested) => {
                  const newOrder = questions.length
                  const tempId = `temp_${Date.now()}`
                  const newQuestion: Question = {
                    id: tempId,
                    title: suggested.title,
                    type: suggested.type,
                    required: false,
                    position: newOrder,
                    options: suggested.options || (["multiple_choice", "checkbox", "dropdown"].includes(suggested.type) ? ["Option 1", "Option 2"] : undefined),
                    rules: [],
                    settings: {},
                  }
                  setQuestions((prev) => [...prev, newQuestion])
                  setSelectedQuestionId(tempId)

                  try {
                    const res = await fetch("/api/questions/create", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        form_id: form.id,
                        title: suggested.title,
                        type: suggested.type,
                        required: false,
                        position: newOrder,
                        options: newQuestion.options,
                        settings: {},
                        rules: [],
                      }),
                    })
                    if (res.ok) {
                      const saved = await res.json()
                      setQuestions((prev) => prev.map((q) => (q.id === tempId ? saved : q)))
                      setSelectedQuestionId(saved.id)
                    }
                  } catch (err) {
                    console.error("Error creating suggested question", err)
                  }
                }}
              />
            )}


            {questions.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-border p-12 text-center bg-card">
                <p className="text-sm text-muted-foreground">
                  No questions yet. Add one from the left panel.
                </p>
              </div>
            ) : isMounted ? (
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
                        onSelect={(id) => {
                          setSelectedQuestionId(id)
                          if (typeof window !== "undefined" && window.innerWidth < 1024) {
                            setMobileTab("inspector")
                          }
                        }}
                        onUpdate={handleUpdateQuestion}
                        onDelete={handleDeleteQuestion}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="space-y-4">
                {questions.map((question) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    disabled={isLocked}
                    isSelected={selectedQuestionId === question.id}
                    onSelect={(id) => {
                      setSelectedQuestionId(id)
                      if (typeof window !== "undefined" && window.innerWidth < 1024) {
                        setMobileTab("inspector")
                      }
                    }}
                    onUpdate={handleUpdateQuestion}
                    onDelete={handleDeleteQuestion}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar: Settings / Inspector */}
        <aside className={`${mobileTab === "inspector" ? "flex flex-col w-full" : "hidden"} lg:block lg:w-72 border-l border-border bg-card p-4 sm:p-6 shrink-0 overflow-y-auto`}>
          {selectedQuestion ? (
            <div className="space-y-4">
              <div className="flex lg:hidden items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Field Settings</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileTab("canvas")}
                  className="h-7 text-xs px-2"
                >
                  ← Back to Canvas
                </Button>
              </div>
              <QuestionSettings 
                question={selectedQuestion}
                questions={questions} 
                disabled={isLocked}
                onUpdate={handleUpdateQuestion} 
              />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center p-4">
              <p className="text-sm text-muted-foreground mb-3">
                Select a question to edit its settings
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMobileTab("canvas")}
                className="lg:hidden text-xs"
              >
                Back to Canvas
              </Button>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}



