'use server'

import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

// In production, this should be in process.env.TEACHER_SECRET_CODE
const SECRET_CODE = "SKKLMS_TEACHER_2025"

export async function upgradeToTeacher(prevState: any, formData: FormData) {
  const code = formData.get('code') as string
  
  if (code !== SECRET_CODE) {
    return { message: "Invalid secret code.", success: false }
  }

  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { message: "You must be logged in first.", success: false }
  }

  // Update role to teacher
  const { error } = await (supabase
    .from('profiles') as any)
    .update({ role: 'teacher' })
    .eq('id', user.id)

  if (error) {
    console.error(error)
    return { message: "Failed to update role.", success: false }
  }

  // Redirect to teacher dashboard
  redirect('/management/dashboard')
}
