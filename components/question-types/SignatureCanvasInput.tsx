"use client"

import React, { useRef, useState, useEffect } from "react"
import SignatureCanvas from "react-signature-canvas"
import { Eraser, Check, RotateCcw } from "lucide-react"

interface SignatureCanvasInputProps {
  value?: string | null
  onChange: (dataUrl: string) => void
  disabled?: boolean
}

export function SignatureCanvasInput({
  value,
  onChange,
  disabled = false,
}: SignatureCanvasInputProps) {
  const sigPadRef = useRef<SignatureCanvas | null>(null)
  const [isEmpty, setIsEmpty] = useState(!value)
  const [preview, setPreview] = useState<string | null>(value || null)

  useEffect(() => {
    if (value) {
      setPreview(value)
      setIsEmpty(false)
    }
  }, [value])

  const handleClear = () => {
    if (sigPadRef.current) {
      sigPadRef.current.clear()
    }
    setPreview(null)
    setIsEmpty(true)
    onChange("")
  }

  const handleEnd = () => {
    if (sigPadRef.current) {
      if (!sigPadRef.current.isEmpty()) {
        const dataUrl = sigPadRef.current.getTrimmedCanvas().toDataURL("image/png")
        setPreview(dataUrl)
        setIsEmpty(false)
        onChange(dataUrl)
      }
    }
  }

  return (
    <div className="w-full space-y-2">
      <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 overflow-hidden shadow-xs">
        {preview && disabled ? (
          <div className="flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900 min-h-[160px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Recorded Signature" className="max-h-32 object-contain" />
          </div>
        ) : (
          <>
            <SignatureCanvas
              ref={sigPadRef}
              penColor="#0f172a"
              canvasProps={{
                className: "w-full h-40 bg-slate-50/50 dark:bg-slate-900/50 cursor-crosshair",
              }}
              onEnd={handleEnd}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center text-xs text-slate-400 select-none">
              Sign above with mouse, stylus, or touch
            </div>
          </>
        )}
      </div>

      {!disabled && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1">
            {!isEmpty && (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <Check className="w-3.5 h-3.5" /> Signature Captured
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-slate-600 hover:text-slate-900 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      )}
    </div>
  )
}
