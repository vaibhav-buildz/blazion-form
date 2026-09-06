"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Clock, Lock, ShieldAlert, Loader2, Mail, AtSign, Sparkles, Webhook, Award, CheckSquare, Plus, Trash2 } from "lucide-react"



interface FormSettingsDialogProps {
  form: {
    id: string
    settings?: Record<string, any>
  }
  open: boolean
  onOpenChange: (open: boolean) => void
  onSettingsSaved?: (newSettings: Record<string, any>) => void
}

export function FormSettingsDialog({
  form,
  open,
  onOpenChange,
  onSettingsSaved,
}: FormSettingsDialogProps) {
  // Local Draft State
  const [expiresAt, setExpiresAt] = React.useState<string | null>(null)
  const [dateStr, setDateStr] = React.useState<string>("")
  const [timeStr, setTimeStr] = React.useState<string>("18:00")
  const [responseLimit, setResponseLimit] = React.useState<string>("")
  const [enablePassword, setEnablePassword] = React.useState<boolean>(false)
  const [passwordInput, setPasswordInput] = React.useState<string>("")
  const [notifyOnResponse, setNotifyOnResponse] = React.useState<boolean>(true)
  const [emailVerificationMode, setEmailVerificationMode] = React.useState<
    "none" | "login" | "otp"
  >("none")

  // Batch A & C & D settings
  const [aiPersonaPrompt, setAiPersonaPrompt] = React.useState<string>("")
  const [webhookUrl, setWebhookUrl] = React.useState<string>("")
  const [webhookSecret, setWebhookSecret] = React.useState<string>("")
  const [certificateEnabled, setCertificateEnabled] = React.useState<boolean>(false)
  const [certificateTemplate, setCertificateTemplate] = React.useState<string>("")
  const [approvalEnabled, setApprovalEnabled] = React.useState<boolean>(false)
  const [approvalStages, setApprovalStages] = React.useState<{ stage: number; approverEmail: string }[]>([
    { stage: 1, approverEmail: "" },
  ])

  const [isSaving, setIsSaving] = React.useState(false)
  const [saveSuccess, setSaveSuccess] = React.useState(false)


  const hasExistingHash = Boolean(form.settings?.password_hash)

  const getInitialMode = (settings: Record<string, any>): "none" | "login" | "otp" => {
    if (
      settings.email_verification_mode === "login" ||
      settings.email_verification_mode === "otp" ||
      settings.email_verification_mode === "none"
    ) {
      return settings.email_verification_mode
    }
    if (settings.collect_email) return "otp"
    return "none"
  }

  // Initialize draft state ONLY when the dialog opens
  React.useEffect(() => {
    if (open) {
      const settings = form.settings || {}
      console.log("[FormSettingsDialog] Syncing draft state from form.settings:", settings)
      setExpiresAt(settings.expires_at || null)

      if (settings.expires_at) {
        const d = new Date(settings.expires_at)
        if (!isNaN(d.getTime())) {
          setDateStr(d.toISOString().split("T")[0])
          const hh = String(d.getHours()).padStart(2, "0")
          const mm = String(d.getMinutes()).padStart(2, "0")
          setTimeStr(`${hh}:${mm}`)
        }
      } else {
        setDateStr("")
        setTimeStr("18:00")
      }

      setResponseLimit(
        settings.response_limit !== undefined && settings.response_limit !== null
          ? String(settings.response_limit)
          : ""
      )

      setEnablePassword(Boolean(settings.password_hash))
      setPasswordInput("")
      setNotifyOnResponse(settings.notify_on_response !== false)
      const mode = getInitialMode(settings)
      console.log("[FormSettingsDialog] Resolved initial emailVerificationMode:", mode)
      setEmailVerificationMode(mode)

      setAiPersonaPrompt(settings.aiPersonaPrompt || "")
      setWebhookUrl(settings.webhookUrl || "")
      setWebhookSecret(settings.webhookSecret || "")
      setCertificateEnabled(Boolean(settings.certificateEnabled))
      setCertificateTemplate(settings.certificateTemplate || "")
      setApprovalEnabled(Boolean(settings.approvalWorkflow?.enabled))
      setApprovalStages(
        settings.approvalWorkflow?.stages?.length > 0
          ? settings.approvalWorkflow.stages
          : [{ stage: 1, approverEmail: "" }]
      )

      setSaveSuccess(false)
    }
  }, [open, form.settings])

  const handleClearExpiry = () => {
    setExpiresAt(null)
    setDateStr("")
    setTimeStr("18:00")
  }

  const formatExpiryDisplay = (isoString: string | null): string => {
    if (!isoString) return ""
    try {
      const d = new Date(isoString)
      if (isNaN(d.getTime())) return ""
      return d.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    } catch {
      return ""
    }
  }

  // Explicit Save Handler — ONLY triggered when user clicks "Done"
  const handleDone = async () => {
    setIsSaving(true)
    setSaveSuccess(false)
    try {
      let finalExpiresAt: string | null = null
      if (dateStr) {
        const d = new Date(`${dateStr}T${timeStr || "00:00"}:00`)
        if (!isNaN(d.getTime())) {
          finalExpiresAt = d.toISOString()
        }
      }

      const limitNum = responseLimit.trim() ? parseInt(responseLimit.trim(), 10) : null

      const payloadSettings: Record<string, any> = {
        expires_at: finalExpiresAt,
        response_limit: limitNum && !isNaN(limitNum) && limitNum > 0 ? limitNum : null,
        notify_on_response: notifyOnResponse,
        email_verification_mode: emailVerificationMode,
        collect_email: emailVerificationMode !== "none",
        aiPersonaPrompt: aiPersonaPrompt.trim() || null,
        webhookUrl: webhookUrl.trim() || null,
        webhookSecret: webhookSecret.trim() || null,
        certificateEnabled,
        certificateTemplate: certificateTemplate.trim() || null,
        approvalWorkflow: {
          enabled: approvalEnabled,
          stages: approvalStages.filter((s) => s.approverEmail?.trim()),
        },
      }


      if (enablePassword) {
        if (passwordInput.trim()) {
          payloadSettings.password = passwordInput.trim()
        }
      } else {
        payloadSettings.clear_password = true
      }

      console.log("[FormSettingsDialog handleDone] Sending payloadSettings:", payloadSettings)

      const res = await fetch(`/api/forms/${form.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: payloadSettings }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to save form settings")
      }

      const updatedForm = await res.json()
      console.log("[FormSettingsDialog handleDone] PATCH response updatedForm:", updatedForm)

      if (onSettingsSaved) {
        onSettingsSaved(updatedForm.settings || {})
      }

      setSaveSuccess(true)
      setTimeout(() => {
        onOpenChange(false)
      }, 300)
    } catch (err: any) {
      console.error("Save settings error:", err)
      alert(err.message || "Failed to save form settings")
    } finally {
      setIsSaving(false)
    }
  }

  const currentExpiryIso = dateStr
    ? (() => {
        const d = new Date(`${dateStr}T${timeStr || "00:00"}:00`)
        return !isNaN(d.getTime()) ? d.toISOString() : null
      })()
    : expiresAt

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border shrink-0 text-left">
          <DialogTitle className="text-xl font-bold">Form Settings</DialogTitle>
          <DialogDescription>
            Configure optional access rules, expiry date, response limits, and email collection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 p-6 overflow-y-auto flex-1">
          {/* A) Form Expiry */}
          <div className="space-y-3 border-b border-border pb-4">
            <div className="flex items-center justify-between">
              <Label className="font-semibold text-sm flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted-foreground" /> Form Expiry
              </Label>
              {currentExpiryIso && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearExpiry}
                  className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  Clear Expiry
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Expiry Date</Label>
                <Input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Expiry Time</Label>
                <Input
                  type="time"
                  value={timeStr}
                  onChange={(e) => setTimeStr(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {currentExpiryIso && (
              <p className="text-xs font-medium text-primary bg-primary/10 p-2 rounded border border-primary/20">
                Expires: {formatExpiryDisplay(currentExpiryIso)}
              </p>
            )}
          </div>

          {/* B) Response Limit */}
          <div className="space-y-2 border-b border-border pb-4">
            <Label className="font-semibold text-sm flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" /> Response Limit
            </Label>
            <p className="text-xs text-muted-foreground">
              Automatically stop accepting responses once this total count is reached.
            </p>
            <Input
              type="number"
              min={1}
              placeholder="e.g. 100 (Leave blank for unlimited)"
              value={responseLimit}
              onChange={(e) => setResponseLimit(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          {/* C) Password Protection */}
          <div className="space-y-3 border-b border-border pb-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="password-toggle"
                checked={enablePassword}
                onCheckedChange={(checked) => setEnablePassword(Boolean(checked))}
              />
              <Label
                htmlFor="password-toggle"
                className="text-sm font-semibold cursor-pointer flex items-center gap-1.5"
              >
                <Lock className="h-4 w-4 text-muted-foreground" /> Require a password to view this form
              </Label>
            </div>

            {enablePassword && (
              <div className="pl-6 space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {hasExistingHash
                    ? "Enter new password to change (leave blank to keep existing password):"
                    : "Set password:"}
                </Label>
                <PasswordInput
                  placeholder="Enter access password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="h-9 text-xs"
                />
                {hasExistingHash && !passwordInput && (
                  <p className="text-xs text-success font-medium">
                    Password protection is currently enabled.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* D) Email Notifications */}
          <div className="space-y-3 border-b border-border pb-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notify-email-toggle"
                checked={notifyOnResponse}
                onCheckedChange={(checked) => setNotifyOnResponse(Boolean(checked))}
              />
              <Label
                htmlFor="notify-email-toggle"
                className="text-sm font-semibold cursor-pointer flex items-center gap-1.5"
              >
                <Mail className="h-4 w-4 text-muted-foreground" /> Notify me by email when someone responds
              </Label>
            </div>
            <p className="pl-6 text-xs text-muted-foreground">
              Receive an email summary whenever a respondent submits this form.
            </p>
          </div>

          {/* E) Email Verification for Respondents */}
          <div className="space-y-3">
            <Label className="font-semibold text-sm flex items-center gap-1.5">
              <AtSign className="h-4 w-4 text-muted-foreground" /> Email verification for respondents
            </Label>
            <RadioGroup
              value={emailVerificationMode}
              onValueChange={(val) => setEmailVerificationMode(val as "none" | "login" | "otp")}
              className="space-y-2 pt-1"
            >
              <div
                className="flex items-start space-x-3 rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => setEmailVerificationMode("none")}
              >
                <RadioGroupItem value="none" id="verify-none" className="mt-0.5" />
                <div className="space-y-0.5">
                  <Label htmlFor="verify-none" className="text-sm font-medium cursor-pointer">
                    None (Default)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    No email collection or verification required.
                  </p>
                </div>
              </div>

              <div
                className="flex items-start space-x-3 rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => setEmailVerificationMode("login")}
              >
                <RadioGroupItem value="login" id="verify-login" className="mt-0.5" />
                <div className="space-y-0.5">
                  <Label htmlFor="verify-login" className="text-sm font-medium cursor-pointer">
                    Require Blazion login
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Respondent must be logged into a Blazion Form account. Account email is automatically captured and considered verified.
                  </p>
                </div>
              </div>

              <div
                className="flex items-start space-x-3 rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => setEmailVerificationMode("otp")}
              >
                <RadioGroupItem value="otp" id="verify-otp" className="mt-0.5" />
                <div className="space-y-0.5">
                  <Label htmlFor="verify-otp" className="text-sm font-medium cursor-pointer">
                    Verify via OTP
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Respondent enters any email, receives a 6-digit code, and must verify it. No account required.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* 1. AI Persona Report (Batch A #4) */}
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <Label className="text-sm font-semibold">AI Persona Report</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Define a persona prompt (e.g., &quot;Career coach giving feedback on skills&quot;). Gemini will analyze the respondent&apos;s answers and display a personalized AI report on the completion screen.
            </p>
            <Textarea
              rows={2}
              value={aiPersonaPrompt}
              onChange={(e) => setAiPersonaPrompt(e.target.value)}
              placeholder="e.g. You are a senior fitness consultant. Evaluate the user's weekly workout habits and recommend 3 specific improvements."
              className="text-xs resize-none"
            />
          </div>

          {/* 2. Generic Webhook (Batch C #13) */}
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <Webhook className="w-4 h-4 text-blue-500" />
              <Label className="text-sm font-semibold">Generic Webhook</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Blazion Form will send an HTTP POST payload with all answers and metadata to this endpoint whenever a submission occurs.
            </p>
            <div className="space-y-2">
              <Input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-api.com/webhooks/form-response"
                className="text-xs"
              />
              <Input
                type="text"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="Optional Secret Token (sent in X-Blazion-Webhook-Secret)"
                className="text-xs"
              />
            </div>
          </div>

          {/* 3. Auto PDF Certificate (Batch D #19) */}
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <Label htmlFor="enable-cert" className="text-sm font-semibold cursor-pointer">
                  Auto PDF Certificate
                </Label>
              </div>
              <Checkbox
                id="enable-cert"
                checked={certificateEnabled}
                onCheckedChange={(checked) => setCertificateEnabled(!!checked)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Automatically generates and awards an official PDF completion certificate available for instant download.
            </p>
            {certificateEnabled && (
              <Input
                value={certificateTemplate}
                onChange={(e) => setCertificateTemplate(e.target.value)}
                placeholder="e.g. Has successfully completed the National Assessment on"
                className="text-xs"
              />
            )}
          </div>

          {/* 4. Multi-stage Approval Workflow (Batch D #20) */}
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-500" />
                <Label htmlFor="enable-approval" className="text-sm font-semibold cursor-pointer">
                  Multi-Stage Approvals
                </Label>
              </div>
              <Checkbox
                id="enable-approval"
                checked={approvalEnabled}
                onCheckedChange={(checked) => setApprovalEnabled(!!checked)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Submissions require sequential sign-off. Each approver receives an email with 1-click Approve / Reject action buttons.
            </p>
            {approvalEnabled && (
              <div className="space-y-2 pt-1">
                {approvalStages.map((stage, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-16 shrink-0">
                      Stage {stage.stage}:
                    </span>
                    <Input
                      type="email"
                      value={stage.approverEmail}
                      onChange={(e) => {
                        const next = [...approvalStages]
                        next[idx].approverEmail = e.target.value
                        setApprovalStages(next)
                      }}
                      placeholder="approver@company.com"
                      className="text-xs"
                    />
                    {approvalStages.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive shrink-0"
                        onClick={() => {
                          const next = approvalStages
                            .filter((_, i) => i !== idx)
                            .map((s, i) => ({ ...s, stage: i + 1 }))
                          setApprovalStages(next)
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setApprovalStages((prev) => [
                      ...prev,
                      { stage: prev.length + 1, approverEmail: "" },
                    ])
                  }
                  className="w-full text-xs mt-1"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Next Approval Stage
                </Button>
              </div>
            )}
          </div>
        </div>


        <DialogFooter className="p-4 border-t border-border bg-background shrink-0 flex flex-row justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleDone} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {saveSuccess ? "Saved!" : "Done"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
