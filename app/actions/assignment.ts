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
  if ((profile as any)?.role !== 'teacher' && (profile as any)?.role !== 'admin') {
      throw new Error("Only teachers can create assignments")
  }

  // Verify study set exists and teacher owns it
  const { data: studySet, error: studySetError } = await supabase
    .from('study_sets')
    .select('owner_id, is_public, targeted_students')
    .eq('id', data.study_set_id)
    .single()

  if (studySetError || !studySet) {
    throw new Error("Study set not found")
  }

  if ((studySet as any).owner_id !== user.id) {
    throw new Error("You can only create assignments for your own study sets")
  }

  // Verify each student has access to the study set
  const studySetData = studySet as any
  const unauthorizedStudents: string[] = []

  for (const studentId of data.student_ids) {
    const hasAccess =
      studySetData.is_public ||
      (studySetData.targeted_students && studySetData.targeted_students.includes(studentId))

    if (!hasAccess) {
      unauthorizedStudents.push(studentId)
    }
  }

  if (unauthorizedStudents.length > 0) {
    // Get student emails for better error message
    const { data: students } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', unauthorizedStudents)

    const studentEmails = students?.map((s: any) => s.email || s.id).join(', ') || unauthorizedStudents.join(', ')
    throw new Error(`These students don't have access to this study set: ${studentEmails}`)
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
    .insert(insertData as any)

  if (error) {
    console.error("Failed to create assignments:", error)
    throw new Error("Failed to create assignments")
  }

  revalidatePath('/management/assignments')
}

export async function deleteAssignment(id: string) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  // 1. Check teacher role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.role !== 'teacher' && (profile as any)?.role !== 'admin') {
    throw new Error("Only teachers can delete assignments")
  }

  // 2. Verify ownership
  const { data: assignment } = await supabase
    .from('assignments')
    .select('teacher_id')
    .eq('id', id)
    .single()

  if (!assignment) {
    throw new Error("Assignment not found")
  }

  if ((assignment as any).teacher_id !== user.id) {
    throw new Error("You can only delete your own assignments")
  }

  // 3. Delete assignment
  const { error } = await supabase
    .from('assignments')
    .delete()
    .eq('id', id)

  if (error) {
    console.error("Failed to delete assignment:", error)
    throw new Error("Failed to delete assignment")
  }

  revalidatePath('/management/assignments')
}

export interface UpdateAssignmentData {
  target_count: number
  due_date: string
  assignment_type: 'accumulate' | 'new'
}

export async function updateAssignment(id: string, data: UpdateAssignmentData) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  // 1. Check teacher role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.role !== 'teacher' && (profile as any)?.role !== 'admin') {
    throw new Error("Only teachers can update assignments")
  }

  // 2. Verify ownership and get current assignment data
  const { data: assignment } = await supabase
    .from('assignments')
    .select('teacher_id, student_id, study_set_id')
    .eq('id', id)
    .single()

  if (!assignment) {
    throw new Error("Assignment not found")
  }

  if ((assignment as any).teacher_id !== user.id) {
    throw new Error("You can only update your own assignments")
  }

  // 3. If 'new' type, recalculate target based on current progress
  let finalTargetCount = data.target_count

  if (data.assignment_type === 'new') {
    const { data: progress } = await supabase
      .from('user_study_progress')
      .select('total_repeat_count')
      .eq('user_id', (assignment as any).student_id)
      .eq('study_set_id', (assignment as any).study_set_id)
      .single()

    const currentProgress = (progress as any)?.total_repeat_count || 0
    finalTargetCount = currentProgress + data.target_count
  }

  // 4. Recalculate completion status
  const { data: progress } = await supabase
    .from('user_study_progress')
    .select('total_repeat_count')
    .eq('user_id', (assignment as any).student_id)
    .eq('study_set_id', (assignment as any).study_set_id)
    .single()

  const currentProgress = (progress as any)?.total_repeat_count || 0
  const isCompleted = currentProgress >= finalTargetCount

  // 5. Update assignment
  // @ts-ignore - Supabase type inference issue with assignments table
  const { error } = await supabase
    .from('assignments')
    .update({
      target_count: finalTargetCount,
      due_date: data.due_date,
      assignment_type: data.assignment_type,
      is_completed: isCompleted
    })
    .eq('id', id)

  if (error) {
    console.error("Failed to update assignment:", error)
    throw new Error("Failed to update assignment")
  }

  revalidatePath('/management/assignments')
  revalidatePath('/assignments') // Refresh student page as well
}
