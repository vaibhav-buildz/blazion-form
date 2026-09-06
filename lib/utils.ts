import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateDDMMYYYY(dateInput?: string | number | Date | null): string {
  if (!dateInput) return ""
  const date = new Date(dateInput)
  if (isNaN(date.getTime())) return String(dateInput)
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

export function formatDateTimeDDMMYYYY(dateInput?: string | number | Date | null): string {
  if (!dateInput) return ""
  const date = new Date(dateInput)
  if (isNaN(date.getTime())) return String(dateInput)
  const d = formatDateDDMMYYYY(date)
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${d} ${hours}:${minutes}`
}

