"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { QuestionCard, type Question } from "./QuestionCard"

interface FormBuilderProps {
  form: {
    id: string
    title: string
    slug: string
    status: string
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

export function FormBuilder({ form, initialQuestions = [] }: FormBuilderProps) {
  const [title, setTitle] = React.useState(form.title || "Untitled Form")
  const [questions, setQuestions] = React.useState<Question[]>(initialQuestions)
  const [selectedQuestionId, setSelectedQuestionId] = React.useState<string | null>(null)

  const handleAddQuestion = async (typeId: string) => {
    const isOptionsType = ["multiple_choice", "checkbox", "dropdown"].includes(typeId)
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      type: typeId,
      title: "Untitled Question",
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
        body: JSON.stringify({ form_id: form.id, ...newQuestion }),
      })
    } catch (error) {
      console.error("Failed to persist question", error)
    }
  }

  const handleUpdateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updates } : q))
    )
  }

  const handleDeleteQuestion = async (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id))
    if (selectedQuestionId === id) setSelectedQuestionId(null)

    try {
      await fetch(`/api/questions/${id}`, { method: "DELETE" })
    } catch (error) {
      console.error("Failed to delete question", error)
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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-center font-semibold text-lg border-transparent hover:border-border focus:border-border"
            placeholder="Form Title"
          />
        </div>

        <div>
          <Button disabled variant="default">
            Publish
          </Button>
        </div>
      </header>

      {/* Main 3-Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Question Types */}
        <aside className="w-64 border-r border-border bg-card p-4 space-y-4 shrink-0 overflow-y-auto">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Question Types
            </h3>
            <div className="space-y-2">
              {QUESTION_TYPES.map((type) => (
                <Button
                  key={type.id}
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  onClick={() => handleAddQuestion(type.id)}
                >
                  {type.label}
                </Button>
              ))}
            </div>
          </div>
        </aside>

        {/* Center Canvas */}
        <main className="flex-1 bg-background p-8 overflow-y-auto">
          <div className="mx-auto max-w-2xl space-y-6">
            <Card className="p-6">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-2xl font-bold border-none shadow-none focus-visible:ring-0 px-0"
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
              <div className="space-y-4">
                {questions.map((question) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    isSelected={selectedQuestionId === question.id}
                    onSelect={setSelectedQuestionId}
                    onUpdate={handleUpdateQuestion}
                    onDelete={handleDeleteQuestion}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar: Settings / Inspector */}
        <aside className="w-72 border-l border-border bg-card p-6 shrink-0 overflow-y-auto">
          {selectedQuestion ? (
            <div>
              <h3 className="text-lg font-semibold mb-4">Editing: {selectedQuestion.title}</h3>
            </div>
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
