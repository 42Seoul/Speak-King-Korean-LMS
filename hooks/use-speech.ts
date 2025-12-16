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
  
  const isListeningRef = useRef(false)
  const recognitionRef = useRef<any>(null)
  
  // Accumulation Strategy Refs
  const accumulatedRef = useRef("") 
  const currentSessionFinalRef = useRef("") 

  useEffect(() => {
    if (typeof window === 'undefined') return

    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow
    const SpeechRecognitionAPI = SpeechRecognition || webkitSpeechRecognition

    if (!SpeechRecognitionAPI) {
      setError("unsupported_browser")
      return
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true 
    recognition.interimResults = true 
    recognition.lang = "ko-KR" 

    recognition.onstart = () => {
      if (isListeningRef.current) {
          setStatus("listening")
      }
      setError(null)
    }

    recognition.onresult = (event: any) => {
      let sessionFinal = ""
      let sessionInterim = ""

      for (let i = 0; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          sessionFinal += event.results[i][0].transcript
        } else {
          sessionInterim += event.results[i][0].transcript
        }
      }

      currentSessionFinalRef.current = sessionFinal
      setTranscript(accumulatedRef.current + sessionFinal)
      setInterimTranscript(sessionInterim)
    }

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') return 
      
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setError("permission_denied")
          setStatus("error")
          isListeningRef.current = false 
          return
      }
    }

    recognition.onend = () => {
      if (isListeningRef.current) {
        // Accumulate the finalized text from the session that just ended
        accumulatedRef.current += currentSessionFinalRef.current
        currentSessionFinalRef.current = ""
        
        try {
            recognition.start()
        } catch (e) {
            // ignore
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
      // Optimistic UI update
      setStatus("listening")
      setError(null)
      
      try {
        recognitionRef.current.start()
      } catch (e: any) {
        // ignore
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

  const resetTranscript = useCallback(() => {
    setTranscript("")
    setInterimTranscript("")
    accumulatedRef.current = ""
    currentSessionFinalRef.current = ""
    
    // Force abort to clear browser buffer (Issue 2 fix)
    if (recognitionRef.current) {
        recognitionRef.current.abort()
    }
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