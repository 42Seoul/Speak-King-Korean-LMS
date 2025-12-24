"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Upload, Save, Trash2, AlertTriangle } from "lucide-react"
import { updateProfile, deleteUserAccount } from "@/app/actions/profile"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface ProfileFormProps {
  user: any
  profile: any
}

export function ProfileForm({ user, profile }: ProfileFormProps) {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const [nickname, setNickname] = useState(profile?.nickname || "")
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "")
  const [isMicEnabled, setIsMicEnabled] = useState(profile?.is_mic_enabled ?? true)

  // isStudent 조건 제거, 모든 역할에 동일 UI 적용
  // const isStudent = profile?.role === 'student'

  const handleFileUpload = async (file: File, bucket: string, setter: (url: string) => void, loadingSetter: (v: boolean) => void) => {
    try {
      loadingSetter(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
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
        is_mic_enabled: isMicEnabled
      })
      alert("Profile updated successfully!")
      router.refresh()
    } catch (error) {
      alert("Failed to update profile.")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
      setDeleting(true)
      try {
          await deleteUserAccount()
      } catch (e: any) {
          alert("Failed to delete account: " + e.message)
          setDeleting(false)
      }
  }

  return (
    <div className="space-y-8">
        <form onSubmit={handleSubmit} className="space-y-8">
        <div className="max-w-2xl mx-auto space-y-6"> {/* 1열 레이아웃으로 변경 및 중앙 정렬 */}
            {/* Basic Info & Avatar */}
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

            <Card>
                <CardHeader>
                    <CardTitle>Preferences</CardTitle>
                    <CardDescription>Manage your app settings.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between space-x-2">
                        <div className="space-y-0.5">
                            <Label htmlFor="mic-access">Microphone Access</Label>
                            <p className="text-sm text-muted-foreground">
                                Allow the application to use your microphone for speaking exercises.
                            </p>
                        </div>
                        <Switch
                            id="mic-access"
                            checked={isMicEnabled}
                            onCheckedChange={setIsMicEnabled}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className={`flex justify-center`}>
            <Button size="lg" type="submit" disabled={loading || uploadingAvatar}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
            </Button>
        </div>
        </form>


            {/* Danger Zone */}
            <div className="max-w-2xl mx-auto"> {/* 항상 중앙 정렬 */}
                <Card className="border-red-200 bg-red-50/10">
                    <CardHeader>
                        <CardTitle className="text-red-600 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            Danger Zone
                        </CardTitle>
                        <CardDescription>
                            Irreversible actions. Be careful.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">
                            Permanently delete your account and all associated data.
                        </p>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" disabled={deleting}>
                                    {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                    Delete Account
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete your
                                        account and remove your data from our servers.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700">
                                        Yes, delete my account
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardFooter>
                </Card>
            </div>
        </div>
  )
}