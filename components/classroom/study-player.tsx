"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSpeechToText } from "@/hooks/use-speech"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Play, Mic, MicOff, ChevronRight, CheckCircle, AlertCircle, RefreshCw, Volume2 } from "lucide-react"
import { cn, evaluateSpeech } from "@/lib/utils"
import { updateProgress } from "@/app/actions/study"
import { useRouter } from "next/navigation"

export interface StudyItem {
  id: number
  text: string
  translation: string
  audio_url: string
  image_url?: string | null
  video_url?: string | null
}

interface StudyPlayerProps {
  studySetId: string
  items: StudyItem[]
  targetRepeat: number
  onSessionComplete?: () => void
}

export default function StudyPlayer({ studySetId, items, targetRepeat, onSessionComplete }: StudyPlayerProps) {
  const router = useRouter()
  
  // Session State
  const [isSessionStarted, setIsSessionStarted] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [completedCount, setCompletedCount] = useState(0) // Rounds
  
  // Item State
  const [isPlaying, setIsPlaying] = useState(false)
  const [canSkip, setCanSkip] = useState(false) // 4s timer
  const [feedback, setFeedback] = useState<"none" | "success" | "fail">("none")
  const [score, setScore] = useState(0)
  const [sessionStats, setSessionStats] = useState({ spoken: 0, skipped: 0 })

  const { status, transcript, interimTranscript, startListening, stopListening, resetTranscript, error } = useSpeechToText()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  const currentItem = items[currentIndex]
  const totalItems = items.length
  const progressPercent = ((currentIndex + (completedCount * totalItems)) / (totalItems * targetRepeat)) * 100

  // 1. Initial Start / Item Change Logic
  useEffect(() => {
    if (!isSessionStarted) return

    // Reset item state
    setFeedback("none")
    setScore(0)
    setCanSkip(false)
    resetTranscript()
    stopListening()
    
    // Play Audio
    playAudio()
  }, [currentIndex, isSessionStarted, completedCount]) // Dependencies ensure this runs on new item or session start

  // 2. Audio Playback Helper
  const playAudio = useCallback(() => {
    if (audioRef.current && currentItem.audio_url) {
      setIsPlaying(true)
      stopListening() // Ensure we don't listen while playing (REQ-06)
      
      // Reset source just in case
      audioRef.current.src = currentItem.audio_url
      audioRef.current.play()
        .catch(e => {
            console.error("Audio playback error:", e)
            setIsPlaying(false)
            // If autoplay fails (browser policy), we might need user interaction again
            // But since we have a "Start" button, it should be fine.
        })
    }
  }, [currentItem, stopListening])

  // 3. Audio Ended Handler (REQ-07, REQ-14)
  const handleAudioEnded = () => {
    setIsPlaying(false)
    startListening() // REQ-07: Auto start listening

    // REQ-14: Show Skip button after 4 seconds
    setTimeout(() => {
      setCanSkip(true)
    }, 4000)
  }

  // 4. Evaluation Logic (REQ-11, REQ-12, REQ-13)
  useEffect(() => {
    if (!transcript || feedback === 'success') return

    const { score: newScore, passed } = evaluateSpeech(currentItem.text, transcript)
    setScore(newScore)

    if (passed) {
        setFeedback("success")
        stopListening()
        // Success sound?
        
        // REQ-13: Auto advance after 1.5s
        setTimeout(() => {
            handleNext("success")
        }, 1500)
    } else {
        // Only show fail if user pauses? Or just keep it as 'none' until success?
        // Requirements say "Real-time visualization". We keep listening.
        // We can update score in real-time but maybe not set 'fail' state permanently unless they skip.
    }

  }, [transcript, currentItem.text, feedback, stopListening])


  // 5. Navigation Logic
  const handleNext = async (result: "success" | "skipped") => {
    // Update Stats
    if (result === "success") {
        setSessionStats(prev => ({ ...prev, spoken: prev.spoken + 1 }))
    } else {
        setSessionStats(prev => ({ ...prev, skipped: prev.skipped + 1 }))
    }

    // Check if round complete
    if (currentIndex >= items.length - 1) {
        const newCount = completedCount + 1
        setCompletedCount(newCount)
        
        if (newCount >= targetRepeat) {
            // Session Complete
            finishSession()
        } else {
            setCurrentIndex(0)
        }
    } else {
        setCurrentIndex(prev => prev + 1)
    }
  }

  const finishSession = async () => {
    try {
        await updateProgress(studySetId, sessionStats)
        if (onSessionComplete) onSessionComplete()
        alert("Session Complete! Great job.")
        router.push('/dashboard')
    } catch (e) {
        console.error("Failed to save progress", e)
        alert("Session saved locally but failed to sync.")
        router.push('/dashboard')
    }
  }

  // REQ-03: Error Handling
  if (error) {
    return (
        <Card className="max-w-md mx-auto mt-10">
            <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <h3 className="text-xl font-bold">Browser Not Supported</h3>
                <p className="text-muted-foreground">{error}</p>
                <p className="text-sm">Please use Chrome, Edge, or Safari.</p>
                <Button onClick={() => router.push('/dashboard')}>Go Back</Button>
            </CardContent>
        </Card>
    )
  }

  // REQ-05: Start Overlay
  if (!isSessionStarted) {
    return (
        <div className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center p-4">
            <Card className="max-w-md w-full border-2 shadow-xl">
                <CardContent className="p-8 flex flex-col items-center gap-6 text-center">
                    <div className="rounded-full bg-primary/10 p-6">
                        <Volume2 className="h-12 w-12 text-primary" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold">Ready to Speak?</h2>
                        <p className="text-muted-foreground">
                            We will play an audio clip. Listen carefully and repeat what you hear.
                        </p>
                    </div>
                    <Button size="lg" className="w-full text-lg h-12" onClick={() => setIsSessionStarted(true)}>
                        Start Learning
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 p-4 relative min-h-[600px] flex flex-col">
      {/* Top Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground font-medium">
           <span>Round {completedCount + 1}/{targetRepeat}</span>
           <span>{currentIndex + 1} / {items.length}</span>
        </div>
        <Progress value={progressPercent} className="h-3" />
      </div>

      <Card className={cn(
          "flex-1 border-2 flex flex-col justify-center items-center relative overflow-hidden transition-all duration-500",
          feedback === 'success' ? "border-green-500 bg-green-50/50" : "bg-card"
      )}>
        <CardContent className="flex flex-col items-center gap-8 p-8 z-10 w-full flex-1 justify-center">
            {/* Image Placeholder */}
            {currentItem.image_url && (
                 <img src={currentItem.image_url} alt="Study" className="w-full max-h-48 object-contain rounded-md shadow-sm" />
            )}

            {/* Main Text */}
            <div className="text-center space-y-4">
                <h2 className={cn(
                    "text-3xl md:text-4xl font-bold tracking-tight transition-colors duration-300",
                    feedback === 'success' ? "text-green-600" : "text-foreground"
                )}>
                    {currentItem.text}
                </h2>
                <p className="text-xl text-muted-foreground font-medium">{currentItem.translation}</p>
            </div>

            {/* Live Feedback Area */}
            <div className="w-full min-h-[80px] flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-secondary/30">
                {status === 'listening' ? (
                     <div className="flex flex-col items-center animate-pulse gap-2">
                        <div className="flex items-center gap-2 text-primary font-semibold">
                            <Mic className="h-5 w-5" />
                            <span>Listening...</span>
                        </div>
                        <p className="text-lg font-medium text-center break-keep">
                            {interimTranscript || transcript || "..."}
                        </p>
                     </div>
                ) : feedback === 'success' ? (
                     <div className="flex flex-col items-center gap-2 text-green-600 animate-in zoom-in duration-300">
                        <CheckCircle className="h-8 w-8" />
                        <span className="text-lg font-bold">Perfect!</span>
                     </div>
                ) : isPlaying ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Volume2 className="h-5 w-5 animate-pulse" />
                        <span>Listening to audio...</span>
                    </div>
                ) : (
                    <div className="text-muted-foreground">Waiting...</div>
                )}
            </div>
        </CardContent>

        {/* Footer Controls */}
        <div className="p-6 w-full border-t bg-secondary/10 flex items-center justify-center gap-6">
             {/* Replay Button */}
             <Button 
                variant="outline" 
                size="icon" 
                className="h-12 w-12 rounded-full"
                onClick={playAudio}
                disabled={isPlaying || feedback === 'success'}
            >
                <Play className="h-5 w-5" />
            </Button>

            {/* Mic Indicator (Visual Only mostly, since it's auto) */}
            <div className={cn(
                "h-16 w-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg",
                status === 'listening' ? "bg-red-500 scale-110" : "bg-primary"
            )}>
                {status === 'listening' ? (
                     <Mic className="h-8 w-8 text-white" />
                ) : (
                     <MicOff className="h-8 w-8 text-white/50" />
                )}
            </div>

            {/* Skip / Next Button */}
            {canSkip && feedback !== 'success' && (
                <Button 
                    variant="ghost" 
                    className="h-12 px-6 rounded-full text-muted-foreground hover:text-foreground animate-in fade-in slide-in-from-bottom-4 duration-500"
                    onClick={() => handleNext("skipped")}
                >
                    Skip <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
            )}
        </div>
      </Card>
        
      {/* Hidden Audio Element */}
      <audio 
        ref={audioRef} 
        onEnded={handleAudioEnded}
        preload="auto"
        className="hidden"
      />
    </div>
  )
}
