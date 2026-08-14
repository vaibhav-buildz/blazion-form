"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { X, Plus, Trash, ChevronDown, ChevronRight } from "lucide-react"
import { type Question, type QuestionRule } from "./QuestionCard"

interface QuestionSettingsProps {
  question: Question
  questions?: Question[]
  disabled?: boolean
  onUpdate: (id: string, updates: Partial<Question>) => void
}

export function QuestionSettings({
  question,
  questions = [],
  disabled = false,
  onUpdate,
}: QuestionSettingsProps) {
  const [isLogicOpen, setIsLogicOpen] = React.useState(true)

  const handleUpdate = (updates: Partial<Question>) => {
    if (disabled) return
    onUpdate(question.id, updates)
  }

  const handleSettingUpdate = (key: string, value: any) => {
    if (disabled) return
    const newSettings = { ...(question.settings || {}), [key]: value }
    handleUpdate({ settings: newSettings })
  }

  const handleOptionUpdate = (idx: number, val: string) => {
    if (disabled) return
    const newOptions = [...(question.options || [])]
    newOptions[idx] = val
    handleUpdate({ options: newOptions })
  }

  const handleOptionRemove = (idx: number) => {
    if (disabled) return
    const newOptions = [...(question.options || [])]
    if (newOptions.length > 1) {
      newOptions.splice(idx, 1)
      handleUpdate({ options: newOptions })
    }
  }

  const handleOptionAdd = () => {
    if (disabled) return
    const newOptions = [...(question.options || [])]
    newOptions.push(`Option ${newOptions.length + 1}`)
    handleUpdate({ options: newOptions })
  }

  const isOptionsType = ["multiple_choice", "checkbox", "dropdown"].includes(
    question.type
  )

  const priorQuestions = React.useMemo(() => {
    return (questions || []).filter((q) => q.position < question.position)
  }, [questions, question.position])

  const handleAddRule = () => {
    if (disabled || priorQuestions.length === 0) return
    const defaultPrior = priorQuestions[0]
    const newRule: QuestionRule = {
      ifQuestionId: defaultPrior.id,
      operator: "equals",
      value: defaultPrior.options?.[0] || "",
      action: "show",
    }
    const newRules = [...(question.rules || []), newRule]
    handleUpdate({ rules: newRules })
  }

  const handleRuleUpdate = (idx: number, updates: Partial<QuestionRule>) => {
    if (disabled) return
    const newRules = [...(question.rules || [])]
    newRules[idx] = { ...newRules[idx], ...updates }
    handleUpdate({ rules: newRules })
  }

  const handleRemoveRule = (idx: number) => {
    if (disabled) return
    const newRules = [...(question.rules || [])]
    newRules.splice(idx, 1)
    handleUpdate({ rules: newRules })
  }

  return (
    <fieldset disabled={disabled} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Editing Question</h3>
      </div>

      {/* Common Fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Question Title</Label>
          <Input
            disabled={disabled}
            value={question.title || ""}
            onChange={(e) => handleUpdate({ title: e.target.value })}
            placeholder="Untitled Question"
          />
        </div>

        <div className="space-y-2">
          <Label>Help Text (Optional)</Label>
          <Textarea
            disabled={disabled}
            value={question.description || ""}
            onChange={(e) => handleUpdate({ description: e.target.value })}
            placeholder="Add a description..."
            className="resize-none"
          />
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <Checkbox
            disabled={disabled}
            id="settings-required"
            checked={question.required}
            onCheckedChange={(checked) => handleUpdate({ required: !!checked })}
          />
          <Label htmlFor="settings-required">Required</Label>
        </div>
      </div>

      <div className="border-t border-border pt-6 space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Type Specific Settings
        </h4>

        {/* Text Types */}
        {(question.type === "short_text" || question.type === "long_text") && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Placeholder Text</Label>
              <Input
                disabled={disabled}
                value={question.settings?.placeholder || ""}
                onChange={(e) => handleSettingUpdate("placeholder", e.target.value)}
                placeholder={
                  question.type === "long_text"
                    ? "Long text response..."
                    : "Short text response..."
                }
              />
            </div>

            {question.type === "short_text" && (
              <div className="space-y-2">
                <Label>Max Characters</Label>
                <Input
                  disabled={disabled}
                  type="number"
                  value={question.settings?.maxChars || ""}
                  onChange={(e) =>
                    handleSettingUpdate(
                      "maxChars",
                      e.target.value ? parseInt(e.target.value) : undefined
                    )
                  }
                  placeholder="No limit"
                />
              </div>
            )}

            {question.type === "long_text" && (
              <>
                <div className="space-y-2">
                  <Label>Min Character Count</Label>
                  <Input
                    disabled={disabled}
                    type="number"
                    value={question.settings?.minChars || ""}
                    onChange={(e) =>
                      handleSettingUpdate(
                        "minChars",
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                    placeholder="No limit"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Character Count</Label>
                  <Input
                    disabled={disabled}
                    type="number"
                    value={question.settings?.maxChars || ""}
                    onChange={(e) =>
                      handleSettingUpdate(
                        "maxChars",
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                    placeholder="No limit"
                  />
                </div>
              </>
            )}

          </div>
        )}

        {/* Option Types */}
        {isOptionsType && (
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Options</Label>
              {question.options?.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    disabled={disabled}
                    value={opt}
                    onChange={(e) => handleOptionUpdate(idx, e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOptionRemove(idx)}
                    disabled={disabled || (question.options?.length || 0) <= 1}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={handleOptionAdd}
                disabled={disabled}
                className="w-full mt-2"
              >
                <Plus className="h-4 w-4 mr-2" /> Add option
              </Button>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                disabled={disabled}
                id="settings-shuffle"
                checked={question.settings?.shuffle || false}
                onCheckedChange={(checked) =>
                  handleSettingUpdate("shuffle", !!checked)
                }
              />
              <Label htmlFor="settings-shuffle">Shuffle options</Label>
            </div>

            {question.type === "checkbox" && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label>Min selections</Label>
                  <Input
                    disabled={disabled}
                    type="number"
                    value={question.settings?.minSelect || ""}
                    onChange={(e) =>
                      handleSettingUpdate(
                        "minSelect",
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max selections</Label>
                  <Input
                    disabled={disabled}
                    type="number"
                    value={question.settings?.maxSelect || ""}
                    onChange={(e) =>
                      handleSettingUpdate(
                        "maxSelect",
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Conditional Logic Section */}
      <div className="border-t border-border pt-6 space-y-4">
        <button
          type="button"
          onClick={() => setIsLogicOpen(!isLogicOpen)}
          className="flex items-center justify-between w-full text-left font-medium text-sm text-foreground hover:text-primary transition-colors"
        >
          <span className="font-semibold flex items-center gap-2">
            Conditional Logic
            {question.rules && question.rules.length > 0 && (
              <span className="rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs px-2 py-0.5 font-normal border border-amber-500/20">
                {question.rules.length} {question.rules.length === 1 ? "rule" : "rules"}
              </span>
            )}
          </span>
          {isLogicOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {isLogicOpen && (
          <div className="space-y-4 pt-2">
            {priorQuestions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Add preceding questions to this form to configure conditional logic rules.
              </p>
            ) : (
              <>
                {question.rules?.map((rule, idx) => {
                  const targetQ = priorQuestions.find((q) => q.id === rule.ifQuestionId)
                  const isTargetOptionsType =
                    targetQ && ["multiple_choice", "dropdown"].includes(targetQ.type)

                  return (
                    <div
                      key={idx}
                      className="p-3 border border-border rounded-lg bg-muted/30 space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Rule {idx + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={disabled}
                          onClick={() => handleRemoveRule(idx)}
                          className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <Trash className="h-3.5 w-3.5" />
                          <span className="sr-only">Remove rule</span>
                        </Button>
                      </div>

                      {/* Dropdown: If [Question] */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">If question</Label>
                        <Select
                          disabled={disabled}
                          value={rule.ifQuestionId}
                          onValueChange={(val) => {
                            const newTarget = priorQuestions.find((q) => q.id === val)
                            const initialVal =
                              newTarget && ["multiple_choice", "dropdown"].includes(newTarget.type)
                                ? newTarget.options?.[0] || ""
                                : ""
                            handleRuleUpdate(idx, { ifQuestionId: val, value: initialVal })
                          }}
                        >
                          <SelectTrigger className="w-full h-8 text-xs">
                            <SelectValue placeholder="Select question" />
                          </SelectTrigger>
                          <SelectContent>
                            {priorQuestions.map((pq) => (
                              <SelectItem key={pq.id} value={pq.id} className="text-xs">
                                {pq.title ? (pq.title.length > 30 ? pq.title.slice(0, 30) + "..." : pq.title) : "Untitled Question"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Dropdown: Condition */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Condition</Label>
                        <Select
                          disabled={disabled}
                          value={rule.operator}
                          onValueChange={(val: any) => handleRuleUpdate(idx, { operator: val })}
                        >
                          <SelectTrigger className="w-full h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equals" className="text-xs">is (equals)</SelectItem>
                            <SelectItem value="not_equals" className="text-xs">is not (not equals)</SelectItem>
                            <SelectItem value="contains" className="text-xs">contains</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Value Input */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Value</Label>
                        {isTargetOptionsType && targetQ?.options && targetQ.options.length > 0 ? (
                          <Select
                            disabled={disabled}
                            value={rule.value}
                            onValueChange={(val) => handleRuleUpdate(idx, { value: val })}
                          >
                            <SelectTrigger className="w-full h-8 text-xs">
                              <SelectValue placeholder="Select option" />
                            </SelectTrigger>
                            <SelectContent>
                              {targetQ.options.map((opt, optIdx) => (
                                <SelectItem key={optIdx} value={opt} className="text-xs">
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            disabled={disabled}
                            value={rule.value || ""}
                            onChange={(e) => handleRuleUpdate(idx, { value: e.target.value })}
                            placeholder="Enter value"
                            className="h-8 text-xs"
                          />
                        )}
                      </div>

                      {/* Dropdown: Action */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Action</Label>
                        <Select
                          disabled={disabled}
                          value={rule.action}
                          onValueChange={(val: any) => handleRuleUpdate(idx, { action: val })}
                        >
                          <SelectTrigger className="w-full h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="show" className="text-xs">Show this question</SelectItem>
                            <SelectItem value="hide" className="text-xs">Hide this question</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )
                })}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddRule}
                  disabled={disabled}
                  className="w-full text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Add rule
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </fieldset>
  )
}




