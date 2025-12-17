'use server'

import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

export interface AssignmentData {
  study_set_id: string
  student_ids: string[]
  assignment_type: 'accumulate' | 'new'
  target_count: number
  due_date: string
}

export async function createAssignments(data: AssignmentData) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  // Check teacher role
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
      throw new Error("Only teachers can create assignments")
  }

  // 1. Fetch current progress for these students on this study set
  const { data: progressList } = await supabase
    .from('user_study_progress')
    .select('user_id, total_repeat_count')
    .eq('study_set_id', data.study_set_id)
    .in('user_id', data.student_ids)

  const progressMap = new Map<string, number>()
  progressList?.forEach((p: any) => progressMap.set(p.user_id, p.total_repeat_count))

  // 2. Prepare insert data with smart target calculation
  const insertData = data.student_ids.map(studentId => {
    let finalTarget = data.target_count
    
    // If 'new', add current progress to target
    if (data.assignment_type === 'new') {
        const current = progressMap.get(studentId) || 0
        finalTarget += current
    }

    const currentProgress = progressMap.get(studentId) || 0
    const isAlreadyCompleted = currentProgress >= finalTarget

    return {
        teacher_id: user.id,
        student_id: studentId,
        study_set_id: data.study_set_id,
        assignment_type: data.assignment_type,
        target_count: finalTarget,
        due_date: data.due_date,
        is_completed: isAlreadyCompleted // Auto-complete if already met
    }
  })

  const { error } = await supabase
    .from('assignments')
    .insert(insertData)

  if (error) {
    console.error("Failed to create assignments:", error)
    throw new Error("Failed to create assignments")
  }

  revalidatePath('/management/assignments')
}
