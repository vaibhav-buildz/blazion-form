"use client"

import React, { useState } from "react"
import { Palette, Check, Sparkles, Layout } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export interface FormTheme {
  fontFamily: "inter" | "outfit" | "serif" | "mono" | "roboto"
  background:
    | "default"
    | "gradient-sunset"
    | "gradient-ocean"
    | "gradient-forest"
    | "mesh-dark"
    | "paper"
  buttonShape: "rounded" | "pill" | "sharp"
  cardStyle: "elevated" | "glassmorphism" | "flat" | "minimal"
  logoPosition: "left" | "center" | "right"
  primaryColor: string
}

export const DEFAULT_THEME: FormTheme = {
  fontFamily: "inter",
  background: "default",
  buttonShape: "rounded",
  cardStyle: "elevated",
  logoPosition: "left",
  primaryColor: "#2563eb",
}

interface ThemeStudioModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTheme?: Partial<FormTheme>
  formTitle: string
  onSave: (theme: FormTheme) => void
}

export function ThemeStudioModal({
  open,
  onOpenChange,
  initialTheme,
  formTitle,
  onSave,
}: ThemeStudioModalProps) {
  const [theme, setTheme] = useState<FormTheme>({
    ...DEFAULT_THEME,
    ...initialTheme,
  })

  const fonts = [
    { id: "inter", name: "Inter (Modern)" },
    { id: "outfit", name: "Outfit (Geometric)" },
    { id: "serif", name: "Serif (Editorial)" },
    { id: "mono", name: "Mono (Technical)" },
    { id: "roboto", name: "Roboto (Classic)" },
  ]

  const backgrounds = [
    { id: "default", name: "Clean Minimal", preview: "bg-slate-50 border-slate-200" },
    { id: "gradient-sunset", name: "Sunset Gold", preview: "bg-gradient-to-br from-amber-100 to-rose-100" },
    { id: "gradient-ocean", name: "Ocean Breeze", preview: "bg-gradient-to-br from-sky-100 via-indigo-50 to-blue-100" },
    { id: "gradient-forest", name: "Emerald Glade", preview: "bg-gradient-to-br from-emerald-100 to-teal-100" },
    { id: "mesh-dark", name: "Deep Midnight", preview: "bg-slate-900 text-white" },
    { id: "paper", name: "Warm Parchment", preview: "bg-[#faf8f5] border-amber-200" },
  ]

  const buttonShapes = [
    { id: "rounded", name: "Rounded (Standard)", radius: "rounded-lg" },
    { id: "pill", name: "Pill (Smooth)", radius: "rounded-full" },
    { id: "sharp", name: "Sharp (Crisp)", radius: "rounded-none" },
  ]

  const cardStyles = [
    { id: "elevated", name: "Elevated Shadow" },
    { id: "glassmorphism", name: "Glassmorphic" },
    { id: "flat", name: "Flat Border" },
    { id: "minimal", name: "Borderless" },
  ]

  const logoPositions = [
    { id: "left", name: "Left" },
    { id: "center", name: "Center" },
    { id: "right", name: "Right" },
  ]

  const primaryColors = [
    "#2563eb", // Blue
    "#7c3aed", // Violet
    "#059669", // Emerald
    "#e11d48", // Rose
    "#d97706", // Amber
    "#0f172a", // Slate Black
  ]

  const handleApply = () => {
    onSave(theme)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Palette className="w-5 h-5" />
            </div>
            <DialogTitle className="text-xl font-bold">Form Theme Studio</DialogTitle>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
          {/* Controls */}
          <div className="space-y-6">
            {/* Primary Accent Color */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Primary Accent Color
              </label>
              <div className="flex items-center gap-3">
                {primaryColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setTheme({ ...theme, primaryColor: c })}
                    style={{ backgroundColor: c }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${
                      theme.primaryColor === c ? "scale-125 ring-2 ring-offset-2 ring-foreground" : "hover:scale-110"
                    }`}
                  >
                    {theme.primaryColor === c && <Check className="w-4 h-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Typography */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Font Family
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {fonts.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTheme({ ...theme, fontFamily: f.id as any })}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition ${
                      theme.fontFamily === f.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Background Style */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Background Theme
              </label>
              <div className="grid grid-cols-2 gap-2">
                {backgrounds.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setTheme({ ...theme, background: b.id as any })}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-left transition ${
                      theme.background === b.id
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg border shadow-2xs ${b.preview}`} />
                    <span className="text-xs font-medium">{b.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Button Shape */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Button Shape
              </label>
              <div className="flex gap-2">
                {buttonShapes.map((btn) => (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => setTheme({ ...theme, buttonShape: btn.id as any })}
                    className={`flex-1 py-2 text-xs font-semibold border transition ${btn.radius} ${
                      theme.buttonShape === btn.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    {btn.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Card & Logo */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Card Style
                </label>
                <select
                  value={theme.cardStyle}
                  onChange={(e) => setTheme({ ...theme, cardStyle: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground"
                >
                  {cardStyles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Logo Position
                </label>
                <div className="flex rounded-xl border border-border overflow-hidden text-xs">
                  {logoPositions.map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => setTheme({ ...theme, logoPosition: pos.id as any })}
                      className={`flex-1 py-2 text-center transition ${
                        theme.logoPosition === pos.id
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {pos.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview Panel */}
          <div className="flex flex-col">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Live Theme Preview
            </label>
            <div
              className={`flex-1 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-center items-center overflow-hidden transition-all ${
                theme.background === "gradient-sunset"
                  ? "bg-gradient-to-br from-amber-100 to-rose-100"
                  : theme.background === "gradient-ocean"
                  ? "bg-gradient-to-br from-sky-100 via-indigo-50 to-blue-100"
                  : theme.background === "gradient-forest"
                  ? "bg-gradient-to-br from-emerald-100 to-teal-100"
                  : theme.background === "mesh-dark"
                  ? "bg-slate-950 text-white"
                  : theme.background === "paper"
                  ? "bg-[#faf8f5]"
                  : "bg-slate-100"
              }`}
            >
              {/* Preview Form Card */}
              <div
                className={`w-full max-w-sm rounded-2xl p-6 transition-all ${
                  theme.cardStyle === "elevated"
                    ? "bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800"
                    : theme.cardStyle === "glassmorphism"
                    ? "bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-lg border border-white/40"
                    : theme.cardStyle === "flat"
                    ? "bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700"
                    : "bg-transparent border-0"
                }`}
              >
                {/* Logo demo */}
                <div
                  className={`flex mb-4 ${
                    theme.logoPosition === "center"
                      ? "justify-center"
                      : theme.logoPosition === "right"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                    BF
                  </div>
                </div>

                <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">
                  {formTitle || "Sample Form Title"}
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Please fill out the details below.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      disabled
                      placeholder="Jane Doe"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50"
                    />
                  </div>

                  <button
                    type="button"
                    style={{ backgroundColor: theme.primaryColor }}
                    className={`w-full py-2 text-xs font-semibold text-white shadow-xs transition-all ${
                      theme.buttonShape === "pill"
                        ? "rounded-full"
                        : theme.buttonShape === "sharp"
                        ? "rounded-none"
                        : "rounded-lg"
                    }`}
                  >
                    Submit Response
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition"
              >
                Save Theme
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
