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
import { CheckCircle2, Loader2, Lock } from "lucide-react"

import { type QuestionRule } from "./QuestionCard"

export interface Question {
  id: string
  type: string
  title: string
  description?: string
  required: boolean
  position: number
  options?: string[]
  settings?: any
  rules?: QuestionRule[]
}

interface PublicFormFillProps {
  form: {
    id: string
    title: string
    description?: string
    slug: string
    settings?: Record<string, any>
  }
  questions: Question[]
}

/**
 * Evaluates conditional logic rules for a question against current form answers.
 *
 * Rule Precedence Strategy:
 * 1. If a question has NO rules, it is visible by default (returns true).
 * 2. If a question HAS rules, it starts hidden by default unless evaluated:
 *    - If ANY matching rule has action === 'hide', the question is HIDDEN (returns false) — 'hide' rules override.
 *    - Otherwise, if there is at least one 'show' rule and any 'show' rule condition matches, the question is VISIBLE (returns true).
 *    - If there are ONLY 'hide' rules and none matched, the question is VISIBLE (returns true).
 *    - If there are 'show' rules and none matched, the question is HIDDEN (returns false).
 */
export function evaluateRules(question: Question, answers: Record<string, any>): boolean {
  if (!question.rules || question.rules.length === 0) {
    return true
  }

  let hasHideMatch = false
  let hasShowRule = false
  let hasShowMatch = false

  for (const rule of question.rules) {
    const answerVal = answers[rule.ifQuestionId]
    let isMatch = false

    if (answerVal !== undefined && answerVal !== null) {
      if (Array.isArray(answerVal)) {
        if (rule.operator === "equals") {
          isMatch = answerVal.includes(rule.value)
        } else if (rule.operator === "not_equals") {
          isMatch = !answerVal.includes(rule.value)
        } else if (rule.operator === "contains") {
          const target = (rule.value || "").toLowerCase()
          isMatch = answerVal.some((item) => String(item).toLowerCase().includes(target))
        }
      } else {
        const strVal = String(answerVal).trim()
        const target = (rule.value || "").trim()

        if (rule.operator === "equals") {
          isMatch = strVal === target
        } else if (rule.operator === "not_equals") {
          isMatch = strVal !== target
        } else if (rule.operator === "contains") {
          isMatch = strVal.toLowerCase().includes(target.toLowerCase())
        }
      }
    } else {
      if (rule.operator === "not_equals" && rule.value) {
        isMatch = true
      }
    }

    if (rule.action === "hide") {
      if (isMatch) {
        hasHideMatch = true
      }
    } else if (rule.action === "show") {
      hasShowRule = true
      if (isMatch) {
        hasShowMatch = true
      }
    }
  }

  if (hasHideMatch) {
    return false
  }

  if (hasShowRule) {
    return hasShowMatch
  }

  return true
}

export function PublicFormFill({ form, questions }: PublicFormFillProps) {
  const [submitted, setSubmitted] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  // Password Protection Gate State
  const [isPasswordVerified, setIsPasswordVerified] = React.useState<boolean>(
    !Boolean(form.settings?.password_hash)
  )
  const [passwordInput, setPasswordInput] = React.useState("")
  const [passwordError, setPasswordError] = React.useState<string | null>(null)
  const [isVerifyingPassword, setIsVerifyingPassword] = React.useState(false)

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Record<string, any>>({
    mode: "onChange",
    defaultValues: questions.reduce((acc, q) => {
      acc[q.id] = q.type === "checkbox" ? [] : ""
      return acc
    }, {} as Record<string, any>),
  })

  const answers = watch()

  // Clear answers of questions that become hidden after previously being visible/answered
  React.useEffect(() => {
    questions.forEach((q) => {
      const visible = evaluateRules(q, answers)
      if (!visible) {
        const currentVal = answers[q.id]
        const emptyVal = q.type === "checkbox" ? [] : ""
        const isAnswered = Array.isArray(currentVal)
          ? currentVal.length > 0
          : currentVal !== "" && currentVal !== undefined && currentVal !== null
        if (isAnswered) {
          setValue(q.id, emptyVal, { shouldValidate: true })
        }
      }
    })
  }, [answers, questions, setValue])

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordInput) return
    setIsVerifyingPassword(true)
    setPasswordError(null)
    try {
      const res = await fetch(`/api/forms/${form.slug || form.id}/verify-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Incorrect password")
      }
      setIsPasswordVerified(true)
    } catch (err: any) {
      setPasswordError(err.message || "Incorrect password")
    } finally {
      setIsVerifyingPassword(false)
    }
  }

  if (!isPasswordVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full p-8 space-y-6 border-border shadow-lg text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Password Protected</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              This form requires a password to view and submit answers.
            </p>
          </div>

          <form onSubmit={handleVerifyPassword} className="space-y-4 text-left">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Form Password</Label>
              <Input
                type="password"
                placeholder="Enter password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value)
                  setPasswordError(null)
                }}
                required
                className="w-full"
              />
              {passwordError && (
                <p className="text-xs text-destructive font-medium pt-1">
                  {passwordError}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isVerifyingPassword}
              className="w-full font-semibold"
            >
              {isVerifyingPassword && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Unlock Form
            </Button>
          </form>
        </Card>
      </div>
    )
  }

  const onSubmit = async (data: Record<string, any>) => {
    // Filter out answers for hidden questions
    const visibleAnswers: Record<string, any> = {}
    questions.forEach((q) => {
      if (evaluateRules(q, data)) {
        visibleAnswers[q.id] = data[q.id]
      }
    })

    console.log("SUBMITTING FORM ANSWERS:", visibleAnswers)
    setSubmitError(null)
    try {
      console.log("POSTing payload to:", `/api/forms/${form.slug || form.id}/submit`, { answers: visibleAnswers })
      const res = await fetch(`/api/forms/${form.slug || form.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: visibleAnswers }),
      })

      console.log("RESPONSE STATUS:", res.status)
      const resData = await res.json().catch(() => ({}))
      console.log("RESPONSE BODY:", resData)

      if (!res.ok) {
        throw new Error(resData.error || "Failed to submit response")
      }

      setSubmitted(true)
    } catch (err: any) {
      console.error("Submission error:", err)
      setSubmitError(err.message || "Something went wrong. Please try again.")
    }
  }

  const onError = (formErrors: any) => {
    console.log("FORM VALIDATION FAILED ON SUBMIT. ERRORS:", formErrors)
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
        <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">

          {questions.map((question) => {
            if (!evaluateRules(question, answers)) {
              return null
            }

            return (
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
                </div>

                {/* Input field based on type */}
                <div>
                  <Controller
                    name={question.id}
                    control={control}
                    rules={{
                      validate: (value) => {
                        if (!evaluateRules(question, answers)) {
                          return true
                        }
                        switch (question.type) {
                        case "short_text":
                        case "long_text": {
                          const strVal = typeof value === "string" ? value.trim() : ""
                          const rawLen = typeof value === "string" ? value.length : 0

                          if (question.required && !strVal) {
                            return "This question is required"
                          }

                          const minChars =
                            question.settings?.minChars ??
                            question.settings?.min_chars
                          if (
                            minChars &&
                            typeof minChars === "number" &&
                            minChars > 0 &&
                            rawLen < minChars
                          ) {
                            return `Minimum ${minChars} characters required`
                          }

                          const maxChars =
                            question.settings?.maxChars ??
                            question.settings?.maxCharacterCount ??
                            question.settings?.max_chars
                          if (
                            maxChars &&
                            typeof maxChars === "number" &&
                            maxChars > 0 &&
                            rawLen > maxChars
                          ) {
                            return `Maximum ${maxChars} characters allowed`
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
                      case "short_text": {
                        const maxChars =
                          question.settings?.maxChars ??
                          question.settings?.maxCharacterCount ??
                          question.settings?.max_chars
                        const val = typeof field.value === "string" ? field.value : ""
                        const charCount = val.length
                        const hasMaxChars = typeof maxChars === "number" && maxChars > 0
                        const isMaxCharsLimit = hasMaxChars && charCount >= maxChars

                        return (
                          <div className="space-y-1.5">
                            <Input
                              {...field}
                              value={val}
                              maxLength={hasMaxChars ? maxChars : undefined}
                              onChange={(e) => {
                                let newValue = e.target.value
                                if (hasMaxChars && newValue.length > maxChars) {
                                  newValue = newValue.slice(0, maxChars)
                                }
                                field.onChange(newValue)
                              }}
                              placeholder={question.settings?.placeholder || "Your answer"}
                              className="w-full"
                            />
                            {hasMaxChars && (
                              <div className="flex justify-end text-xs">
                                <span
                                  className={
                                    isMaxCharsLimit
                                      ? "text-destructive font-medium"
                                      : "text-muted-foreground"
                                  }
                                >
                                  {charCount} / {maxChars}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      }

                      case "long_text": {
                        const maxChars =
                          question.settings?.maxChars ??
                          question.settings?.maxCharacterCount ??
                          question.settings?.max_chars
                        const val = typeof field.value === "string" ? field.value : ""
                        const charCount = val.length
                        const hasMaxChars = typeof maxChars === "number" && maxChars > 0
                        const isMaxCharsLimit = hasMaxChars && charCount >= maxChars

                        return (
                          <div className="space-y-1.5">
                            <Textarea
                              {...field}
                              value={val}
                              maxLength={hasMaxChars ? maxChars : undefined}
                              onChange={(e) => {
                                let newValue = e.target.value
                                if (hasMaxChars && newValue.length > maxChars) {
                                  newValue = newValue.slice(0, maxChars)
                                }
                                field.onChange(newValue)
                              }}
                              placeholder={question.settings?.placeholder || "Your answer"}
                              rows={4}
                              className="w-full resize-y"
                            />
                            {hasMaxChars && (
                              <div className="flex justify-end text-xs">
                                <span
                                  className={
                                    isMaxCharsLimit
                                      ? "text-destructive font-medium"
                                      : "text-muted-foreground"
                                  }
                                >
                                  {charCount} / {maxChars}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      }




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
          )})}

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
