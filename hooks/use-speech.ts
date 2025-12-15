"use client"

import { useState, useEffect, useRef, useCallback } from "react"

// Browser compatibility interface
interface IWindow extends Window {
  webkitSpeechRecognition: any
  SpeechRecognition: any
}

export type SpeechStatus = "idle" | "listening" | "processing" | "success" | "error"

export const useSpeechToText = () => {
  const [status, setStatus] = useState<SpeechStatus>("idle")
  const [transcript, setTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)
  
  // Ref to track if we should be listening (manual toggle)
  const isListeningRef = useRef(false)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow
    const SpeechRecognitionAPI = SpeechRecognition || webkitSpeechRecognition

    if (!SpeechRecognitionAPI) {
      setError("Browser does not support Speech Recognition.")
      return
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = false // We restart manually for better control
    recognition.interimResults = true // Enable real-time feedback
    recognition.lang = "ko-KR" // Set to Korean for this app (Korean Speaking Practice)

    recognition.onstart = () => {
      setStatus("listening")
      setError(null)
    }

    recognition.onresult = (event: any) => {
      let final = ""
      let interim = ""

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript
        } else {
          interim += event.results[i][0].transcript
        }
      }

      if (final) {
        // Append final result to our state or just replace?
        // For short sentence practice, usually replacing is better as they retry
        setTranscript(final)
        setInterimTranscript("")
      } else {
        setInterimTranscript(interim)
      }
    }

    recognition.onerror = (event: any) => {
      // 'no-speech' is common, we just ignore/restart
      if (event.error === 'no-speech') {
         return 
      }
      // 'aborted' happens when we stop manually
      if (event.error === 'aborted') {
          return
      }

      console.error("Speech recognition error:", event.error)
      setError(event.error)
      setStatus("error")
    }

    recognition.onend = () => {
      // Auto-restart if we are supposed to be listening
      if (isListeningRef.current) {
        try {
            recognition.start()
        } catch (e) {
            // ignore if already started
        }
      } else {
        setStatus("idle")
      }
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      isListeningRef.current = true
      setTranscript("")
      setInterimTranscript("")
      setError(null)
      try {
        recognitionRef.current.start()
      } catch (e) {
        // Already started?
      }
    }
  }, [])

  const stopListening = useCallback(() => {
    isListeningRef.current = false
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setStatus("idle")
  }, [])

  // Force reset transcript (useful when changing questions)
  const resetTranscript = useCallback(() => {
    setTranscript("")
    setInterimTranscript("")
  }, [])

  return {
    status,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript
  }
}