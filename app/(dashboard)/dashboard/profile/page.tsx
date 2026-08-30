"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { User, Upload, Check, Bell, Lock, AlertTriangle, ShieldAlert, LogOut, Loader2 } from "lucide-react"

import { createClient } from "@/lib/supabase"
import { orgProfileSchema, type OrgProfileInput } from "@/lib/validations/org-profile"
import { Button } from "@/components/ui/button"
import { SignOutButton } from "@/components/SignOutButton"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const ORG_TYPES = [
  "School/College",
  "Company",
  "NGO",
  "Government",
  "Hospital",
  "Other",
] as const

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  // State management
  const [fetching, setFetching] = React.useState(true)
  const [userId, setUserId] = React.useState<string | null>(null)
  const [userEmail, setUserEmail] = React.useState<string>("")
  const [displayName, setDisplayName] = React.useState<string>("")
  const [avatarUrl, setAvatarUrl] = React.useState<string>("")
  const [savingProfile, setSavingProfile] = React.useState(false)
  const [profileMsg, setProfileMsg] = React.useState<{ type: "success" | "error"; text: string } | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false)
  const [avatarError, setAvatarError] = React.useState<string | null>(null)

  // Org branding form state
  const [savingOrg, setSavingOrg] = React.useState(false)
  const [uploadingLogo, setUploadingLogo] = React.useState(false)
  const [logoError, setLogoError] = React.useState<string | null>(null)
  const [orgMsg, setOrgMsg] = React.useState<{ type: "success" | "error"; text: string } | null>(null)

  // Change password state
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [updatingPassword, setUpdatingPassword] = React.useState(false)
  const [passwordMsg, setPasswordMsg] = React.useState<{ type: "success" | "error"; text: string } | null>(null)

  // Notification preferences state
  const [emailNotifications, setEmailNotifications] = React.useState(true)
  const [updatingNotifications, setUpdatingNotifications] = React.useState(false)
  const [notificationMsg, setNotificationMsg] = React.useState<{ type: "success" | "error"; text: string } | null>(null)

  // Danger Zone / Delete Account modal state
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false)
  const [deleteConfirmationInput, setDeleteConfirmationInput] = React.useState("")
  const [deletingAccount, setDeletingAccount] = React.useState(false)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)

  // Org Profile React Hook Form
  const orgForm = useForm({
    resolver: zodResolver(orgProfileSchema),
    defaultValues: {
      logo_url: "",
      org_name: "",
      org_type: "Company" as const,
      tagline: "",
      primary_color: "#C4622D",
      accent_color: "#1F6F6B",
      website_url: "",
      contact_email: "",
    },
  })

  const orgLogoUrl = orgForm.watch("logo_url")

  // Load user session & profile data
  React.useEffect(() => {
    async function loadData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push("/login")
          return
        }

        setUserId(user.id)
        setUserEmail(user.email || "")

        // Profile display name & avatar from user metadata
        const metadata = user.user_metadata || {}
        setDisplayName(metadata.display_name || metadata.full_name || user.email?.split("@")[0] || "")
        setAvatarUrl(metadata.avatar_url || "")
        setEmailNotifications(metadata.email_notifications !== false)

        // Load Org Profile
        const { data: orgData } = await supabase
          .from("org_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle()

        if (orgData) {
          orgForm.reset({
            logo_url: orgData.logo_url || "",
            org_name: orgData.org_name || "",
            org_type: (orgData.org_type as any) || "Company",
            tagline: orgData.tagline || "",
            primary_color: orgData.primary_color || "#C4622D",
            accent_color: orgData.accent_color || "#1F6F6B",
            website_url: orgData.website_url || "",
            contact_email: orgData.contact_email || "",
          })
        }
      } catch (err) {
        console.error("Error loading user profile data:", err)
      } finally {
        setFetching(false)
      }
    }

    loadData()
  }, [supabase, router, orgForm])

  // --- Handlers ---

  // 1. Avatar Upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("File size exceeds 2MB limit.")
      return
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      setAvatarError("Only PNG, JPEG, and WEBP image files are allowed.")
      return
    }

    setAvatarError(null)
    setUploadingAvatar(true)

    try {
      const ext = file.name.split(".").pop()
      const filePath = `${userId || "anonymous"}/avatar-${Date.now()}.${ext}`

      // Attempt upload to avatars bucket, fallback to org-assets
      let publicUrl = ""
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true })

      if (!uploadErr) {
        const { data: pubData } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath)
        publicUrl = pubData?.publicUrl || ""
      } else {
        const fallbackPath = `${userId || "anonymous"}/avatar-${Date.now()}.${ext}`
        const { error: fallbackErr } = await supabase.storage
          .from("org-assets")
          .upload(fallbackPath, file, { upsert: true })

        if (fallbackErr) {
          setAvatarError(uploadErr.message || fallbackErr.message)
          return
        }
        const { data: pubData } = supabase.storage
          .from("org-assets")
          .getPublicUrl(fallbackPath)
        publicUrl = pubData?.publicUrl || ""
      }

      if (publicUrl) {
        setAvatarUrl(publicUrl)
        // Automatically save avatar in auth metadata
        await supabase.auth.updateUser({
          data: { avatar_url: publicUrl },
        })
      }
    } catch (err: any) {
      setAvatarError(err?.message || "Failed to upload avatar.")
    } finally {
      setUploadingAvatar(false)
    }
  }

  // Save Profile Info (Display Name)
  const handleSaveProfileInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    setProfileMsg(null)

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: displayName,
          avatar_url: avatarUrl,
        },
      })

      if (error) {
        setProfileMsg({ type: "error", text: error.message })
        return
      }

      setProfileMsg({ type: "success", text: "Profile information saved successfully." })
      setTimeout(() => setProfileMsg(null), 3000)
    } catch (err: any) {
      setProfileMsg({ type: "error", text: err?.message || "Failed to save profile." })
    } finally {
      setSavingProfile(false)
    }
  }

  // 2. Org Branding Save & Logo Upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setLogoError("File size exceeds 2MB limit.")
      return
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      setLogoError("Only PNG, JPEG, and WEBP image files are allowed.")
      return
    }

    setLogoError(null)
    setUploadingLogo(true)

    try {
      const ext = file.name.split(".").pop()
      const filePath = `${userId || "anonymous"}/logo-${Date.now()}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from("org-assets")
        .upload(filePath, file, { upsert: true })

      if (uploadErr) {
        setLogoError(uploadErr.message)
        return
      }

      const { data: publicUrlData } = supabase.storage
        .from("org-assets")
        .getPublicUrl(filePath)

      if (publicUrlData?.publicUrl) {
        orgForm.setValue("logo_url", publicUrlData.publicUrl)
      }
    } catch (err: any) {
      setLogoError(err?.message || "Failed to upload logo image.")
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleRemoveLogo = () => {
    orgForm.setValue("logo_url", "")
    setLogoError(null)
  }

  const onSaveOrgBranding = async (values: OrgProfileInput) => {
    if (!userId) return

    setSavingOrg(true)
    setOrgMsg(null)

    try {
      const payload = {
        user_id: userId,
        logo_url: values.logo_url || null,
        org_name: values.org_name,
        org_type: values.org_type,
        tagline: values.tagline || null,
        primary_color: values.primary_color,
        accent_color: values.accent_color,
        website_url: values.website_url || null,
        contact_email: values.contact_email || null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from("org_profiles")
        .upsert(payload, { onConflict: "user_id" })

      if (error) {
        setOrgMsg({ type: "error", text: error.message })
        return
      }

      setOrgMsg({ type: "success", text: "Organisation branding saved successfully." })
      setTimeout(() => setOrgMsg(null), 3000)
    } catch (err: any) {
      setOrgMsg({ type: "error", text: err?.message || "An error occurred saving org profile." })
    } finally {
      setSavingOrg(false)
    }
  }

  // 3. Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMsg(null)

    if (newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "New password must be at least 6 characters." })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "New passwords do not match." })
      return
    }

    setUpdatingPassword(true)

    try {
      // Optional check current password by signing in
      if (currentPassword && userEmail) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: currentPassword,
        })
        if (signInErr) {
          setPasswordMsg({ type: "error", text: "Current password is incorrect." })
          setUpdatingPassword(false)
          return
        }
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        setPasswordMsg({ type: "error", text: error.message })
        return
      }

      setPasswordMsg({ type: "success", text: "Password updated successfully." })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setTimeout(() => setPasswordMsg(null), 3000)
    } catch (err: any) {
      setPasswordMsg({ type: "error", text: err?.message || "Failed to update password." })
    } finally {
      setUpdatingPassword(false)
    }
  }

  // 4. Notification Preferences
  const handleToggleNotifications = async (checked: boolean) => {
    setEmailNotifications(checked)
    setUpdatingNotifications(true)
    setNotificationMsg(null)

    try {
      const { error } = await supabase.auth.updateUser({
        data: { email_notifications: checked },
      })

      if (error) {
        setNotificationMsg({ type: "error", text: error.message })
        return
      }

      setNotificationMsg({
        type: "success",
        text: `Email notifications ${checked ? "enabled" : "disabled"}.`,
      })
      setTimeout(() => setNotificationMsg(null), 3000)
    } catch (err: any) {
      setNotificationMsg({ type: "error", text: err?.message || "Failed to update preference." })
    } finally {
      setUpdatingNotifications(false)
    }
  }

  // 5. Account Deletion Execution
  const isDeleteConfirmed =
    deleteConfirmationInput.trim() === "DELETE" ||
    deleteConfirmationInput.trim().toLowerCase() === userEmail.toLowerCase()

  const handleExecuteDeleteAccount = async () => {
    if (!isDeleteConfirmed) return

    setDeletingAccount(true)
    setDeleteError(null)

    try {
      const res = await fetch("/api/user/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: deleteConfirmationInput.trim() }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setDeleteError(data.error || "Failed to delete account.")
        setDeletingAccount(false)
        return
      }

      // Success -> sign out and redirect to login
      await supabase.auth.signOut().catch(() => {})
      router.push("/login")
    } catch (err: any) {
      setDeleteError(err?.message || "An unexpected error occurred during account deletion.")
      setDeletingAccount(false)
    }
  }

  if (fetching) {
    return (
      <div className="mx-auto max-w-3xl p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-muted-foreground text-sm">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Loading profile...
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">User Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account settings, organisation branding, security, and preferences.
        </p>
      </div>

      {/* SECTION A: Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <User className="h-5 w-5 text-primary" />
            Profile Info
          </CardTitle>
          <CardDescription>
            Update your personal profile details and avatar image.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfileInfo} className="space-y-6">
            {/* Avatar Upload */}
            <div className="space-y-3">
              <Label>Profile Avatar</Label>
              <div className="flex items-center gap-5">
                <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-border bg-muted flex items-center justify-center shrink-0">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-9 w-9 text-muted-foreground" />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="relative inline-flex">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingAvatar || savingProfile}
                      className="relative cursor-pointer"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {uploadingAvatar ? "Uploading..." : "Change Avatar"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleAvatarUpload}
                        disabled={uploadingAvatar || savingProfile}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                    </Button>
                  </div>
                  {avatarUrl && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setAvatarUrl("")}
                        className="text-xs text-destructive hover:underline"
                      >
                        Remove picture
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, or WEBP up to 2MB.
                  </p>
                </div>
              </div>
              {avatarError && (
                <p className="text-xs font-medium text-destructive">{avatarError}</p>
              )}
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                type="text"
                placeholder="Enter your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={savingProfile}
              />
            </div>

            {/* Email Address (Read-Only) */}
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email Address</Label>
              <Input
                id="profile-email"
                type="email"
                value={userEmail}
                readOnly
                disabled
                className="bg-muted/50 cursor-not-allowed opacity-80"
              />
              <p className="text-xs text-muted-foreground">
                Your email address is managed through authentication and cannot be changed here directly.
              </p>
            </div>

            {profileMsg && (
              <div
                className={`rounded-md p-3 text-sm font-medium ${
                  profileMsg.type === "success"
                    ? "bg-success/10 text-success"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {profileMsg.text}
              </div>
            )}

            <Button type="submit" disabled={savingProfile || uploadingAvatar}>
              {savingProfile ? "Saving Profile..." : "Save Profile Info"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* SECTION B: Org Branding */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Organisation Branding
          </CardTitle>
          <CardDescription>
            Configure your organisation profile, logo, and custom brand theme colors.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...orgForm}>
            <form onSubmit={orgForm.handleSubmit(onSaveOrgBranding)} className="space-y-6">
              <fieldset disabled={savingOrg} className="space-y-6">
                {/* Logo Upload */}
                <div className="space-y-3">
                  <Label>Organisation Logo</Label>
                  {orgLogoUrl ? (
                    <div className="flex items-center gap-4">
                      <div className="relative h-20 w-20 overflow-hidden rounded-md border border-border bg-background p-1">
                        <img
                          src={orgLogoUrl}
                          alt="Organisation Logo"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="text-xs text-destructive hover:underline"
                        disabled={savingOrg}
                      >
                        Remove logo
                      </button>
                    </div>
                  ) : null}

                  <div className="relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo || savingOrg}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                    <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">
                      {uploadingLogo ? "Uploading logo..." : "Click or drag logo image here"}
                    </p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, WEBP up to 2MB</p>
                  </div>

                  {logoError && (
                    <p className="text-xs font-medium text-destructive">{logoError}</p>
                  )}
                </div>

                <FormField
                  control={orgForm.control}
                  name="org_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organisation Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Acme Corp" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={orgForm.control}
                  name="org_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organisation Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={savingOrg}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ORG_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={orgForm.control}
                  name="tagline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tagline</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Empowering NextGen Teams"
                          value={field.value || ""}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={orgForm.control}
                    name="primary_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Color</FormLabel>
                        <div className="flex items-center gap-3">
                          <FormControl>
                            <Input
                              type="color"
                              className="h-10 w-14 cursor-pointer p-1"
                              value={field.value}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <Input
                            type="text"
                            value={field.value}
                            onChange={field.onChange}
                            className="font-mono text-sm"
                          />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={orgForm.control}
                    name="accent_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Accent Color</FormLabel>
                        <div className="flex items-center gap-3">
                          <FormControl>
                            <Input
                              type="color"
                              className="h-10 w-14 cursor-pointer p-1"
                              value={field.value}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <Input
                            type="text"
                            value={field.value}
                            onChange={field.onChange}
                            className="font-mono text-sm"
                          />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={orgForm.control}
                  name="website_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com"
                          value={field.value || ""}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={orgForm.control}
                  name="contact_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="contact@example.com"
                          value={field.value || ""}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </fieldset>

              {orgMsg && (
                <div
                  className={`rounded-md p-3 text-sm font-medium ${
                    orgMsg.type === "success"
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {orgMsg.text}
                </div>
              )}

              <Button type="submit" disabled={savingOrg || uploadingLogo}>
                {savingOrg ? "Saving Branding..." : "Save Branding Settings"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* SECTION C: Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Lock className="h-5 w-5 text-primary" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your account password for enhanced security.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <PasswordInput
                id="current-password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={updatingPassword}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <PasswordInput
                  id="new-password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={updatingPassword}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <PasswordInput
                  id="confirm-password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={updatingPassword}
                />
              </div>
            </div>

            {passwordMsg && (
              <div
                className={`rounded-md p-3 text-sm font-medium ${
                  passwordMsg.type === "success"
                    ? "bg-success/10 text-success"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {passwordMsg.text}
              </div>
            )}

            <Button type="submit" disabled={updatingPassword || !newPassword || !confirmPassword}>
              {updatingPassword ? "Updating Password..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* SECTION D: Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Bell className="h-5 w-5 text-primary" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Control how and when you receive automated emails and response alerts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3 rounded-lg border border-border p-4 bg-muted/20">
            <Checkbox
              id="notify-responses"
              checked={emailNotifications}
              onCheckedChange={(checked) => handleToggleNotifications(Boolean(checked))}
              disabled={updatingNotifications}
              className="mt-0.5"
            />
            <div className="space-y-1 leading-none">
              <Label
                htmlFor="notify-responses"
                className="text-sm font-medium text-foreground cursor-pointer"
              >
                Form Response Email Notifications
              </Label>
              <p className="text-xs text-muted-foreground">
                Receive an immediate email summary whenever a respondent submits a form.
              </p>
            </div>
          </div>

          {notificationMsg && (
            <div
              className={`rounded-md p-3 text-sm font-medium ${
                notificationMsg.type === "success"
                  ? "bg-success/10 text-success"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {notificationMsg.text}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION E: Danger Zone */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-destructive">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Irreversible actions regarding your account session and data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sign Out Action */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border border-destructive/20 bg-background p-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Sign Out of Session</p>
              <p className="text-xs text-muted-foreground">
                Logout of your active session on this browser.
              </p>
            </div>
            <SignOutButton
              variant="outline"
              className="border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors font-medium shrink-0"
            />
          </div>

          {/* Delete Account Action */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border border-destructive/20 bg-background p-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-destructive">Delete Account</p>
              <p className="text-xs text-muted-foreground">
                Permanently delete your profile, forms, submissions, and account data.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => {
                setDeleteConfirmationInput("")
                setDeleteError(null)
                setDeleteModalOpen(true)
              }}
              className="shrink-0"
            >
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Account Deletion
            </DialogTitle>
            <DialogDescription>
              This action is <strong className="text-destructive font-semibold">permanent and cannot be undone</strong>.
              All your forms, questions, response records, and account credentials will be permanently erased.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive space-y-1">
              <p className="font-semibold">Verification Required:</p>
              <p>
                To confirm deletion, please type <code className="font-mono bg-destructive/20 px-1 py-0.5 rounded font-bold">DELETE</code> or your email address (<strong className="font-semibold">{userEmail}</strong>) below.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delete-confirm-input">Confirmation Input</Label>
              <Input
                id="delete-confirm-input"
                type="text"
                placeholder='Type "DELETE" or your email address'
                value={deleteConfirmationInput}
                onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                autoFocus
              />
            </div>

            {deleteError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">
                {deleteError}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deletingAccount}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleExecuteDeleteAccount}
              disabled={!isDeleteConfirmed || deletingAccount}
            >
              {deletingAccount ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting Account...
                </>
              ) : (
                "Permanently Delete Account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
