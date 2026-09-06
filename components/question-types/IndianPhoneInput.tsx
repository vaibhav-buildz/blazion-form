"use client"

import React, { useState, useEffect } from "react"
import { Phone } from "lucide-react"

interface IndianPhoneInputProps {
  value?: string
  onChange: (val: string) => void
  disabled?: boolean
  required?: boolean
  error?: string
}

export function isValidIndianPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "")
  // Allow 10 digits starting with 6-9, or 12 digits starting with 91 followed by 6-9
  if (cleaned.length === 10) {
    return /^[6-9]\d{9}$/.test(cleaned)
  }
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return /^91[6-9]\d{9}$/.test(cleaned)
  }
  return false
}

export function IndianPhoneInput({
  value = "",
  onChange,
  disabled = false,
  required = false,
  error,
}: IndianPhoneInputProps) {
  const [digits, setDigits] = useState("")
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (value) {
      const raw = value.replace(/^\+91/, "").replace(/\D/g, "").slice(0, 10)
      setDigits(raw)
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 10)
    setDigits(raw)
    setTouched(true)
    onChange(raw ? `+91${raw}` : "")
  }

  const isInvalid = touched && digits.length > 0 && !isValidIndianPhone(digits)

  return (
    <div className="w-full space-y-1.5">
      <div
        className={`flex items-center rounded-xl border bg-white dark:bg-slate-900 overflow-hidden shadow-xs transition-colors ${
          error || isInvalid
            ? "border-red-500 ring-1 ring-red-500/20"
            : "border-slate-300 dark:border-slate-700 focus-within:border-slate-900 dark:focus-within:border-slate-100"
        }`}
      >
        <div className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 select-none">
          <span className="text-base leading-none">🇮🇳</span>
          <span>+91</span>
        </div>
        <input
          type="tel"
          disabled={disabled}
          required={required}
          value={digits}
          onChange={handleChange}
          onBlur={() => setTouched(true)}
          placeholder="98765 43210"
          className="flex-1 px-3 py-2.5 text-sm bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden disabled:opacity-50"
        />
      </div>
      {isInvalid && (
        <p className="text-xs text-red-500 font-medium">
          Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9
        </p>
      )}
    </div>
  )
}
