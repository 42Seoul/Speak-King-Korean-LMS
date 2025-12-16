"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Mic, Square, Play, X } from "lucide-react"

interface AudioRecorderProps {
  onFileReady: (file: File | null) => void
}

export function AudioRecorder({ onFileReady }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      chunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        
        // Automatically notify parent with the new file
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' })
        onFileReady(file)
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
    } catch (err) {
      console.error("Error accessing microphone:", err)
      alert("Microphone access denied or not available.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const handlePlayPreview = () => {
    if (audioRef.current && audioUrl) {
      audioRef.current.src = audioUrl
      audioRef.current.play()
    }
  }

  const handleReset = () => {
    setAudioUrl(null)
    chunksRef.current = []
    onFileReady(null) // Clear file in parent
  }

  // 1. Initial State (Start)
  if (!isRecording && !audioUrl) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={startRecording}
        className="gap-2 text-xs"
      >
        <Mic className="h-3.5 w-3.5" /> Record
      </Button>
    )
  }

  // 2. Recording State
  if (isRecording) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-md text-xs font-medium animate-pulse">
            <div className="w-2 h-2 rounded-full bg-red-600" />
            Recording...
        </div>
        <Button 
            variant="destructive" 
            size="sm" 
            onClick={stopRecording}
            className="h-8 w-8 p-0"
        >
            <Square className="h-3.5 w-3.5 fill-current" />
        </Button>
      </div>
    )
  }

  // 3. Review State
  return (
    <div className="flex items-center gap-2 p-1 border rounded-md bg-secondary/10">
      <audio ref={audioRef} className="hidden" />
      
      <Button variant="ghost" size="sm" onClick={handlePlayPreview} className="h-7 w-7 p-0">
        <Play className="h-3.5 w-3.5" />
      </Button>
      
      <div className="h-4 w-px bg-border" />

      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleReset}
        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
