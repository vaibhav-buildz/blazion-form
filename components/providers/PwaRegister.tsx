"use client"

import { useEffect } from "react"

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("FormSetu ServiceWorker registered:", reg.scope))
        .catch((err) => console.warn("FormSetu ServiceWorker registration failed:", err))
    }
  }, [])

  return null
}
