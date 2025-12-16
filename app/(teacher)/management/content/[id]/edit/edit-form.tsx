"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Trash2, Plus, Save, Loader2 } from "lucide-react"
import { AudioRecorder } from "@/components/teacher/audio-recorder"

interface ContentItem {
  id: number
  text: string
  translation: string
  audio_url: string
  image_url?: string
}

interface EditContentFormProps {
  studySetId: string
  initialData: {
    title: string
    description: string
    target_repeat: number
    content: ContentItem[]
  }
}

export function EditContentForm({ studySetId, initialData }: EditContentFormProps) {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState<number | null>(null)

  const [title, setTitle] = useState(initialData.title)
  const [description, setDescription] = useState(initialData.description || "")
  const [targetRepeat, setTargetRepeat] = useState(initialData.target_repeat || 10)
  const [items, setItems] = useState<ContentItem[]>(initialData.content || [])

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

      const { error: uploadError } = await supabase.storage
        .from('lms-assets')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('lms-assets')
        .getPublicUrl(filePath)

      handleUpdateItem(id, 'audio_url', publicUrl)

    } catch (error) {
      console.error("Upload failed", error)
      alert("Failed to upload audio file.")
    } finally {
      setUploading(null)
    }
  }

  const handleSubmit = async () => {
    if (!title || items.some(i => !i.text || !i.audio_url)) {
      alert("Please fill in all required fields (Title, Target Text, Audio).")
      return
    }

    try {
      setLoading(true)
      
      const { error } = await (supabase
        .from('study_sets') as any)
        .update({
          title,
          description,
          target_repeat: targetRepeat,
          content: items,
          updated_at: new Date().toISOString()
        })
        .eq('id', studySetId)

      if (error) throw error

      alert("Study Set updated successfully!")
      router.push('/management/content')
      router.refresh()

    } catch (error) {
      console.error("Update failed", error)
      alert("Failed to update study set.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Edit Study Set</h1>
        <p className="text-muted-foreground">Modify sentences and audio.</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
            <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input 
                    id="title" 
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea 
                    id="desc" 
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="repeat">Target Repeats</Label>
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

      <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Study Items ({items.length})</h2>
            <Button onClick={handleAddItem} variant="outline">
                <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
        </div>

        {items.map((item) => (
            <Card key={item.id}>
                <CardContent className="pt-6 grid gap-4 md:grid-cols-[1fr_1fr_auto] items-start">
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label>Target Text (Korean)</Label>
                            <Input 
                                placeholder="안녕하세요"
                                value={item.text}
                                onChange={e => handleUpdateItem(item.id, 'text', e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Translation (Meaning)</Label>
                            <Input 
                                placeholder="Hello"
                                value={item.translation}
                                onChange={e => handleUpdateItem(item.id, 'translation', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label>Audio Source</Label>
                            <Input 
                                placeholder="https://..."
                                value={item.audio_url}
                                onChange={e => handleUpdateItem(item.id, 'audio_url', e.target.value)}
                                className="text-xs font-mono"
                            />
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

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t flex justify-end container max-w-4xl">
         <Button size="lg" onClick={handleSubmit} disabled={loading}>
            {loading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...
                </>
            ) : (
                <>
                    <Save className="mr-2 h-4 w-4" /> Update Study Set
                </>
            )}
         </Button>
      </div>
    </div>
  )
}
