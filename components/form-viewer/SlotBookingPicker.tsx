"use client"

import * as React from "react"
import { Calendar, Clock, Loader2, Check } from "lucide-react"

interface SlotBookingPickerProps {
  formId: string
  questionId: string
  settings?: {
    slotDuration?: number
    startHour?: number
    endHour?: number
  }
  value?: string | { date: string; slot: string }
  onChange: (val: string) => void
  disabled?: boolean
}

export function SlotBookingPicker({
  formId,
  questionId,
  settings,
  value,
  onChange,
  disabled,
}: SlotBookingPickerProps) {
  const duration = settings?.slotDuration || 30
  const startHour = settings?.startHour ?? 9
  const endHour = settings?.endHour ?? 17

  // Parse existing value
  const parsedValue = React.useMemo(() => {
    if (!value) return { date: "", slot: "" }
    if (typeof value === "object") return value
    try {
      const parsed = JSON.parse(value)
      return { date: parsed.date || "", slot: parsed.slot || "" }
    } catch {
      const parts = value.split(" ")
      return { date: parts[0] || "", slot: parts.slice(1).join(" ") || "" }
    }
  }, [value])

  const [selectedDate, setSelectedDate] = React.useState<string>(parsedValue.date || "")
  const [selectedSlot, setSelectedSlot] = React.useState<string>(parsedValue.slot || "")
  const [bookedSlots, setBookedSlots] = React.useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = React.useState(false)

  // Generate all time slots for the configured window
  const allSlots = React.useMemo(() => {
    const slots: string[] = []
    let currentMinutes = startHour * 60
    const endMinutes = endHour * 60

    while (currentMinutes + duration <= endMinutes) {
      const startH = Math.floor(currentMinutes / 60)
      const startM = currentMinutes % 60
      const endMins = currentMinutes + duration
      const endH = Math.floor(endMins / 60)
      const endM = endMins % 60

      const formatTime = (h: number, m: number) => {
        const ampm = h >= 12 ? "PM" : "AM"
        const displayH = h % 12 || 12
        const displayM = m.toString().padStart(2, "0")
        return `${displayH}:${displayM} ${ampm}`
      }

      slots.push(`${formatTime(startH, startM)} - ${formatTime(endH, endM)}`)
      currentMinutes += duration
    }
    return slots
  }, [duration, startHour, endHour])

  // Fetch booked slots whenever selectedDate changes
  React.useEffect(() => {
    if (!selectedDate) {
      setBookedSlots([])
      return
    }

    let isCancelled = false
    setLoadingSlots(true)

    fetch(`/api/forms/${formId}/slots?date=${selectedDate}`)
      .then((res) => (res.ok ? res.json() : { bookedSlots: [] }))
      .then((data) => {
        if (!isCancelled) {
          setBookedSlots(data.bookedSlots || [])
        }
      })
      .catch((err) => {
        console.warn("Could not fetch booked slots:", err)
      })
      .finally(() => {
        if (!isCancelled) {
          setLoadingSlots(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [selectedDate, formId])

  const handleSelectDate = (d: string) => {
    setSelectedDate(d)
    setSelectedSlot("")
    onChange("")
  }

  const handleSelectSlot = (slot: string) => {
    if (disabled || bookedSlots.includes(slot)) return
    setSelectedSlot(slot)
    const combined = `${selectedDate} ${slot}`
    onChange(combined)
  }

  // Today formatted as YYYY-MM-DD
  const todayStr = new Date().toISOString().split("T")[0]

  return (
    <div className="space-y-4">
      {/* Date Picker Input */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" /> Select Appointment Date
        </label>
        <input
          type="date"
          min={todayStr}
          disabled={disabled}
          value={selectedDate}
          onChange={(e) => handleSelectDate(e.target.value)}
          className="w-full sm:w-64 px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Available Slots Grid */}
      {selectedDate && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-semibold">
              <Clock className="w-3.5 h-3.5" /> Available Times ({duration} mins)
            </span>
            {loadingSlots && (
              <span className="flex items-center gap-1 text-[11px]">
                <Loader2 className="w-3 h-3 animate-spin" /> Checking availability...
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
            {allSlots.map((slot) => {
              const isBooked = bookedSlots.includes(slot)
              const isSelected = selectedSlot === slot

              return (
                <button
                  key={slot}
                  type="button"
                  disabled={disabled || isBooked}
                  onClick={() => handleSelectSlot(slot)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border text-center transition-all flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20"
                      : isBooked
                      ? "border-border/40 bg-muted/40 text-muted-foreground/40 cursor-not-allowed line-through"
                      : "border-input bg-card hover:bg-muted/50 text-foreground"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                  <span>{slot}</span>
                </button>
              )
            })}
          </div>

          {selectedSlot && (
            <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span>
                Selected: <strong>{selectedDate}</strong> at <strong>{selectedSlot}</strong>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
