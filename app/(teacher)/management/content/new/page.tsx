"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Trash2, Plus, Upload, Save, Loader2 } from "lucide-react"
import { AudioRecorder } from "@/components/teacher/audio-recorder"

// Types matching the JSON structure
interface ContentItem {
  id: number
  text: string
  translation: string
  audio_url: string
  image_url?: string
}

export default function CreateContentPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState<number | null>(null) // ID of item being uploaded

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

  const handleRemoveItem = (id: number) => {
    if (items.length === 1) return
    setItems(prev => prev.filter(item => item.id !== id))
  }

  const handleUpdateItem = (id: number, field: keyof ContentItem, value: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const handleFileUpload = async (id: number, file: File) => {
    try {
      setUploading(id)
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `audio/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('lms-assets')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('lms-assets')
        .getPublicUrl(filePath)

      handleUpdateItem(id, 'audio_url', publicUrl)

    } catch (error) {
      console.error("Upload failed", error)
      alert("Failed to upload audio file. Check bucket permissions.")
    } finally {
      setUploading(null)
    }
  }

  const handleSubmit = async () => {
    if (!title || items.some(i => !i.text || !i.audio_url)) {
      alert("Please fill in all required fields (Title, Text, Audio).")
      return
    }

    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error("Not authenticated")

      // Insert into DB
      const { error } = await supabase
        .from('study_sets')
        .insert({
          owner_id: user.id,
          title,
          description,
          type: 'sentence', // Defaulting for MVP
          target_repeat: targetRepeat,
          is_public: true, // Making public by default for easier testing
          content: items // JSONB magic
        } as any)

      if (error) throw error

      alert("Study Set created successfully!")
      router.push('/management/content')
      router.refresh()

    } catch (error) {
      console.error("Save failed", error)
      alert("Failed to save study set.")
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
                            {/* Option A: Direct URL */}
                            <Input 
                                placeholder="https://..."
                                value={item.audio_url}
                                onChange={e => handleUpdateItem(item.id, 'audio_url', e.target.value)}
                                className="text-xs font-mono"
                            />
                            {/* Option B: Upload or Record */}
                            <div className="flex items-center gap-2">
                                <Input 
                                    type="file" 
                                    accept="audio/*" 
                                    className="text-xs"
                                    onChange={e => {
                                        if (e.target.files?.[0]) {
                                            handleFileUpload(item.id, e.target.files[0])
                                        }
                                    }}
                                    disabled={uploading === item.id}
                                />
                                <span className="text-muted-foreground text-xs">or</span>
                                <AudioRecorder 
                                    onFileReady={(file) => handleFileUpload(item.id, file)}
                                    isUploading={uploading === item.id}
                                />
                                {uploading === item.id && <Loader2 className="h-4 w-4 animate-spin" />}
                            </div>
                        </div>
                    </div>

                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:text-destructive mt-8"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={items.length === 1}
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
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
            ) : (
                <>
                    <Save className="mr-2 h-4 w-4" /> Save Study Set
                </>
            )}
         </Button>
      </div>
    </div>
  )
}
