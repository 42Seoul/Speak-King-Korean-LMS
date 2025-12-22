"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { CreateAssignmentDialog } from "./create-assignment-dialog"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { EditAssignmentDialog } from "@/components/teacher/edit-assignment-dialog"
import { DeleteAssignmentButton } from "@/components/teacher/delete-assignment-button"

export default function AssignmentsPage() {
  const router = useRouter()
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAssignments = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('assignments')
      .select(`
          id,
          target_count,
          assignment_type,
          due_date,
          is_completed,
          created_at,
          study_sets (title),
          profiles:student_id (email, nickname)
      `)
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    setAssignments(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchAssignments()

    // Set up realtime subscription to refresh when assignments change
    const supabase = createClient()
    const channel = supabase
      .channel('assignments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, () => {
        fetchAssignments()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Assignments</h1>
          <p className="text-muted-foreground">Manage and track student homework.</p>
        </div>
        <CreateAssignmentDialog />
      </div>

      <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground uppercase text-xs">
                  <tr>
                      <th className="px-4 py-3">Study Set</th>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Goal</th>
                      <th className="px-4 py-3">Due Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
              </thead>
              <tbody className="divide-y">
                  {loading ? (
                      <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                              Loading...
                          </td>
                      </tr>
                  ) : assignments.length === 0 ? (
                      <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                              No assignments found. Create one to get started.
                          </td>
                      </tr>
                  ) : (
                      assignments.map((item: any) => (
                          <tr key={item.id} className="bg-background hover:bg-muted/50 transition-colors">
                              <td className="px-4 py-3 font-medium">{item.study_sets?.title || "Unknown Set"}</td>
                              <td className="px-4 py-3">
                                  {item.profiles?.nickname || item.profiles?.email}
                              </td>
                              <td className="px-4 py-3">
                                  {item.assignment_type === 'new' ? '+' : ''}{item.target_count} Repeats
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                  {item.due_date ? format(new Date(item.due_date), "MMM d, h:mm a") : "-"}
                              </td>
                              <td className="px-4 py-3">
                                  {item.is_completed ? (
                                      <Badge variant="default" className="bg-green-600 hover:bg-green-700">Completed</Badge>
                                  ) : (
                                      <Badge variant="outline">Pending</Badge>
                                  )}
                                  {!item.is_completed && item.due_date && new Date(item.due_date) < new Date() && (
                                      <Badge variant="destructive" className="ml-2">Overdue</Badge>
                                  )}
                              </td>
                              <td className="px-4 py-3">
                                  <div className="flex justify-end gap-1">
                                      <EditAssignmentDialog
                                          assignment={{
                                              id: item.id,
                                              target_count: item.target_count,
                                              due_date: item.due_date,
                                              assignment_type: item.assignment_type,
                                              student_name: item.profiles?.nickname || item.profiles?.email || 'Unknown',
                                              study_set_title: item.study_sets?.title || 'Untitled'
                                          }}
                                      />
                                      <DeleteAssignmentButton
                                          assignmentId={item.id}
                                          studentName={item.profiles?.nickname || item.profiles?.email || 'Unknown'}
                                          studySetTitle={item.study_sets?.title || 'Untitled'}
                                      />
                                  </div>
                              </td>
                          </tr>
                      ))
                  )}
              </tbody>
          </table>
      </div>
    </div>
  )
}
