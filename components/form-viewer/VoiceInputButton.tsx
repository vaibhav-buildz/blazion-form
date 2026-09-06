"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff } from "lucide-react"

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void
  disabled?: boolean
  currentValue?: string
}

export function VoiceInputButton({ onTranscript, disabled, currentValue = "" }: VoiceInputButtonProps) {
  const [isListening, setIsListening] = React.useState(false)
  const [isSupported, setIsSupported] = React.useState(true)
  const recognitionRef = React.useRef<any>(null)

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setIsSupported(false)
    }
  }, [])

  const startListening = () => {
    if (disabled || !isSupported) return
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = "en-IN" // Standard Indian English, falls back gracefully

      recognition.onstart = () => {
        setIsListening(true)
      }

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript
        if (transcript) {
          const updated = currentValue ? `${currentValue.trim()} ${transcript}` : transcript
          onTranscript(updated)
        }
      }

      recognition.onerror = (e: any) => {
        console.warn("Speech recognition error:", e)
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (err) {
      console.error("Speech recognition startup error:", err)
      setIsListening(false)
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  if (!isSupported) {
    return null
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      disabled={disabled}
      onClick={isListening ? stopListening : startListening}
      title={isListening ? "Listening... click to stop" : "Speak to answer (Voice dictation)"}
      className={`h-8 w-8 rounded-full shrink-0 transition-all ${
        isListening
          ? "bg-red-500/10 text-red-600 dark:text-red-400 animate-pulse border border-red-500/40"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {isListening ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  )
}
