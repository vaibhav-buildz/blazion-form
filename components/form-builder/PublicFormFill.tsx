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
import Link from "next/link"
import { createClient } from "@/lib/supabase"
import { CheckCircle2, Loader2, Lock, Upload, FileText, Trash2, Mail } from "lucide-react"
import { z } from "zod"

import { type QuestionRule } from "./QuestionCard"

function formatBytes(bytes: number, decimals = 1) {
  if (!bytes || bytes === 0) return "0 Bytes"
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

interface FileUploadFieldProps {
  formId: string
  question: Question
  field: any
}

function FileUploadField({ formId, question, field }: FileUploadFieldProps) {
  const [isDragging, setIsDragging] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const [fileDetails, setFileDetails] = React.useState<{ name: string; size: number } | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const allowedTypes: string[] = question.settings?.allowedTypes || ["image/*", "application/pdf", ".doc/.docx"]
  const maxSizeMB: number = question.settings?.maxSizeMB ?? 5

  const acceptString = React.useMemo(() => {
    return allowedTypes
      .map((t) => (t === ".doc/.docx" ? ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" : t))
      .join(",")
  }, [allowedTypes])

  const typeLabelsMap: Record<string, string> = {
    "image/*": "Image",
    "application/pdf": "PDF",
    ".doc/.docx": "Document",
  }
  const allowedNames = allowedTypes.map((t) => typeLabelsMap[t] || t).join(", ")

  const validateFile = (file: File): string | null => {
    const maxBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxBytes) {
      return `File size exceeds max limit of ${maxSizeMB}MB`
    }

    if (allowedTypes.length > 0) {
      const fileNameLower = file.name.toLowerCase()
      const isAllowed = allowedTypes.some((t) => {
        if (t === "image/*") return file.type.startsWith("image/")
        if (t === "application/pdf") return file.type === "application/pdf" || fileNameLower.endsWith(".pdf")
        if (t === ".doc/.docx") return fileNameLower.endsWith(".doc") || fileNameLower.endsWith(".docx") || file.type.includes("word") || file.type.includes("document")
        return true
      })

      if (!isAllowed) {
        return `Invalid file type. Allowed: ${allowedNames}`
      }
    }

    return null
  }

  const handleUpload = async (file: File) => {
    setUploadError(null)
    const err = validateFile(file)
    if (err) {
      setUploadError(err)
      return
    }

    setIsUploading(true)
    try {
      const timestamp = Date.now()
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
      const storagePath = `${formId}/${timestamp}-${sanitizedName}`

      const supabase = createClient()
      const { error: uploadErr } = await supabase.storage
        .from("response-files")
        .upload(storagePath, file, { cacheControl: "3600", upsert: true })

      if (uploadErr) {
        throw new Error(uploadErr.message || "Upload failed")
      }

      setFileDetails({ name: file.name, size: file.size })
      field.onChange(storagePath)
    } catch (error: any) {
      console.error("Storage upload error:", error)
      setUploadError(error.message || "Failed to upload file. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleUpload(file)
    }
  }

  const handleRemove = () => {
    field.onChange("")
    setFileDetails(null)
    setUploadError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const storedPath = field.value
  const hasFile = Boolean(storedPath)

  if (hasFile) {
    const displayName = fileDetails?.name || storedPath.split("/").pop()?.replace(/^\d+-/, "") || "Uploaded File"
    return (
      <div className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-card shadow-sm">
        <div className="flex items-center space-x-3 truncate">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div className="truncate">
            <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
            {fileDetails && (
              <p className="text-xs text-muted-foreground">{formatBytes(fileDetails.size)}</p>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRemove}
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 ml-2"
        >
          <Trash2 className="h-4 w-4 mr-1" /> Remove
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-accent/40 bg-muted/20"
        } ${isUploading ? "opacity-60 pointer-events-none" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptString}
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center justify-center space-y-2 py-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">Uploading file...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-1">
              <Upload className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-foreground">
              <span className="text-primary underline font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">
              {allowedNames ? `${allowedNames} ` : ""}up to {maxSizeMB}MB
            </p>
          </div>
        )}
      </div>

      {uploadError && (
        <p className="text-xs font-medium text-destructive">{uploadError}</p>
      )}
    </div>
  )
}

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

export interface FormSection {
  header?: Question
  questions: Question[]
}

export function parseSections(questions: Question[]): FormSection[] {
  const sections: FormSection[] = []
  let currentSection: FormSection = { questions: [] }

  for (const q of questions) {
    if (q.type === "section_break") {
      if (currentSection.header || currentSection.questions.length > 0) {
        sections.push(currentSection)
      }
      currentSection = { header: q, questions: [] }
    } else {
      currentSection.questions.push(q)
    }
  }

  if (currentSection.header || currentSection.questions.length > 0 || sections.length === 0) {
    sections.push(currentSection)
  }

  return sections
}

export function validateQuestion(question: Question, answers: Record<string, any>): string | null {
  if (question.type === "section_break" || !evaluateRules(question, answers)) {
    return null
  }

  // Non-required questions MUST NEVER fail validation or block navigation/submission
  if (!question.required) {
    return null
  }

  const value = answers[question.id]

  switch (question.type) {
    case "short_text":
    case "long_text": {
      const strVal = typeof value === "string" ? value.trim() : ""
      const rawLen = typeof value === "string" ? value.length : 0

      if (!strVal) {
        return "This question is required"
      }

      const minChars = question.settings?.minChars ?? question.settings?.min_chars
      if (minChars && typeof minChars === "number" && minChars > 0 && rawLen < minChars) {
        return `Minimum ${minChars} characters required`
      }

      const maxChars =
        question.settings?.maxChars ??
        question.settings?.maxCharacterCount ??
        question.settings?.max_chars
      if (maxChars && typeof maxChars === "number" && maxChars > 0 && rawLen > maxChars) {
        return `Maximum ${maxChars} characters allowed`
      }

      return null
    }

    case "multiple_choice":
    case "dropdown": {
      const strVal = typeof value === "string" ? value.trim() : ""
      if (!strVal) {
        return "Please select an option"
      }
      return null
    }

    case "checkbox": {
      const arr = Array.isArray(value) ? value : []
      const min = question.settings?.minSelect
      const max = question.settings?.maxSelect

      const requiredMin = min && typeof min === "number" && min > 0 ? min : 1
      if (arr.length < requiredMin) {
        return requiredMin === 1
          ? "Please select at least 1 option"
          : `Please select at least ${requiredMin} options`
      }

      if (max && typeof max === "number" && max > 0 && arr.length > max) {
        return `Please select at most ${max} options`
      }

      return null
    }

    case "file_upload": {
      if (!value || typeof value !== "string" || !value.trim()) {
        return "This question is required"
      }
      return null
    }

    default: {
      if (!value || (typeof value === "string" && !value.trim())) {
        return "This question is required"
      }
      return null
    }
  }
}

export function PublicFormFill({ form, questions }: PublicFormFillProps) {
  const [submitted, setSubmitted] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [currentSectionIndex, setCurrentSectionIndex] = React.useState(0)

  // Email Verification Mode
  const verificationMode: "none" | "login" | "otp" =
    form.settings?.email_verification_mode ||
    (form.settings?.collect_email ? "otp" : "none")

  // Collect Email State
  const [respondentEmail, setRespondentEmail] = React.useState("")
  const [respondentEmailError, setRespondentEmailError] = React.useState<string | null>(null)

  // Mode 'login' State
  const [userEmail, setUserEmail] = React.useState<string | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = React.useState<boolean>(verificationMode === "login")

  // Mode 'otp' State
  const [otpEmailInput, setOtpEmailInput] = React.useState("")
  const [otpCodeInput, setOtpCodeInput] = React.useState("")
  const [isOtpSent, setIsOtpSent] = React.useState(false)
  const [isOtpSending, setIsOtpSending] = React.useState(false)
  const [isOtpVerifying, setIsOtpVerifying] = React.useState(false)
  const [isOtpVerified, setIsOtpVerified] = React.useState(false)
  const [otpVerifiedEmail, setOtpVerifiedEmail] = React.useState("")
  const [otpError, setOtpError] = React.useState<string | null>(null)
  const [otpSuccessMsg, setOtpSuccessMsg] = React.useState<string | null>(null)

  const sections = React.useMemo(() => parseSections(questions), [questions])
  const totalSections = sections.length
  const safeSectionIndex = Math.min(currentSectionIndex, Math.max(0, totalSections - 1))
  const currentSection = sections[safeSectionIndex] || { questions: [] }

  // Password Protection Gate State
  const [isPasswordVerified, setIsPasswordVerified] = React.useState<boolean>(
    !Boolean(form.settings?.password_hash)
  )
  const [passwordInput, setPasswordInput] = React.useState("")
  const [passwordError, setPasswordError] = React.useState<string | null>(null)
  const [isVerifyingPassword, setIsVerifyingPassword] = React.useState(false)

  // Check Supabase session client-side on mount for mode 'login' (and pre-fill fallback)
  React.useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (session?.user?.email) {
          setUserEmail(session.user.email)
          setRespondentEmail(session.user.email)
        } else {
          setUserEmail(null)
        }
      } catch (err) {
        console.error("Error fetching session user:", err)
        setUserEmail(null)
      } finally {
        setIsCheckingAuth(false)
      }
    }
    checkAuth()
  }, [verificationMode])

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const cleanEmail = otpEmailInput.trim()
    if (!cleanEmail) {
      setOtpError("Please enter your email address")
      return
    }
    const result = z.string().email().safeParse(cleanEmail)
    if (!result.success) {
      setOtpError("Please enter a valid email address")
      return
    }
    setIsOtpSending(true)
    setOtpError(null)
    setOtpSuccessMsg(null)
    try {
      const res = await fetch(`/api/forms/${form.slug || form.id}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Failed to send verification code")
      }
      setIsOtpSent(true)
      setOtpSuccessMsg(`Verification code sent to ${cleanEmail}`)
    } catch (err: any) {
      setOtpError(err.message || "Failed to send verification code")
    } finally {
      setIsOtpSending(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanCode = otpCodeInput.trim()
    if (!cleanCode) {
      setOtpError("Please enter the 6-digit verification code")
      return
    }
    setIsOtpVerifying(true)
    setOtpError(null)
    try {
      const res = await fetch(`/api/forms/${form.slug || form.id}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmailInput.trim(), code: cleanCode }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Invalid verification code")
      }
      setIsOtpVerified(true)
      setOtpVerifiedEmail(otpEmailInput.trim())
      setRespondentEmail(otpEmailInput.trim())
    } catch (err: any) {
      setOtpError(err.message || "Invalid or expired code")
    } finally {
      setIsOtpVerifying(false)
    }
  }

  const validateRespondentEmail = (emailStr: string): string | null => {
    if (!form.settings?.collect_email) return null
    const trimmed = (emailStr || "").trim()
    if (!trimmed) {
      return "Email address is required"
    }
    const result = z.string().email().safeParse(trimmed)
    if (!result.success) {
      return "Please enter a valid email address"
    }
    return null
  }

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<Record<string, any>>({
    mode: "onChange",
    defaultValues: questions.reduce((acc, q) => {
      if (q.type !== "section_break") {
        acc[q.id] = q.type === "checkbox" ? [] : ""
      }
      return acc
    }, {} as Record<string, any>),
  })

  const answers = watch()

  const handleNextSection = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    const currentAnswers = watch()
    let hasSectionError = false

    if (safeSectionIndex === 0 && form.settings?.collect_email) {
      const emailErr = validateRespondentEmail(respondentEmail)
      if (emailErr) {
        setRespondentEmailError(emailErr)
        hasSectionError = true
      } else {
        setRespondentEmailError(null)
      }
    }

    const visibleQuestionsInCurrentSection = currentSection.questions.filter((q) =>
      evaluateRules(q, currentAnswers)
    )

    visibleQuestionsInCurrentSection.forEach((q) => {
      const err = validateQuestion(q, currentAnswers)
      if (err) {
        setError(q.id, { type: "manual", message: err })
        hasSectionError = true
      } else {
        clearErrors(q.id)
      }
    })

    if (!hasSectionError) {
      setCurrentSectionIndex((prev) => Math.min(totalSections - 1, prev + 1))
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" })
      }
    }
  }

  const handlePrevSection = () => {
    setCurrentSectionIndex((prev) => Math.max(0, prev - 1))
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

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
    if (safeSectionIndex < totalSections - 1) {
      return
    }

    let firstErrorSectionIndex = -1
    let hasAnyError = false

    if (form.settings?.collect_email) {
      const emailErr = validateRespondentEmail(respondentEmail)
      if (emailErr) {
        setRespondentEmailError(emailErr)
        hasAnyError = true
        firstErrorSectionIndex = 0
      } else {
        setRespondentEmailError(null)
      }
    }

    questions.forEach((q) => {
      if (q.type !== "section_break" && evaluateRules(q, data)) {
        const err = validateQuestion(q, data)
        if (err) {
          setError(q.id, { type: "manual", message: err })
          hasAnyError = true
          if (firstErrorSectionIndex === -1) {
            const secIdx = sections.findIndex((sec) =>
              sec.questions.some((item) => item.id === q.id)
            )
            if (secIdx !== -1) {
              firstErrorSectionIndex = secIdx
            }
          }
        }
      }
    })

    if (hasAnyError) {
      if (firstErrorSectionIndex !== -1) {
        setCurrentSectionIndex(firstErrorSectionIndex)
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" })
        }
      }
      return
    }

    // Filter out answers for hidden questions or section_break items
    const visibleAnswers: Record<string, any> = {}
    questions.forEach((q) => {
      if (q.type !== "section_break" && evaluateRules(q, data)) {
        visibleAnswers[q.id] = data[q.id]
      }
    })

    const payload: Record<string, any> = { answers: visibleAnswers }
    if (verificationMode === "login" && userEmail) {
      payload.respondent_email = userEmail
    } else if (verificationMode === "otp" && otpVerifiedEmail) {
      payload.respondent_email = otpVerifiedEmail
    } else if (form.settings?.collect_email && respondentEmail) {
      payload.respondent_email = respondentEmail.trim()
    }

    console.log("SUBMITTING FORM ANSWERS:", payload)
    setSubmitError(null)
    try {
      console.log("POSTing payload to:", `/api/forms/${form.slug || form.id}/submit`, payload)
      const res = await fetch(`/api/forms/${form.slug || form.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
    const firstErrorQuestionId = Object.keys(formErrors)[0]
    if (firstErrorQuestionId) {
      const errorSectionIdx = sections.findIndex((sec) =>
        sec.questions.some((q) => q.id === firstErrorQuestionId)
      )
      if (errorSectionIdx !== -1 && errorSectionIdx !== safeSectionIndex) {
        setCurrentSectionIndex(errorSectionIdx)
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" })
        }
      }
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
        {/* Multi-step Progress Bar */}
        {totalSections > 1 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Step {safeSectionIndex + 1} of {totalSections}</span>
              <span>{Math.round(((safeSectionIndex + 1) / totalSections) * 100)}% Completed</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 ease-in-out"
                style={{ width: `${((safeSectionIndex + 1) / totalSections) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Form Title & Description Header Card */}
        <Card className="p-8 border-border shadow-sm space-y-3">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            {form.title}
          </h1>
          {form.description && (
            <p className="text-muted-foreground leading-relaxed text-sm">
              {form.description}
            </p>
          )}

          {/* Verified Badges */}
          {verificationMode === "login" && userEmail && (
            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Verified as: <strong className="font-semibold">{userEmail}</strong> ✓</span>
              </div>
            </div>
          )}

          {verificationMode === "otp" && isOtpVerified && (
            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Verified email: <strong className="font-semibold">{otpVerifiedEmail}</strong> ✓</span>
              </div>
            </div>
          )}
        </Card>

        {/* Loading Spinner for Auth Check */}
        {verificationMode === "login" && isCheckingAuth && (
          <div className="flex items-center justify-center p-8 space-x-2 text-muted-foreground text-sm">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Checking account status...</span>
          </div>
        )}

        {/* MODE 'login' Gate: Unauthenticated User */}
        {verificationMode === "login" && !isCheckingAuth && !userEmail && (
          <Card className="p-8 border-border shadow-sm text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Lock className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-foreground">Please log in to respond to this form</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                This form requires respondents to be logged into a Blazion Form account to verify their identity.
              </p>
            </div>
            <div className="pt-2">
              <Button asChild className="px-6 font-semibold">
                <Link
                  href={`/login?returnTo=${encodeURIComponent(
                    typeof window !== "undefined"
                      ? window.location.pathname + window.location.search
                      : ""
                  )}`}
                >
                  Log in
                </Link>
              </Button>
            </div>
          </Card>
        )}

        {/* MODE 'otp' Gate: Unverified Email */}
        {verificationMode === "otp" && !isOtpVerified && (
          <Card className="p-6 border-border shadow-sm space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" /> Email Verification Required
              </h3>
              <p className="text-xs text-muted-foreground">
                Please verify your email address to unlock and respond to this form.
              </p>
            </div>

            {!isOtpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="otp-email-input" className="text-xs font-semibold">
                    Your Email Address
                  </Label>
                  <Input
                    id="otp-email-input"
                    type="email"
                    placeholder="name@example.com"
                    value={otpEmailInput}
                    onChange={(e) => {
                      setOtpEmailInput(e.target.value)
                      setOtpError(null)
                    }}
                    required
                  />
                </div>
                {otpError && <p className="text-xs font-medium text-destructive">{otpError}</p>}
                <Button type="submit" size="sm" disabled={isOtpSending} className="w-full sm:w-auto font-semibold">
                  {isOtpSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Code
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="otp-code-input" className="text-xs font-semibold">
                      Enter 6-Digit Code
                    </Label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsOtpSent(false)
                        setOtpError(null)
                        setOtpSuccessMsg(null)
                      }}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Change email ({otpEmailInput})
                    </button>
                  </div>
                  <Input
                    id="otp-code-input"
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCodeInput}
                    onChange={(e) => {
                      setOtpCodeInput(e.target.value)
                      setOtpError(null)
                    }}
                    className="text-center font-mono tracking-widest text-lg"
                    required
                  />
                </div>
                {otpSuccessMsg && (
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {otpSuccessMsg}
                  </p>
                )}
                {otpError && <p className="text-xs font-medium text-destructive">{otpError}</p>}
                <div className="flex gap-2 pt-1">
                  <Button type="submit" size="sm" disabled={isOtpVerifying} className="flex-1 sm:flex-none font-semibold">
                    {isOtpVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verify Code
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendOtp()}
                    disabled={isOtpSending}
                  >
                    Resend Code
                  </Button>
                </div>
              </form>
            )}
          </Card>
        )}

        {/* Questions Form — Only visible when email requirement is satisfied */}
        {((verificationMode === "none") ||
          (verificationMode === "login" && userEmail) ||
          (verificationMode === "otp" && isOtpVerified)) && (
          <>
            {/* Section Header Card (if section break header exists for current section) */}
            {currentSection.header && (
              <Card className="p-6 border-border shadow-sm bg-card space-y-2 border-l-4 border-l-primary">
                <h2 className="text-xl font-bold text-foreground">
                  {currentSection.header.title || "Untitled Section"}
                </h2>
                {currentSection.header.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {currentSection.header.description}
                  </p>
                )}
              </Card>
            )}

            {/* Questions Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (safeSectionIndex < totalSections - 1) {
                  return
                }
                handleSubmit(onSubmit, onError)(e)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && safeSectionIndex < totalSections - 1) {
                  const target = e.target as HTMLElement
                  if (target.tagName !== "TEXTAREA") {
                    e.preventDefault()
                    handleNextSection()
                  }
                }
              }}
              className="space-y-6"
            >

          {/* Respondent Email Field (when collect_email setting is enabled) */}
          {form.settings?.collect_email && safeSectionIndex === 0 && (
            <Card className="p-6 border-border shadow-sm space-y-3">
              <div>
                <Label htmlFor="respondent-email" className="text-base font-semibold text-foreground flex items-center gap-1">
                  <span>Your email</span>
                  <span className="text-destructive font-bold" title="Required">*</span>
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  We&apos;ll send you a copy of your response
                </p>
              </div>
              <Input
                id="respondent-email"
                type="email"
                value={respondentEmail}
                onChange={(e) => {
                  setRespondentEmail(e.target.value)
                  if (respondentEmailError) setRespondentEmailError(null)
                }}
                placeholder="name@example.com"
                className="w-full"
              />
              {respondentEmailError && (
                <p className="text-xs text-destructive font-medium">
                  {respondentEmailError}
                </p>
              )}
            </Card>
          )}

          {currentSection.questions.map((question) => {
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
                      validate: (val) => {
                        const err = validateQuestion(question, { ...answers, [question.id]: val })
                        return err || true
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

                      case "file_upload":
                        return (
                          <FileUploadField
                            formId={form.id}
                            question={question}
                            field={field}
                          />
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

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4">
            {safeSectionIndex > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handlePrevSection}
                className="px-6 font-semibold"
              >
                Previous
              </Button>
            ) : (
              <div />
            )}

            {safeSectionIndex < totalSections - 1 ? (
              <Button
                type="button"
                size="lg"
                onClick={handleNextSection}
                className="px-8 font-semibold"
              >
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                size="lg"
                className="px-8 font-semibold"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit
              </Button>
            )}
          </div>
        </form>
      </>
    )}
  </div>
</div>
  )
}
