'use server'

import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

export async function updateProgress(studySetId: string, stats: { spoken: number, skipped: number }) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  // 1. Check if progress exists & Update/Insert
  let currentTotalRepeats = 0
  
  const { data: rawExisting } = await supabase
    .from('user_study_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('study_set_id', studySetId)
    .single()

  const existing = rawExisting as any

  if (existing) {
    currentTotalRepeats = (existing.total_repeat_count || 0) + 1
    // Update
    await (supabase
      .from('user_study_progress') as any)
      .update({
        total_repeat_count: currentTotalRepeats,
        total_speaking_count: (existing.total_speaking_count || 0) + stats.spoken,
        total_skip_count: (existing.total_skip_count || 0) + stats.skipped,
        last_studied_at: new Date().toISOString()
      })
      .eq('id', existing.id)
  } else {
    currentTotalRepeats = 1
    // Insert
    await (supabase
      .from('user_study_progress') as any)
      .insert({
        user_id: user.id,
        study_set_id: studySetId,
        total_repeat_count: currentTotalRepeats,
        total_speaking_count: stats.spoken,
        total_skip_count: stats.skipped,
        last_studied_at: new Date().toISOString()
      })
  }

  // 2. Check Assignments & Mark as Completed
  // Find pending assignments for this student & set
  const { data: pendingAssignments } = await supabase
      .from('assignments')
      .select('id, target_count')
      .eq('student_id', user.id)
      .eq('study_set_id', studySetId)
      .eq('is_completed', false)

  if (pendingAssignments && pendingAssignments.length > 0) {
      const completedIds = pendingAssignments
          .filter((a: any) => currentTotalRepeats >= a.target_count)
          .map((a: any) => a.id)

      if (completedIds.length > 0) {
          await supabase
              .from('assignments')
              .update({ is_completed: true })
              .in('id', completedIds)
      }
  }

  revalidatePath('/dashboard')
  revalidatePath('/assignments')
}

export async function deleteStudySet(id: string) {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
  
    if (!user) throw new Error("Unauthorized")
  
    // 1. Fetch study set details (Owner & Content)
    const { data: studySet, error: fetchError } = await supabase
        .from('study_sets')
        .select('owner_id, content')
        .eq('id', id)
        .single()
    
    if (fetchError || !studySet) {
        throw new Error("Study set not found")
    }
    
    // Check ownership
    if ((studySet as any).owner_id !== user.id) {
        throw new Error("You do not have permission to delete this.")
    }

    // Determine Client: Use Admin if Key exists (to bypass RLS), otherwise fallback to User Client
    let targetClient = supabase
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (serviceRoleKey) {
        targetClient = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )
    } else {
        console.warn("Missing SUPABASE_SERVICE_ROLE_KEY. Deletion may fail if RLS prevents deleting student records.")
    }

    // 2. Delete Associated Audio Files
    const contentItems = (studySet as any).content as any[] || []
    const filesToDelete: string[] = []
    
    contentItems.forEach(item => {
        if (item.audio_url && typeof item.audio_url === 'string') {
            // Check if it's hosted in our supabase bucket
            if (item.audio_url.includes('lms-assets/')) {
                 // Extract path: "audio/filename.webm"
                 const parts = item.audio_url.split('lms-assets/')
                 if (parts.length > 1) {
                     filesToDelete.push(parts[1])
                 }
            }
        }
    })

    if (filesToDelete.length > 0) {
        // Use targetClient (Admin or User)
        const { error: storageError } = await targetClient.storage
            .from('lms-assets')
            .remove(filesToDelete)
            
        if (storageError) {
            console.error("Warning: Failed to delete some audio files", storageError)
        }
    }

    // 3. Delete Study Progress (Explicit Cleanup)
    const { error: progressError } = await targetClient
        .from('user_study_progress')
        .delete()
        .eq('study_set_id', id)

    if (progressError) {
         console.error("Error deleting progress records:", progressError)
         throw new Error(`Failed to clean up student records: ${progressError.message}`)
    }

    // 4. Delete Assignments related to this study set (NEW STEP)
    const { error: assignmentsError } = await targetClient
        .from('assignments')
        .delete()
        .eq('study_set_id', id)

    if (assignmentsError) {
        console.error("Error deleting assignment records:", assignmentsError)
        throw new Error(`Failed to clean up assignment records: ${assignmentsError.message}`)
    }

    // 5. Delete the Study Set
    try {
        const { error } = await targetClient
            .from('study_sets')
            .delete()
            .eq('id', id)
            
        if (error) throw error
        
    } catch (error: any) {
        console.error("Delete failed", error)
        
        // Handle Foreign Key Constraint Violation (Postgres Code 23503)
        if (error.code === '23503') {
            throw new Error(
                "Cannot delete study set because student records still exist. " +
                "You likely need to add 'SUPABASE_SERVICE_ROLE_KEY' to your .env.local file to allow deleting other students' data."
            )
        }
        
        throw new Error(error.message || "Failed to delete study set")
    }
    
    revalidatePath('/management/content')
}