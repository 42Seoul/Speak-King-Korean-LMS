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
      // Guard: Ignore stale events when not actively listening
      if (!isListeningRef.current) {
        console.warn('[STT] Ignoring stale onresult - not listening')
        return
      }

      let sessionFinal = ""
      let sessionInterim = ""

      for (let i = 0; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          sessionFinal += event.results[i][0].transcript
        } else {
          sessionInterim += event.results[i][0].transcript
        }
      }

      console.log('[STT onresult]', {
        isListening: isListeningRef.current,
        accumulated: accumulatedRef.current,
        sessionFinal,
        sessionInterim,
        eventLength: event.results.length,
        timestamp: Date.now()
      })

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
      console.log('[STT onend]', {
        isListening: isListeningRef.current,
        accumulated: accumulatedRef.current,
        currentSession: currentSessionFinalRef.current,
        timestamp: Date.now()
      })

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
    console.log('[STT reset] Before', {
      transcript,
      interimTranscript,
      accumulated: accumulatedRef.current,
      currentSession: currentSessionFinalRef.current,
      isListening: isListeningRef.current
    })

    // Critical: Stop listening FIRST to prevent race conditions
    isListeningRef.current = false

    // Clear React state
    setTranscript("")
    setInterimTranscript("")

    // Clear refs
    accumulatedRef.current = ""
    currentSessionFinalRef.current = ""

    // Force abort to clear browser buffer (Issue 2 fix)
    if (recognitionRef.current) {
        recognitionRef.current.abort()
    }

    setStatus("idle")

    console.log('[STT reset] After - abort called')
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