"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Upload, User, Sparkles, Save } from "lucide-react"
import { updateProfile } from "@/app/actions/profile"
import { useRouter } from "next/navigation"

interface ProfileFormProps {
  user: any
  profile: any
}

export function ProfileForm({ user, profile }: ProfileFormProps) {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingSprite, setUploadingSprite] = useState(false)

  const [nickname, setNickname] = useState(profile?.nickname || "")
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "")
  const [spriteUrl, setSpriteUrl] = useState(profile?.sprite_url || "")

  const handleFileUpload = async (file: File, bucket: string, setter: (url: string) => void, loadingSetter: (v: boolean) => void) => {
    try {
      loadingSetter(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}` // Save directly in root or folder? Let's use root for avatars bucket or folder in lms-assets

      // We'll reuse 'lms-assets' bucket but maybe under 'profiles/' folder?
      // Or if there is an 'avatars' bucket. Let's assume 'lms-assets' for simplicity as we used it before.
      // Ideally avatars should be public.
      const storagePath = `profiles/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('lms-assets')
        .upload(storagePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('lms-assets')
        .getPublicUrl(storagePath)

      setter(publicUrl)

    } catch (error) {
      console.error("Upload failed", error)
      alert("Failed to upload image.")
    } finally {
      loadingSetter(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await updateProfile({
        nickname,
        avatar_url: avatarUrl,
        sprite_url: spriteUrl
      })
      alert("Profile updated successfully!")
      router.refresh()
    } catch (error) {
      alert("Failed to update profile.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column: Basic Info & Avatar */}
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>Update your public profile details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative group cursor-pointer">
                            <Avatar className="h-24 w-24 border-2 border-border">
                                <AvatarImage src={avatarUrl} />
                                <AvatarFallback className="text-2xl">{nickname?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Upload className="h-6 w-6 text-white" />
                            </div>
                            <Input 
                                type="file" 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                accept="image/*"
                                onChange={(e) => {
                                    if(e.target.files?.[0]) handleFileUpload(e.target.files[0], 'lms-assets', setAvatarUrl, setUploadingAvatar)
                                }}
                                disabled={uploadingAvatar}
                            />
                            {uploadingAvatar && (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-full">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">Click to change avatar</p>
                    </div>

                    {/* Nickname */}
                    <div className="grid gap-2">
                        <Label htmlFor="nickname">Nickname</Label>
                        <Input 
                            id="nickname" 
                            value={nickname} 
                            onChange={(e) => setNickname(e.target.value)} 
                            placeholder="Display Name"
                        />
                    </div>

                    {/* Email (Read-only) */}
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" value={user.email} disabled className="bg-muted" />
                    </div>
                    
                    {/* Role (Read-only) */}
                    <div className="grid gap-2">
                        <Label htmlFor="role">Role</Label>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-secondary rounded text-sm font-medium capitalize">
                                {profile?.role || 'Student'}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Right Column: Sprite & Extras */}
        <div className="space-y-6">
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-yellow-500" />
                        Character Sprite
                    </CardTitle>
                    <CardDescription>Upload a custom character sprite for gamification.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center space-y-6 h-[calc(100%-88px)]">
                    <div className="relative w-full aspect-square max-w-[200px] bg-secondary/30 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden group">
                        {spriteUrl ? (
                            <img src={spriteUrl} alt="Sprite" className="w-full h-full object-contain p-2" />
                        ) : (
                            <div className="text-center p-4 text-muted-foreground">
                                <User className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                <span className="text-sm">No Sprite Uploaded</span>
                            </div>
                        )}

                        {/* Upload Overlay */}
                        <div className="absolute inset-0 bg-black/5 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <Upload className="h-8 w-8 text-primary mb-2" />
                            <span className="text-sm font-medium text-primary bg-background/80 px-2 py-1 rounded">
                                Upload Sprite
                            </span>
                        </div>

                        <Input 
                            type="file" 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                            accept="image/*"
                            onChange={(e) => {
                                if(e.target.files?.[0]) handleFileUpload(e.target.files[0], 'lms-assets', setSpriteUrl, setUploadingSprite)
                            }}
                            disabled={uploadingSprite}
                        />

                        {uploadingSprite && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        )}
                    </div>
                    
                    <div className="text-center space-y-1">
                        <p className="text-sm font-medium">Character Preview</p>
                        <p className="text-xs text-muted-foreground">Recommended: Transparent PNG</p>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>

      <div className="flex justify-end">
        <Button size="lg" type="submit" disabled={loading || uploadingAvatar || uploadingSprite}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
        </Button>
      </div>
    </form>
  )
}
