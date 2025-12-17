'use server'

import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

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
  revalidatePath('/dashboard') 
}

export async function deleteUserAccount() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  // Use Service Role Key to delete user from Auth
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceRoleKey) {
      throw new Error("Server configuration error: Missing Service Role Key. Cannot delete account.")
  }

  const adminAuthClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
          auth: {
              autoRefreshToken: false,
              persistSession: false
          }
      }
  )

  const { error } = await adminAuthClient.auth.admin.deleteUser(user.id)

  if (error) {
      console.error("Delete user failed:", error)
      throw new Error("Failed to delete account")
  }

  // Sign out from current session
  await supabase.auth.signOut()
  
  redirect('/')
}