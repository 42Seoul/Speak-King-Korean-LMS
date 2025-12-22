"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSpeechToText } from "@/hooks/use-speech"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Play, Mic, MicOff, ChevronRight, CheckCircle, AlertCircle, RefreshCw, Volume2, Lock, Trophy } from "lucide-react"
import { cn, evaluateSpeech } from "@/lib/utils"
import { updateProgress } from "@/app/actions/study"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

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

type SessionStage = "check_mic" | "ready" | "playing"

// Timing Constants
const SKIP_DELAY_MS = 4000
const SUCCESS_TRANSITION_DELAY = {
  PERFECT_MATCH: 100,
  SIMILARITY_MATCH: 500
} as const

export default function StudyPlayer({ studySetId, items, targetRepeat, onSessionComplete }: StudyPlayerProps) {
  const router = useRouter()

  // Session State
  const [stage, setStage] = useState<SessionStage>("check_mic")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [isFinished, setIsFinished] = useState(false)

  // Item State
  const [isPlaying, setIsPlaying] = useState(false)
  const [canSkip, setCanSkip] = useState(false) 
  const [feedback, setFeedback] = useState<"none" | "success" | "fail">("none")
  const [score, setScore] = useState(0)
  const [sessionStats, setSessionStats] = useState({ spoken: 0, skipped: 0 })

  const { status, transcript, interimTranscript, startListening, stopListening, resetTranscript, error } = useSpeechToText()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const skipTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const currentItem = items[currentIndex]
  const totalItems = items.length
  
  // Progress Calculation
  const totalSteps = totalItems * targetRepeat
  const currentStep = (completedCount * totalItems) + currentIndex
  const progressPercent = isFinished ? 100 : (currentStep / totalSteps) * 100

  // 2. Audio Playback Helper
  const playAudio = useCallback(() => {
    if (isFinished) return;

    if (audioRef.current && currentItem.audio_url) {
      setIsPlaying(true)

      audioRef.current.src = currentItem.audio_url
      audioRef.current.play()
        .catch(e => {
            console.error("Audio playback error:", e)
            setIsPlaying(false)
        })
    }
  }, [currentItem, isFinished])

  // 1. Initial Start / Item Change Logic
  useEffect(() => {
    if (stage !== "playing" || isFinished) return

    console.log('[Player] Item change', {
      currentIndex,
      currentText: currentItem.text,
      stage,
      completedCount
    })

    // Clear any pending skip timeout from previous item
    if (skipTimeoutRef.current) {
      clearTimeout(skipTimeoutRef.current)
      skipTimeoutRef.current = null
    }

    setFeedback("none")
    setScore(0)
    setCanSkip(false)

    // Critical: Stop listening BEFORE reset to ensure clean state
    stopListening()
    resetTranscript()

    playAudio()
  }, [currentIndex, stage, completedCount, isFinished, resetTranscript, stopListening, playAudio, currentItem.text])

  // Cleanup on Finish
  useEffect(() => {
      if (isFinished) {
          stopListening()

          // Clear any pending skip timeout
          if (skipTimeoutRef.current) {
            clearTimeout(skipTimeoutRef.current)
            skipTimeoutRef.current = null
          }

          if (audioRef.current) {
              audioRef.current.pause()
              audioRef.current.currentTime = 0
          }
      }
  }, [isFinished, stopListening])

  // 3. Audio Ended Handler
  const handleAudioEnded = useCallback(() => {
    if (isFinished) return
    setIsPlaying(false)
    startListening() // Now safe to start listening after audio is done.

    // Clear any existing skip timeout before setting a new one
    if (skipTimeoutRef.current) {
      clearTimeout(skipTimeoutRef.current)
    }

    // Set new skip timeout and store the ID
    skipTimeoutRef.current = setTimeout(() => {
      setCanSkip(true)
      skipTimeoutRef.current = null
    }, SKIP_DELAY_MS)
  }, [isFinished, startListening])

  // 4. Session Management
  const finishSession = useCallback(async (finalStats: { spoken: number, skipped: number, repeats: number }) => {
    setIsFinished(true)
    stopListening()

    try {
        await updateProgress(studySetId, finalStats)

        if (onSessionComplete) onSessionComplete()
        toast.success("세션 완료! 잘하셨습니다.")
        router.push('/dashboard')
    } catch (e) {
        console.error("Failed to save progress", e)
        toast.error("세션 저장에 실패했습니다.")
        router.push('/dashboard')
    }
  }, [studySetId, onSessionComplete, stopListening, router])

  // 5. Navigation Logic
  const handleNext = useCallback(async (result: "success" | "skipped") => {
    if (isFinished) return

    // Clear skip timeout when navigating
    if (skipTimeoutRef.current) {
      clearTimeout(skipTimeoutRef.current)
      skipTimeoutRef.current = null
    }

    const newStats = {
        spoken: sessionStats.spoken + (result === "success" ? 1 : 0),
        skipped: sessionStats.skipped + (result === "skipped" ? 1 : 0)
    }
    setSessionStats(newStats)

    if (currentIndex >= items.length - 1) {
        const newCount = completedCount + 1

        if (newCount >= targetRepeat) {
            setCompletedCount(newCount)
            finishSession({ ...newStats, repeats: newCount })
        } else {
            setCompletedCount(newCount)
            setCurrentIndex(0)
        }
    } else {
        setCurrentIndex(prev => prev + 1)
    }
  }, [isFinished, sessionStats, currentIndex, items.length, completedCount, targetRepeat, finishSession])

  // 6. Evaluation Logic
  useEffect(() => {
    // Combine finalized text with currently spoken text for instant feedback
    const fullText = (transcript + " " + interimTranscript).trim()

    if (!fullText || feedback === 'success' || isFinished) return

    const { score: newScore, passed, matchType } = evaluateSpeech(currentItem.text, fullText)
    setScore(newScore)

    if (passed) {
        console.log('[Player] Success!', {
          matchType,
          score: newScore,
          target: currentItem.text,
          input: fullText,
          currentIndex
        })
        setFeedback("success")
        stopListening()

        // Clear skip timeout since user succeeded
        if (skipTimeoutRef.current) {
          clearTimeout(skipTimeoutRef.current)
          skipTimeoutRef.current = null
        }
        setCanSkip(false) // Explicitly hide skip button on success

        // Dynamic delay based on match type
        // A_contains: Instant (fast) transition for perfect matches
        // B_similarity: Slight delay to let user finish speaking or see the score
        const delay = matchType === 'A_contains'
          ? SUCCESS_TRANSITION_DELAY.PERFECT_MATCH
          : SUCCESS_TRANSITION_DELAY.SIMILARITY_MATCH

        setTimeout(() => {
            handleNext("success")
        }, delay)
    }
  }, [transcript, interimTranscript, currentItem.text, feedback, stopListening, isFinished, currentIndex, handleNext])

  // --- STAGE 1: Mic Check & Error Handling ---
  const handleMicCheck = () => {
      startListening()
  }

  useEffect(() => {
      if (stage === 'check_mic' && status === 'listening') {
          stopListening() 
          setStage('ready')
      }
  }, [stage, status, stopListening])


  if (error === 'unsupported_browser') {
    return (
        <Card className="max-w-md mx-auto mt-10 text-center p-6">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Browser Not Supported</h3>
            <p className="text-muted-foreground mb-4">Voice recognition is not supported in this browser.</p>
        </Card>
    )
  }

  if (error === 'permission_denied') {
      return (
        <Card className="max-w-md mx-auto mt-10 text-center p-6 border-red-200 bg-red-50">
            <Lock className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-red-700 mb-2">Microphone Access Denied</h3>
            <p className="text-red-600 mb-6">Please allow microphone access in your browser settings.</p>
            <Button className="mt-6 w-full" variant="outline" onClick={() => window.location.reload()}>
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh Page
            </Button>
        </Card>
      )
  }

  if (stage === 'check_mic') {
      return (
        <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
            <Card className="max-w-md w-full border-2 shadow-xl">
                <CardContent className="p-8 flex flex-col items-center gap-6 text-center">
                    <div className="rounded-full bg-primary/10 p-6">
                        <Mic className="h-12 w-12 text-primary animate-pulse" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold">Microphone Check</h2>
                        <p className="text-muted-foreground">Click the button and say something!</p>
                    </div>
                    <Button size="lg" className="w-full text-lg h-12" onClick={handleMicCheck}>
                        Test Microphone
                    </Button>
                </CardContent>
            </Card>
        </div>
      )
  }

  if (stage === 'ready') {
    return (
        <div className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center p-4">
            <Card className="max-w-md w-full border-2 shadow-xl">
                <CardContent className="p-8 flex flex-col items-center gap-6 text-center">
                    <div className="rounded-full bg-green-100 p-6">
                        <CheckCircle className="h-12 w-12 text-green-600" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold">Microphone Ready!</h2>
                        <p className="text-muted-foreground">Listen to the audio and repeat what you hear.</p>
                    </div>
                    <Button size="lg" className="w-full text-lg h-12" onClick={() => setStage('playing')}>
                        <Play className="mr-2 h-5 w-5" /> Start Learning
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
           <span>Round {Math.min(completedCount + 1, targetRepeat)}/{targetRepeat}</span>
           <span>{isFinished ? items.length : currentIndex + 1} / {items.length}</span>
        </div>
        <Progress value={progressPercent} className="h-3" />
      </div>

      <Card className={cn(
          "flex-1 border-2 flex flex-col justify-center items-center relative overflow-hidden transition-all duration-500",
          feedback === 'success' ? "border-green-500 bg-green-50/50" : "bg-card"
      )}>
        <CardContent className="flex flex-col items-center gap-8 p-8 z-10 w-full flex-1 justify-center">
            {currentItem.image_url && !isFinished && (
                 <img src={currentItem.image_url} alt="Study" className="w-full max-h-48 object-contain rounded-md shadow-sm" />
            )}

            {isFinished ? (
                 <div className="flex flex-col items-center gap-6 animate-in zoom-in duration-500">
                    <div className="rounded-full bg-yellow-100 p-8">
                        <Trophy className="h-16 w-16 text-yellow-500" />
                    </div>
                    <h2 className="text-3xl font-bold">Session Complete!</h2>
                    <p className="text-xl text-muted-foreground">Redirecting to dashboard...</p>
                 </div>
            ) : (
                <>
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
                                    { (interimTranscript || transcript).slice(-50) || "..."}
                                </p>                            </div>
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
                </>
            )}
        </CardContent>

        {/* Footer Controls */}
        {!isFinished && (
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

                {/* Mic Indicator */}
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
        )}
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