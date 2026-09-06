"use client"

import { useEffect } from "react"

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("Blazion ServiceWorker registered:", reg.scope))
        .catch((err) => console.warn("Blazion ServiceWorker registration failed:", err))
    }
  }, [])

  return null
}
