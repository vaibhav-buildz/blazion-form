"use client"

import React, { useState, useEffect, useRef } from "react"
import { Sparkles, Plus, Loader2 } from "lucide-react"
import { SuggestedField } from "@/lib/ai"

interface SmartFieldSuggestionsProps {
  formTitle: string
  currentQuestions: { id: string; title: string; type: string }[]
  onAddSuggestedField: (field: SuggestedField) => void
}

export function SmartFieldSuggestions({
  formTitle,
  currentQuestions,
  onAddSuggestedField,
}: SmartFieldSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SuggestedField[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const titles = currentQuestions.map((q) => q.title).filter(Boolean)
  const lastTitle = titles[titles.length - 1] || ""

  useEffect(() => {
    if (titles.length === 0) {
      setSuggestions([])
      return
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch("/api/ai/suggest-fields", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            formTitle: formTitle || "Form",
            currentQuestionTitles: titles,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.suggestions)) {
            setSuggestions(data.suggestions)
          }
        }
      } catch (err) {
        console.warn("Field suggestions error:", err)
      } finally {
        setLoading(false)
      }
    }, 1200)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [formTitle, titles.length, lastTitle])

  if (!suggestions || (suggestions.length === 0 && !loading)) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 my-3">
      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 mr-1">
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
        )}
        <span>Suggested next fields:</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {suggestions.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              onAddSuggestedField(s)
              setSuggestions((prev) => prev.filter((_, i) => i !== idx))
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
          >
            <Plus className="w-3 h-3 text-indigo-500 group-hover:scale-125 transition-transform" />
            <span>{s.title}</span>
            <span className="text-[10px] text-slate-400 font-normal">({s.type.replace("_", " ")})</span>
          </button>
        ))}
      </div>
    </div>
  )
}
