"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Trash2, Plus, Save, Loader2, FileAudio, CheckCircle2, Play, Sparkles, Pencil } from "lucide-react"
import { AudioRecorder } from "@/components/teacher/audio-recorder"
import { AiContentGenerator } from "@/components/teacher/ai-content-generator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface ContentItem {
  id: number
  text: string
  translation: string
  audio_url: string
  audioFile?: File | null // Temporary file for deferred upload
  image_url?: string
}

export default function CreateContentPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null) // Track which item's audio is playing

  // Mode: 'manual' | 'ai'
  const [mode, setMode] = useState<'manual' | 'ai'>('manual')

  // Form State
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [targetRepeat, setTargetRepeat] = useState(10)
  const [items, setItems] = useState<ContentItem[]>([
    { id: 1, text: "", translation: "", audio_url: "" }
  ])

  // Handlers
  const handleAddItem = () => {
    setItems(prev => [
      ...prev, 
      { id: Date.now(), text: "", translation: "", audio_url: "" }
    ])
  }

  const handleAiImport = (importedItems: ContentItem[]) => {
    // If the current list has only one empty item, replace it. Otherwise append.
    const isInitial = items.length === 1 && !items[0].text && !items[0].audio_url && !items[0].audioFile
    
    if (isInitial) {
        setItems(importedItems)
    } else {
        setItems(prev => [...prev, ...importedItems])
    }
    
    setMode('manual')
  }

  const handleRemoveItem = (id: number) => {
    if (items.length === 1) return
    setItems(prev => prev.filter(item => item.id !== id))
  }

  const handleUpdateItem = (id: number, field: keyof ContentItem, value: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const handleFileSelect = (id: number, file: File | null) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, audioFile: file } : item
    ))
  }

  const handlePlayPreview = (item: ContentItem) => {
    if (playingAudioId === item.id) { // Already playing this audio
      setPlayingAudioId(null);
      return;
    }

    let audioSrc: string | null = null;
    let objectUrl: string | null = null;

    if (item.audioFile) {
      objectUrl = URL.createObjectURL(item.audioFile);
      audioSrc = objectUrl;
    } else if (item.audio_url) {
      audioSrc = item.audio_url;
    }

    if (audioSrc) {
      setPlayingAudioId(item.id);
      const audio = new Audio(audioSrc);
      audio.volume = 0.8; // Set default volume
      audio.play();

      audio.onended = () => {
        setPlayingAudioId(null);
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl); // Clean up temporary URL
        }
      };
      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        alert("Failed to play audio. The file might be corrupted or inaccessible.");
        setPlayingAudioId(null);
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      };
    } else {
      alert("No audio source available for preview.");
    }
  };

  const handleSubmit = async () => {
    // Validation: Check if text is filled and either URL or File exists
    const isValid = items.every(i => i.text && (i.audio_url || i.audioFile))
    
    if (!title || !isValid) {
      alert("Please fill in all required fields (Title, Text) and ensure every item has an audio file or recording.")
      return
    }

    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error("Not authenticated")

      // 1. Upload Pending Files
      const finalItems = await Promise.all(items.map(async (item) => {
        if (item.audioFile) {
             const fileExt = item.audioFile.name.split('.').pop() || 'webm'
             const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
             const filePath = `audio/${fileName}`
             
             const { error } = await supabase.storage.from('lms-assets').upload(filePath, item.audioFile)
             if (error) throw error
             
             const { data } = supabase.storage.from('lms-assets').getPublicUrl(filePath)
             
             // Return item with new URL and remove temporary file
             const { audioFile, ...rest } = item
             return { ...rest, audio_url: data.publicUrl }
        }
        // If no file to upload, clean up the optional field anyway
        const { audioFile, ...rest } = item
        return rest
      }))

      // 2. Insert into DB
      const { error } = await supabase
        .from('study_sets')
        .insert({
          owner_id: user.id,
          title,
          description,
          type: 'sentence', // Defaulting for MVP
          target_repeat: targetRepeat,
          is_public: true, 
          content: finalItems 
        } as any)

      if (error) throw error

      alert("Study Set created successfully!")
      router.push('/management/content')
      router.refresh()

    } catch (error) {
      console.error("Save failed", error)
      alert("Failed to save study set. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Create New Study Set</h1>
        <p className="text-muted-foreground">Add sentences and audio for students to practice.</p>
      </div>

      {/* Metadata Section */}
      <Card>
        <CardContent className="pt-6 space-y-4">
            <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input 
                    id="title" 
                    placeholder="e.g. Basic Greetings - Week 1" 
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea 
                    id="desc" 
                    placeholder="Briefly describe this lesson..." 
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="repeat">Target Repeats (Session Goal)</Label>
                <Input 
                    id="repeat" 
                    type="number" 
                    value={targetRepeat}
                    onChange={e => setTargetRepeat(Number(e.target.value))}
                    min={1}
                />
            </div>
        </CardContent>
      </Card>

      {/* Mode Selection */}
      <div className="flex items-center justify-between">
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'manual' | 'ai')} className="w-[400px]">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">
                    <Pencil className="mr-2 h-4 w-4" /> Manual Entry
                </TabsTrigger>
                <TabsTrigger value="ai">
                    <Sparkles className="mr-2 h-4 w-4" /> AI Generator
                </TabsTrigger>
            </TabsList>
        </Tabs>
      </div>

      {mode === 'ai' ? (
        <AiContentGenerator onImport={handleAiImport} />
      ) : (
        <>
            {/* Items Section */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Study Items ({items.length})</h2>
                    <Button onClick={handleAddItem} variant="outline">
                        <Plus className="mr-2 h-4 w-4" /> Add Item
                    </Button>
                </div>

                {items.map((item, index) => (
                    <Card key={item.id}>
                        <CardContent className="pt-6 grid gap-4 md:grid-cols-[1fr_1fr_auto] items-start">
                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label>Korean Text (Target)</Label>
                                    <Input 
                                        placeholder="안녕하세요, 잘 지내세요?"
                                        value={item.text}
                                        onChange={e => handleUpdateItem(item.id, 'text', e.target.value)}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Translation (English)</Label>
                                    <Input 
                                        placeholder="Hello, how are you?"
                                        value={item.translation}
                                        onChange={e => handleUpdateItem(item.id, 'translation', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label>Audio Source</Label>
                                    
                                    {/* Status Indicator */}
                                    {item.audioFile ? (
                                        <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-md border border-green-200">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => handlePlayPreview(item)}
                                                disabled={loading || playingAudioId === item.id}
                                                className="h-6 w-6 p-0"
                                            >
                                                <Play className="h-3 w-3" />
                                            </Button>
                                            <span className="text-xs font-medium truncate max-w-[150px]">
                                                {item.audioFile.name.startsWith('recording-') ? 'Voice Recorded' : item.audioFile.name}
                                            </span>
                                            <Button 
                                                variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto"
                                                onClick={() => handleFileSelect(item.id, null)}
                                                disabled={loading}
                                            >
                                                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                            </Button>
                                        </div>
                                    ) : item.audio_url ? (
                                        <div className="flex items-center gap-2 p-2 bg-secondary rounded-md">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => handlePlayPreview(item)}
                                                disabled={loading || playingAudioId === item.id}
                                                className="h-6 w-6 p-0"
                                            >
                                                <Play className="h-3 w-3" />
                                            </Button>
                                            <span className="text-xs font-medium text-muted-foreground truncate max-w-[150px]">
                                                Existing Audio
                                            </span>
                                            <Button 
                                                variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto"
                                                onClick={() => handleUpdateItem(item.id, 'audio_url', "")}
                                                disabled={loading}
                                            >
                                                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <div className="relative">
                                                <Input 
                                                    type="file" 
                                                    accept="audio/*" 
                                                    className="w-[200px] text-xs"
                                                    onChange={e => {
                                                        if (e.target.files?.[0]) {
                                                            handleFileSelect(item.id, e.target.files[0])
                                                        }
                                                    }}
                                                    disabled={loading}
                                                />
                                            </div>
                                            <span className="text-muted-foreground text-xs">or</span>
                                            <AudioRecorder 
                                                onFileReady={(file) => handleFileSelect(item.id, file)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive hover:text-destructive mt-8"
                                onClick={() => handleRemoveItem(item.id)}
                                disabled={items.length === 1 || loading}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Footer Actions */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t flex justify-end container max-w-4xl">
                <Button size="lg" onClick={handleSubmit} disabled={loading}>
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading & Saving...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" /> Save Study Set
                        </>
                    )}
                </Button>
            </div>
        </>
      )}
    </div>
  )
}
