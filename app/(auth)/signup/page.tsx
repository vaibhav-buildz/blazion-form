"use client"

import * as React from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { createClient } from "@/lib/supabase"
import { signupSchema, type SignupInput } from "@/lib/validations/auth"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  )
}

export default function SignupPage() {
  const supabase = createClient()
  const [error, setError] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const handleGitHubLogin = async () => {
    const supabaseClient = createClient()
    await supabaseClient.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  async function onSubmit(data: SignupInput) {
    setError(null)
    setSuccessMessage(null)
    setLoading(true)

    try {
      const { error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        setError(authError.message)
        return
      }

      setSuccessMessage("Check your email to confirm your account")
      form.reset()
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Sign up</CardTitle>
          <CardDescription>
            Create an account to get started with Blazion Form
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleGitHubLogin}
          >
            <GithubIcon className="h-4 w-4" />
            Continue with GitHub
          </Button>

          <div className="relative flex items-center justify-center border-t py-2">
            <span className="bg-background px-2 text-xs font-medium text-slate-500 uppercase">
              Or continue with email
            </span>
          </div>

          {successMessage ? (
            <div className="rounded-md bg-slate-100 p-4 text-sm font-medium text-slate-800">
              {successMessage}
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="name@example.com"
                          disabled={loading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          disabled={loading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing up..." : "Sign up"}
                </Button>
              </form>
            </Form>
          )}

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">
              {error}
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-center border-t p-4">
          <p className="text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="text-slate-900 underline">
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
