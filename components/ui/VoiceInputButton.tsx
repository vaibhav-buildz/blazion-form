"use client"

import React, { useState, useEffect, useRef } from "react"
import { Mic, MicOff, Loader2 } from "lucide-react"

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void
  lang?: "en-IN" | "hi-IN"
  className?: string
}

export function VoiceInputButton({
  onTranscript,
  lang = "en-IN",
  className = "",
}: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setIsSupported(false)
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = lang

      recognition.onstart = () => {
        setIsListening(true)
      }

      recognition.onresult = (event: any) => {
        let transcript = ""
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript
        }
        if (transcript) {
          onTranscript(transcript)
        }
      }

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error)
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
    } catch (e) {
      console.warn("SpeechRecognition init error:", e)
      setIsSupported(false)
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {}
      }
    }
  }, [lang, onTranscript])

  const toggleListening = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!recognitionRef.current) return

    if (isListening) {
      try {
        recognitionRef.current.stop()
      } catch {}
      setIsListening(false)
    } else {
      try {
        recognitionRef.current.lang = lang
        recognitionRef.current.start()
        setIsListening(true)
      } catch (err) {
        console.warn("Speech recognition start error:", err)
      }
    }
  }

  if (!isSupported) {
    return null
  }

  return (
    <button
      type="button"
      onClick={toggleListening}
      title={isListening ? "Stop listening" : `Click to voice type (${lang})`}
      className={`relative inline-flex items-center justify-center p-2 rounded-lg transition-all focus:outline-hidden ${
        isListening
          ? "bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse"
          : "text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      } ${className}`}
    >
      {isListening ? (
        <>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
          </span>
          <Mic className="w-4 h-4 text-white animate-bounce" />
        </>
      ) : (
        <Mic className="w-4 h-4" />
      )}
    </button>
  )
}
