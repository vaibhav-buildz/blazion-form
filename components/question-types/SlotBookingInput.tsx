"use client"

import React, { useState, useEffect } from "react"
import { Calendar, Clock, AlertCircle, CheckCircle2 } from "lucide-react"
import { formatDateDDMMYYYY } from "@/lib/utils"

interface SlotBookingInputProps {
  value?: { date: string; slot: string; lockedAt?: number } | null
  onChange: (val: { date: string; slot: string; lockedAt: number } | null) => void
  disabled?: boolean
  availableSlots?: string[]
}

const DEFAULT_SLOTS = [
  "09:30 AM - 10:00 AM",
  "10:30 AM - 11:00 AM",
  "11:30 AM - 12:00 PM",
  "02:00 PM - 02:30 PM",
  "03:30 PM - 04:00 PM",
  "04:30 PM - 05:00 PM",
]

export function SlotBookingInput({
  value,
  onChange,
  disabled = false,
  availableSlots = DEFAULT_SLOTS,
}: SlotBookingInputProps) {
  // Generate the next 5 business days
  const [dates, setDates] = useState<{ label: string; dateStr: string }[]>([])
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [selectedSlot, setSelectedSlot] = useState<string>("")
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300) // 5 minutes

  useEffect(() => {
    const list: { label: string; dateStr: string }[] = []
    const now = new Date()
    for (let i = 1; i <= 6; i++) {
      const d = new Date()
      d.setDate(now.getDate() + i)
      const dateStr = formatDateDDMMYYYY(d)
      const dayName = d.toLocaleDateString("en-IN", { weekday: "short" })
      list.push({
        label: `${dayName}, ${dateStr}`,
        dateStr,
      })
    }
    setDates(list)
    if (value?.date) {
      setSelectedDate(value.date)
      setSelectedSlot(value.slot)
      if (value.lockedAt) {
        const elapsed = Math.floor((Date.now() - value.lockedAt) / 1000)
        const left = Math.max(0, 300 - elapsed)
        setSecondsRemaining(left)
      }
    } else if (list.length > 0) {
      setSelectedDate(list[0].dateStr)
    }
  }, [value])

  // Timer countdown for the 5-minute soft lock
  useEffect(() => {
    if (!selectedSlot || secondsRemaining <= 0) return
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          onChange(null)
          setSelectedSlot("")
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [selectedSlot, secondsRemaining, onChange])

  const handleSelectSlot = (slot: string) => {
    if (disabled) return
    setSelectedSlot(slot)
    const now = Date.now()
    setSecondsRemaining(300)
    onChange({
      date: selectedDate,
      slot,
      lockedAt: now,
    })
  }

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s < 10 ? "0" : ""}${s}`
  }

  return (
    <div className="w-full space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-blue-500" /> Select Date
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {dates.map((d) => (
            <button
              key={d.dateStr}
              type="button"
              disabled={disabled}
              onClick={() => {
                setSelectedDate(d.dateStr)
                setSelectedSlot("")
                onChange(null)
              }}
              className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-all ${
                selectedDate === d.dateStr
                  ? "bg-blue-50 dark:bg-blue-950/50 border-blue-600 text-blue-700 dark:text-blue-300 font-semibold ring-1 ring-blue-500/20"
                  : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-indigo-500" /> Available Time Slots
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {availableSlots.map((slot) => {
            const isSelected = selectedSlot === slot
            return (
              <button
                key={slot}
                type="button"
                disabled={disabled}
                onClick={() => handleSelectSlot(slot)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium border transition-all ${
                  isSelected
                    ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-600 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-500/30"
                    : "bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-300"
                }`}
              >
                <span>{slot}</span>
                {isSelected && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {selectedSlot && secondsRemaining > 0 && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Slot held for you! Complete submission within:
            </span>
          </div>
          <span className="font-mono font-bold text-amber-900 dark:text-amber-100 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded">
            {formatTimer(secondsRemaining)}
          </span>
        </div>
      )}
    </div>
  )
}
