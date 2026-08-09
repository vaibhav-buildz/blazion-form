"use client"

import * as React from "react"
import { useForm, Controller } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CheckCircle2, Loader2 } from "lucide-react"

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

interface PublicFormFillProps {
  form: {
    id: string
    title: string
    description?: string
    slug: string
  }
  questions: Question[]
}

export function PublicFormFill({ form, questions }: PublicFormFillProps) {
  const [submitted, setSubmitted] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Record<string, any>>({
    defaultValues: questions.reduce((acc, q) => {
      acc[q.id] = q.type === "checkbox" ? [] : ""
      return acc
    }, {} as Record<string, any>),
  })

  const onSubmit = async (data: Record<string, any>) => {
    setSubmitError(null)
    try {
      const res = await fetch(`/api/forms/${form.slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: data }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to submit response")
      }

      setSubmitted(true)
    } catch (err: any) {
      console.error("Submission error:", err)
      setSubmitError(err.message || "Something went wrong. Please try again.")
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full p-8 text-center space-y-4 border-border shadow-lg">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Thank you!</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your response has been recorded.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Form Title & Description Header Card */}
        <Card className="p-8 border-border shadow-sm">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            {form.title}
          </h1>
          {form.description && (
            <p className="mt-3 text-muted-foreground leading-relaxed text-sm">
              {form.description}
            </p>
          )}
        </Card>

        {/* Questions Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {questions.map((question) => (
            <Card key={question.id} className="p-6 border-border shadow-sm space-y-4">
              <div>
                <Label className="text-base font-semibold text-foreground flex items-center gap-1">
                  <span>{question.title || "Untitled Question"}</span>

                  {question.required && (
                    <span className="text-destructive font-bold" title="Required">
                      *
                    </span>
                  )}
                </Label>
                {question.description && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {question.description}
                  </p>
                )}
                {question.type === "checkbox" &&
                  (question.settings?.minSelect || question.settings?.maxSelect) && (
                    <p className="mt-1 text-xs text-muted-foreground font-medium">
                      {question.settings?.minSelect && question.settings?.maxSelect
                        ? `Select ${question.settings.minSelect} to ${question.settings.maxSelect} options`
                        : question.settings?.minSelect
                        ? `Select at least ${question.settings.minSelect} options`
                        : `Select up to ${question.settings.maxSelect} options`}
                    </p>
                  )}
              </div>

              {/* Input field based on type */}
              <div>
                <Controller
                  name={question.id}
                  control={control}
                  rules={{
                    validate: (value) => {
                      switch (question.type) {
                        case "short_text":
                        case "long_text": {
                          const strVal = typeof value === "string" ? value.trim() : ""
                          if (question.required && !strVal) {
                            return "This question is required"
                          }

                          const maxChars = question.settings?.maxChars
                          if (
                            maxChars &&
                            typeof maxChars === "number" &&
                            maxChars > 0 &&
                            strVal.length > maxChars
                          ) {
                            return `Maximum ${maxChars} characters allowed`
                          }

                          if (question.type === "long_text") {
                            const minWords = question.settings?.minWords
                            if (
                              minWords &&
                              typeof minWords === "number" &&
                              minWords > 0 &&
                              strVal
                            ) {
                              const wordCount = strVal.split(/\s+/).filter(Boolean).length
                              if (wordCount < minWords) {
                                return `Minimum ${minWords} words required`
                              }
                            }
                          }

                          return true
                        }

                        case "multiple_choice":
                        case "dropdown": {
                          const strVal = typeof value === "string" ? value.trim() : ""
                          if (question.required && !strVal) {
                            return "Please select an option"
                          }
                          return true
                        }

                        case "checkbox": {
                          const arr = Array.isArray(value) ? value : []
                          const min = question.settings?.minSelect
                          const max = question.settings?.maxSelect

                          if (question.required || (min && min > 0)) {
                            const requiredMin = min && min > 0 ? min : 1
                            if (arr.length < requiredMin) {
                              return requiredMin === 1
                                ? "Please select at least 1 option"
                                : `Please select at least ${requiredMin} options`
                            }
                          }

                          if (max && max > 0 && arr.length > max) {
                            return `Please select at most ${max} options`
                          }

                          return true
                        }

                        default: {
                          if (question.required && !value) {
                            return "This question is required"
                          }
                          return true
                        }
                      }
                    },
                  }}

                  render={({ field }) => {
                    switch (question.type) {
                      case "short_text":
                        return (
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder={question.settings?.placeholder || "Your answer"}
                            className="w-full"
                          />
                        )

                      case "long_text":
                        return (
                          <Textarea
                            {...field}
                            value={field.value || ""}
                            placeholder={question.settings?.placeholder || "Your answer"}
                            rows={4}
                            className="w-full resize-y"
                          />
                        )

                      case "multiple_choice":
                        return (
                          <RadioGroup
                            value={field.value || ""}
                            onValueChange={field.onChange}
                            className="space-y-2"
                          >
                            {question.options?.map((opt, idx) => (
                              <div
                                key={idx}
                                className="flex items-center space-x-3 rounded-md border border-transparent p-2 hover:bg-accent/40"
                              >
                                <RadioGroupItem
                                  value={opt}
                                  id={`${question.id}-${idx}`}
                                />
                                <Label
                                  htmlFor={`${question.id}-${idx}`}
                                  className="text-sm font-normal cursor-pointer flex-1"
                                >
                                  {opt}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        )

                      case "checkbox": {
                        const currentValues: string[] = Array.isArray(field.value)
                          ? field.value
                          : []
                        const maxSelect = question.settings?.maxSelect
                        const isMaxReached =
                          typeof maxSelect === "number" &&
                          maxSelect > 0 &&
                          currentValues.length >= maxSelect

                        return (
                          <div className="space-y-2">
                            {question.options?.map((opt, idx) => {
                              const isChecked = currentValues.includes(opt)
                              const isDisabled = !isChecked && isMaxReached

                              return (
                                <div
                                  key={`${question.id}-opt-${idx}`}
                                  className="flex items-center space-x-3 rounded-md border border-transparent p-2 hover:bg-accent/40"
                                >
                                  <Checkbox
                                    id={`${question.id}-opt-${idx}`}
                                    checked={isChecked}
                                    disabled={isDisabled}
                                    onCheckedChange={(checkedState) => {
                                      let updated: string[]
                                      if (checkedState === true) {
                                        if (isDisabled) return
                                        updated = currentValues.includes(opt)
                                          ? currentValues
                                          : [...currentValues, opt]
                                      } else {
                                        updated = currentValues.filter(
                                          (v) => v !== opt
                                        )
                                      }
                                      field.onChange(updated)
                                    }}
                                  />
                                  <Label
                                    htmlFor={`${question.id}-opt-${idx}`}
                                    className={`text-sm font-normal flex-1 ${
                                      isDisabled
                                        ? "cursor-not-allowed opacity-50"
                                        : "cursor-pointer"
                                    }`}
                                  >
                                    {opt}
                                  </Label>
                                </div>
                              )
                            })}
                            {isMaxReached && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium pt-1">
                                Maximum of {maxSelect} options selected
                              </p>
                            )}
                          </div>
                        )
                      }


                      case "dropdown":
                        return (
                          <Select
                            value={field.value || ""}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                            <SelectContent>
                              {question.options?.map((opt, idx) => (
                                <SelectItem key={idx} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )

                      default:
                        return (
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="Your answer"
                          />
                        )
                    }
                  }}
                />
              </div>

              {errors[question.id] && (
                <p className="text-xs text-destructive font-medium">
                  {errors[question.id]?.message as string}
                </p>
              )}
            </Card>
          ))}

          {submitError && (
            <div className="rounded-md bg-destructive/10 p-4 border border-destructive/20 text-sm text-destructive font-medium">
              {submitError}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              size="lg"
              className="w-full sm:w-auto px-8 font-semibold"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
