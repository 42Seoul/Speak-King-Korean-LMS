'use server'

import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

export async function updateProgress(studySetId: string, stats: { spoken: number, skipped: number }) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  // 1. Check if progress exists
  const { data: rawExisting } = await supabase
    .from('user_study_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('study_set_id', studySetId)
    .single()

  const existing = rawExisting as any

  if (existing) {
    // Update
    await (supabase
      .from('user_study_progress') as any)
      .update({
        total_repeat_count: (existing.total_repeat_count || 0) + 1,
        total_speaking_count: (existing.total_speaking_count || 0) + stats.spoken,
        total_skip_count: (existing.total_skip_count || 0) + stats.skipped,
        last_studied_at: new Date().toISOString()
      })
      .eq('id', existing.id)
  } else {
    // Insert
    await (supabase
      .from('user_study_progress') as any)
      .insert({
        user_id: user.id,
        study_set_id: studySetId,
        total_repeat_count: 1,
        total_speaking_count: stats.spoken,
        total_skip_count: stats.skipped,
        last_studied_at: new Date().toISOString()
      })
  }

  revalidatePath('/dashboard')
}
