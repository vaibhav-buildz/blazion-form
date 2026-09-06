"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Eraser, Check } from "lucide-react"

interface SignatureCanvasProps {
  value?: string
  onChange: (val: string) => void
  disabled?: boolean
}

export function SignatureCanvas({ value, onChange, disabled }: SignatureCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = React.useState(false)
  const [hasDrawn, setHasDrawn] = React.useState(Boolean(value))

  // Initialize canvas
  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set high DPI resolution
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)
    ctx.lineWidth = 2.5
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = "#1e293b" // slate-800

    // Load existing image if available
    if (value) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height)
      }
      img.src = value
    }
  }, [])

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasDrawn(true)
  }

  const stopDrawing = () => {
    if (!isDrawing || disabled) return
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL("image/png")
    onChange(dataUrl)
  }

  const handleClear = () => {
    if (disabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
    onChange("")
  }

  return (
    <div className="space-y-2">
      <div className="relative rounded-lg border-2 border-dashed border-border bg-card p-1">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-36 rounded touch-none cursor-crosshair bg-background"
        />
        {!hasDrawn && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-xs text-muted-foreground/60 select-none">
            <span>Sign here using finger, stylus, or mouse</span>
            <span className="text-[10px] mt-0.5">Legally binding electronic signature</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          {hasDrawn && (
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
              <Check className="w-3.5 h-3.5" /> Signature Captured
            </span>
          )}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={disabled || !hasDrawn}
          className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1 px-2"
        >
          <Eraser className="w-3.5 h-3.5" /> Clear Signature
        </Button>
      </div>
    </div>
  )
}
