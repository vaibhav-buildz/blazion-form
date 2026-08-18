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
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Clock, Lock, ShieldAlert, Loader2, Mail, AtSign } from "lucide-react"

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
  const currentSettings = form.settings || {}

  // Expiry state
  const [expiresAt, setExpiresAt] = React.useState<string | null>(
    currentSettings.expires_at || null
  )
  const [dateStr, setDateStr] = React.useState<string>(() => {
    if (currentSettings.expires_at) {
      const d = new Date(currentSettings.expires_at)
      if (!isNaN(d.getTime())) return d.toISOString().split("T")[0]
    }
    return ""
  })
  const [timeStr, setTimeStr] = React.useState<string>(() => {
    if (currentSettings.expires_at) {
      const d = new Date(currentSettings.expires_at)
      if (!isNaN(d.getTime())) {
        const hh = String(d.getHours()).padStart(2, "0")
        const mm = String(d.getMinutes()).padStart(2, "0")
        return `${hh}:${mm}`
      }
    }
    return "18:00"
  })

  // Response Limit state
  const [responseLimit, setResponseLimit] = React.useState<string>(
    currentSettings.response_limit !== undefined && currentSettings.response_limit !== null
      ? String(currentSettings.response_limit)
      : ""
  )

  // Password Protection state
  const hasExistingHash = Boolean(currentSettings.password_hash)
  const [enablePassword, setEnablePassword] = React.useState<boolean>(hasExistingHash)
  const [passwordInput, setPasswordInput] = React.useState<string>("")
  const [isSaving, setIsSaving] = React.useState(false)

  // Email Notification state
  const [notifyOnResponse, setNotifyOnResponse] = React.useState<boolean>(
    currentSettings.notify_on_response !== false
  )

  // Collect Email state
  const [collectEmail, setCollectEmail] = React.useState<boolean>(
    Boolean(currentSettings.collect_email)
  )

  // Sync state when dialog opens
  React.useEffect(() => {
    if (open) {
      const settings = form.settings || {}
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

      const hasHash = Boolean(settings.password_hash)
      setEnablePassword(hasHash)
      setPasswordInput("")

      setNotifyOnResponse(settings.notify_on_response !== false)
      setCollectEmail(Boolean(settings.collect_email))
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

  const handleSave = async () => {
    setIsSaving(true)
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
        collect_email: collectEmail,
      }

      if (enablePassword) {
        if (passwordInput.trim()) {
          payloadSettings.password = passwordInput.trim()
        }
      } else {
        payloadSettings.clear_password = true
      }

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
      if (onSettingsSaved) {
        onSettingsSaved(updatedForm.settings || {})
      }

      onOpenChange(false)
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
      <DialogContent className="max-w-md space-y-4">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Form Settings</DialogTitle>
          <DialogDescription>
            Configure optional access rules, expiry date, response limits, and email collection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
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
                <Input
                  type="password"
                  placeholder="Enter access password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="h-9 text-xs"
                />
                {hasExistingHash && !passwordInput && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
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

          {/* E) Collect Email Addresses */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="collect-email-toggle"
                checked={collectEmail}
                onCheckedChange={(checked) => setCollectEmail(Boolean(checked))}
              />
              <Label
                htmlFor="collect-email-toggle"
                className="text-sm font-semibold cursor-pointer flex items-center gap-1.5"
              >
                <AtSign className="h-4 w-4 text-muted-foreground" /> Collect email addresses
              </Label>
            </div>
            <p className="pl-6 text-xs text-muted-foreground">
              Respondents will be asked for their email, and will receive a copy of their response.
            </p>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
