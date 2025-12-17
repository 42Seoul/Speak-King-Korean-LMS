'use server'

import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

export interface ProfileUpdateData {
  nickname?: string
  avatar_url?: string
  sprite_url?: string
}

export async function updateProfile(data: ProfileUpdateData) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  const updates = {
    ...data,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) {
    console.error("Profile update failed:", error)
    throw new Error("Failed to update profile")
  }

  revalidatePath('/account')
  revalidatePath('/dashboard') // Refresh dashboard if user info is shown there
}
