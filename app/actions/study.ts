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

    // Initialize Admin Client to bypass RLS for cleanup
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )

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
        // Use Admin client for storage as well to ensure permission
        const { error: storageError } = await supabaseAdmin.storage
            .from('lms-assets')
            .remove(filesToDelete)
            
        if (storageError) {
            console.error("Warning: Failed to delete some audio files", storageError)
        }
    }

    // 3. Delete Study Progress (Explicit Cleanup using Admin)
    const { error: progressError } = await supabaseAdmin
        .from('user_study_progress')
        .delete()
        .eq('study_set_id', id)

    if (progressError) {
         console.error("Warning: Failed to delete progress records", progressError)
         // If this fails, the next step will likely fail with FK violation
         throw new Error("Failed to clear student progress records. Cannot delete study set.")
    }

    // 4. Delete the Study Set (using Admin to be safe, though Owner should have permission)
    const { error } = await supabaseAdmin
        .from('study_sets')
        .delete()
        .eq('id', id)
        
    if (error) {
        console.error("Delete failed", error)
        throw new Error("Failed to delete study set")
    }
    
    revalidatePath('/management/content')
}