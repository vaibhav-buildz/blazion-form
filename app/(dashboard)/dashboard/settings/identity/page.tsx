"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { createClient } from "@/lib/supabase"
import { orgProfileSchema, type OrgProfileInput } from "@/lib/validations/org-profile"
import { Button } from "@/components/ui/button"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ORG_TYPES = [
  "School/College",
  "Company",
  "NGO",
  "Government",
  "Hospital",
  "Other",
] as const

function UploadIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  )
}

export default function IdentitySettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = React.useState(false)
  const [fetching, setFetching] = React.useState(true)
  const [uploadingLogo, setUploadingLogo] = React.useState(false)
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [userId, setUserId] = React.useState<string | null>(null)

  const form = useForm({
    resolver: zodResolver(orgProfileSchema),
    defaultValues: {
      logo_url: "",
      org_name: "",
      org_type: "Company" as const,
      tagline: "",
      primary_color: "#4A5D23",
      accent_color: "#A9B388",
      website_url: "",
      contact_email: "",
    },
  })

  const logoUrl = form.watch("logo_url")

  React.useEffect(() => {
    async function loadOrgProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) return

        setUserId(user.id)

        const { data, error } = await supabase
          .from("org_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle()

        if (error) {
          console.error("Error fetching profile:", error)
        } else if (data) {
          form.reset({
            logo_url: data.logo_url || "",
            org_name: data.org_name || "",
            org_type: (data.org_type as any) || "Company",
            tagline: data.tagline || "",
            primary_color: data.primary_color || "#4A5D23",
            accent_color: data.accent_color || "#A9B388",
            website_url: data.website_url || "",
            contact_email: data.contact_email || "",
          })
        }
      } catch (err) {
        console.error("Unexpected error loading profile:", err)
      } finally {
        setFetching(false)
      }
    }

    loadOrgProfile()
  }, [supabase, form])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setUploadError("File size exceeds 2MB limit.")
      return
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      setUploadError("Only PNG, JPEG, and WEBP image files are allowed.")
      return
    }

    setUploadError(null)
    setUploadingLogo(true)

    try {
      const ext = file.name.split(".").pop()
      const filePath = `${userId || "anonymous"}/logo-${Date.now()}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from("org-assets")
        .upload(filePath, file, { upsert: true })

      if (uploadErr) {
        console.error("Storage upload error:", uploadErr)
        setUploadError(uploadErr.message)
        return
      }

      const { data: publicUrlData } = supabase.storage
        .from("org-assets")
        .getPublicUrl(filePath)

      if (publicUrlData?.publicUrl) {
        form.setValue("logo_url", publicUrlData.publicUrl)
      }
    } catch (err: any) {
      console.error("Logo upload exception:", err)
      setUploadError(err?.message || "Failed to upload logo image.")
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleRemoveLogo = () => {
    form.setValue("logo_url", "")
    setUploadError(null)
  }

  async function onSubmit(values: OrgProfileInput) {
    if (!userId) {
      setErrorMessage("User session not found.")
      return
    }

    setLoading(true)
    setSuccessMessage(null)
    setErrorMessage(null)

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
        console.error("Supabase upsert error:", error)
        setErrorMessage(error.message)
        return
      }

      setSuccessMessage("Saved successfully")
      setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)
    } catch (err: any) {
      console.error("Save profile error:", err)
      setErrorMessage(err?.message || "An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <p className="text-sm text-muted-foreground">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Organisation Identity</h1>
        <p className="text-sm text-muted-foreground">
          Configure your organisation profile, logo, and brand colors for forms.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Branding Settings</CardTitle>
          <CardDescription>
            Update your organisation details, logo, and primary theme.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <fieldset disabled={loading} className="space-y-6">
                {/* Logo Upload Section */}
                <div className="space-y-3">
                  <Label>Organisation Logo</Label>

                  {logoUrl ? (
                    <div className="flex items-center gap-4">
                      <div className="relative h-20 w-20 overflow-hidden rounded-md border border-border bg-background p-1">
                        <img
                          src={logoUrl}
                          alt="Organisation Logo"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="text-xs text-destructive hover:underline"
                        disabled={loading}
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
                      disabled={uploadingLogo || loading}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                    <UploadIcon className="mb-2 h-6 w-6 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">
                      {uploadingLogo
                        ? "Uploading logo..."
                        : "Click or drag logo image here"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, WEBP up to 2MB
                    </p>
                  </div>

                  {uploadError && (
                    <p className="text-xs font-medium text-destructive">
                      {uploadError}
                    </p>
                  )}
                </div>

                <FormField
                  control={form.control}
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
                  control={form.control}
                  name="org_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organisation Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={loading}
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
                  control={form.control}
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
                    control={form.control}
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
                    control={form.control}
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
                  control={form.control}
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
                  control={form.control}
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

              {errorMessage && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="rounded-md bg-emerald-500/10 p-3 text-sm font-medium text-emerald-600">
                  {successMessage}
                </div>
              )}

              <Button type="submit" disabled={loading || uploadingLogo}>
                {loading ? "Saving..." : "Save Settings"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
