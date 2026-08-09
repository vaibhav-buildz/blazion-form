import * as React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Trash, ChevronDown, GripVertical } from "lucide-react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

export interface Question {
  id: string
  type: string
  title: string
  description?: string
  required: boolean
  position: number
  options?: string[]
  settings?: any
}

interface QuestionCardProps {
  question: Question
  isSelected: boolean
  disabled?: boolean
  onSelect: (id: string) => void
  onUpdate: (id: string, updates: Partial<Question>) => void
  onDelete: (id: string) => void
}

const TYPE_LABELS: Record<string, string> = {
  short_text: "Short Text",
  long_text: "Long Text",
  multiple_choice: "Multiple Choice",
  checkbox: "Checkbox",
  dropdown: "Dropdown",
}

export function QuestionCard({
  question,
  isSelected,
  disabled = false,
  onSelect,
  onUpdate,
  onDelete,
}: QuestionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isOptionsType = ["multiple_choice", "checkbox", "dropdown"].includes(
    question.type
  )

  const displayTitle = question.title === "Untitled Question" ? "" : question.title || ""

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(question.id)}
      className={`relative mb-3 rounded-lg border bg-card p-4 transition-colors ${
        isDragging ? "opacity-50 z-10 shadow-lg" : ""
      } ${
        isSelected
          ? "border-primary ring-1 ring-primary"
          : "border-border hover:border-primary/50"
      } ${disabled ? "opacity-90" : ""}`}
    >
      <div className="flex items-start gap-2">
        <div
          className={`mt-1 flex h-8 w-6 items-center justify-center text-muted-foreground touch-none rounded ${
            disabled ? "cursor-not-allowed opacity-40" : "cursor-grab active:cursor-grabbing hover:text-foreground hover:bg-accent/50"
          } shrink-0`}
          {...(!disabled ? attributes : {})}
          {...(!disabled ? listeners : {})}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </div>

        <div className="flex-1">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <Input
                disabled={disabled}
                value={displayTitle}
                onChange={(e) => onUpdate(question.id, { title: e.target.value })}
                className="h-auto border-transparent bg-transparent px-2 py-1 text-base font-medium shadow-none hover:bg-accent/50 focus-visible:ring-0 focus-visible:bg-transparent disabled:opacity-100"
                placeholder="Untitled Question"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect(question.id)
                }}
              />
              <div className="px-2">
                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {TYPE_LABELS[question.type] || question.type}
                </span>
                {question.description && (
                  <p className="mt-2 text-sm text-muted-foreground">{question.description}</p>
                )}
              </div>
            </div>

            <Button
              disabled={disabled}
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive shrink-0"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(question.id)
              }}
            >
              <Trash className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>

          <div className="px-2">
            {isOptionsType ? (
              question.type === "dropdown" ? (
                <div className="flex h-10 w-full max-w-sm items-center justify-between rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground opacity-70">
                  <span>{question.options?.[0] || "Option 1"}</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </div>
              ) : (
                <div className="space-y-2">
                  {question.options?.map((option, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <div
                        className={`h-4 w-4 border border-muted-foreground/30 flex-shrink-0 ${
                          question.type === "checkbox" ? "rounded-sm" : "rounded-full"
                        }`}
                      />
                      <span>{option}</span>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <Input
                disabled
                className="bg-muted/50 text-muted-foreground"
                placeholder={
                  question.settings?.placeholder ||
                  (question.type === "long_text"
                    ? "Long text response..."
                    : "Short text response...")
                }
              />
            )}
          </div>

          <div
            className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-4 px-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-2">
              <Checkbox
                disabled={disabled}
                id={`required-${question.id}`}
                checked={question.required}
                onCheckedChange={(checked) =>
                  onUpdate(question.id, { required: !!checked })
                }
              />
              <Label htmlFor={`required-${question.id}`} className={disabled ? "opacity-70" : ""}>Required</Label>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


