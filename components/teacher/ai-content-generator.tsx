"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Play, Download, Wand2, CheckCircle2, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import JSZip from "jszip"

// Type definitions matching the parent page
interface ContentItem {
  id: number
  text: string
  translation: string
  audio_url: string
  audioFile?: File | null
  image_url?: string
}

interface AiContentGeneratorProps {
  onImport: (items: ContentItem[]) => void
}

interface VoiceOption {
  id: string
  name: string
  gender: string
  languageCodes: string[]
}

interface VoiceGroup {
  title: string
  quality: number
  pricing: string
  description: string
  voices: VoiceOption[]
}

interface ProcessedResult {
  id: number
  original: string
  translation: string
  corrected: string
  binaryData: string | null
  audioFileName: string
  error: string | null
}

export function AiContentGenerator({ onImport }: AiContentGeneratorProps) {
  // State
  const [voicesData, setVoicesData] = useState<Record<string, VoiceGroup> | null>(null)
  const [loadingVoices, setLoadingVoices] = useState(false)
  
  const [inputText, setInputText] = useState("")
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("gemini-2.5-pro-tts") // Default to Gemini
  const [speakingRate, setSpeakingRate] = useState([1.0])
  const [pitch, setPitch] = useState([0])
  const [promptText, setPromptText] = useState("") // For Gemini
  const [useSSML, setUseSSML] = useState(false)
  
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<ProcessedResult[]>([])
  
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null)

  // Load voices on mount
  useEffect(() => {
    async function loadVoices() {
      try {
        setLoadingVoices(true)
        const res = await fetch('/api/google-voices')
        const data = await res.json()
        if (data.voiceGroups) {
          setVoicesData(data.voiceGroups)
        }
      } catch (error) {
        console.error("Failed to load voices", error)
      } finally {
        setLoadingVoices(false)
      }
    }
    loadVoices()
  }, [])

  // Helper: Base64 to Blob
  const base64ToBlob = (base64: string, type: string) => {
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type })
  }

  // Action: Process Sentences
  const handleProcess = async () => {
    if (!inputText.trim()) return

    const sentences = inputText.split('\n').filter(s => s.trim())
    if (sentences.length === 0) return

    setProcessing(true)
    setProgress(0)
    setResults([])

    try {
      // Determine options
      const isGemini = selectedVoiceId === 'gemini-2.5-pro-tts'
      const voiceOptions = {
        voiceName: selectedVoiceId,
        audioEncoding: 'MP3',
        speakingRate: speakingRate[0],
        pitch: pitch[0],
        languageCode: 'ko-KR',
        // Gemini specific
        voicePrompt: isGemini ? promptText : undefined,
        // Standard specific
        ssmlText: useSSML ? null : null // Currently not exposing complex SSML for list mode
      }

      const res = await fetch('/api/google-process-sentences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawSentences: sentences,
          voiceOptions
        })
      })

      if (!res.ok) throw new Error("Processing failed")

      const data: ProcessedResult[] = await res.json()
      setResults(data)
      setProgress(100)

    } catch (error) {
      console.error("Processing error", error)
      alert("Failed to generate audio. Please check settings and try again.")
    } finally {
      setProcessing(false)
    }
  }

  // Action: Play Audio
  const handlePlay = (item: ProcessedResult) => {
    if (!item.binaryData) return
    
    if (playingAudioId === item.id) {
      setPlayingAudioId(null)
      // Note: Actual stop logic would require ref to audio element
      return
    }

    const blob = base64ToBlob(item.binaryData, 'audio/mp3')
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    
    setPlayingAudioId(item.id)
    audio.play()
    
    audio.onended = () => {
      setPlayingAudioId(null)
      URL.revokeObjectURL(url)
    }
    audio.onerror = () => {
        setPlayingAudioId(null)
        URL.revokeObjectURL(url)
    }
  }

  // Action: Download ZIP
  const handleDownloadZip = async () => {
    const validItems = results.filter(r => r.binaryData && !r.error)
    if (validItems.length === 0) return

    const zip = new JSZip()
    
    // Add text manifest
    let manifest = "Korean Study Set\n\n"
    
    validItems.forEach(item => {
      const blob = base64ToBlob(item.binaryData!, 'audio/mp3')
      zip.file(item.audioFileName, blob)
      
      manifest += `ID: ${item.id}\nOriginal: ${item.original}\nTranslation: ${item.translation}\nFile: ${item.audioFileName}\n\n`
    })
    
    zip.file("manifest.txt", manifest)

    const content = await zip.generateAsync({ type: "blob" })
    const url = URL.createObjectURL(content)
    const a = document.createElement("a")
    a.href = url
    a.download = `study-set-${Date.now()}.zip`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Action: Import to Parent
  const handleImport = () => {
    const validItems = results.filter(r => r.binaryData && !r.error)
    if (validItems.length === 0) return

    const contentItems: ContentItem[] = validItems.map(item => {
       const blob = base64ToBlob(item.binaryData!, 'audio/mp3')
       const file = new File([blob], item.audioFileName, { type: 'audio/mp3' })
       
       return {
         id: Date.now() + item.id, // Ensure unique ID collision avoidance
         text: item.original,
         translation: item.translation,
         audio_url: "", // Will be filled after upload in parent
         audioFile: file
       }
    })

    onImport(contentItems)
  }

  // Render Helpers
  const renderVoiceOptions = () => {
    if (loadingVoices) return <div className="text-sm text-muted-foreground">Loading voices...</div>
    if (!voicesData) return <div className="text-sm text-destructive">Failed to load voices. Check API.</div>

    return (
      <Select value={selectedVoiceId} onValueChange={setSelectedVoiceId}>
        <SelectTrigger>
          <SelectValue placeholder="Select a voice" />
        </SelectTrigger>
        <SelectContent>
            {Object.entries(voicesData).map(([key, group]) => (
                <div key={key}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                        {group.title} ({group.quality}★)
                    </div>
                    {group.voices.map(voice => (
                        <SelectItem key={voice.id} value={voice.id}>
                            {voice.name} ({voice.gender})
                        </SelectItem>
                    ))}
                </div>
            ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-[1fr_300px] gap-6">
        {/* Left Column: Input */}
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Input Text</CardTitle>
                    <CardDescription>Enter Korean sentences. Each line will be a separate card.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Textarea 
                        placeholder="안녕하세요&#13;&#10;반갑습니다&#13;&#10;오늘 날씨가 좋네요"
                        className="min-h-[300px] text-lg leading-relaxed resize-none"
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                    />
                </CardContent>
            </Card>
        </div>

        {/* Right Column: Settings */}
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Voice Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Voice Model</Label>
                        {renderVoiceOptions()}
                    </div>

                    {selectedVoiceId === 'gemini-2.5-pro-tts' ? (
                        <div className="space-y-2">
                            <Label>Style Prompt (Gemini)</Label>
                            <Textarea 
                                placeholder="e.g. Cheerful and energetic"
                                value={promptText}
                                onChange={e => setPromptText(e.target.value)}
                                className="h-24"
                            />
                        </div>
                    ) : (
                        <>
                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <Label>Speed ({speakingRate[0]}x)</Label>
                                </div>
                                <Slider 
                                    value={speakingRate} 
                                    min={0.25} max={4.0} step={0.25} 
                                    onValueChange={setSpeakingRate}
                                />
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <Label>Pitch ({pitch[0]})</Label>
                                </div>
                                <Slider 
                                    value={pitch} 
                                    min={-20} max={20} step={1} 
                                    onValueChange={setPitch}
                                />
                            </div>
                        </>
                    )}

                    <Button 
                        className="w-full" 
                        size="lg" 
                        onClick={handleProcess} 
                        disabled={processing || !inputText.trim()}
                    >
                        {processing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                            </>
                        ) : (
                            <>
                                <Wand2 className="mr-2 h-4 w-4" /> Generate Audio
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
      </div>

      {/* Results Section */}
      {results.length > 0 && (
        <div className="space-y-4 border-t pt-8">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Generated Results ({results.length})</h2>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleDownloadZip}>
                        <Download className="mr-2 h-4 w-4" /> Download ZIP
                    </Button>
                    <Button onClick={handleImport} className="bg-green-600 hover:bg-green-700">
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Use This Content
                    </Button>
                </div>
            </div>

            <div className="grid gap-4">
                {results.map((item) => (
                    <Card key={item.id} className={item.error ? "border-red-200 bg-red-50" : ""}>
                        <CardContent className="pt-6 grid md:grid-cols-[auto_1fr_auto] gap-4 items-center">
                            <Badge variant={item.error ? "destructive" : "secondary"} className="h-fit">
                                #{item.id}
                            </Badge>
                            
                            <div className="space-y-1">
                                <p className="text-lg font-medium">{item.original}</p>
                                <p className="text-muted-foreground">{item.translation}</p>
                                {item.error && <p className="text-destructive text-sm">{item.error}</p>}
                            </div>

                            <div className="flex items-center gap-2">
                                {item.binaryData && (
                                    <Button 
                                        variant={playingAudioId === item.id ? "destructive" : "outline"}
                                        size="icon"
                                        onClick={() => handlePlay(item)}
                                    >
                                        <Play className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
      )}
    </div>
  )
}
