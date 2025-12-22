import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { CreateAssignmentDialog } from "./create-assignment-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

export default async function AssignmentsPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <div>Unauthorized</div>

  const { data: assignments } = await supabase
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
                  </tr>
              </thead>
              <tbody className="divide-y">
                  {assignments?.length === 0 ? (
                      <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                              No assignments found. Create one to get started.
                          </td>
                      </tr>
                  ) : (
                      assignments?.map((item: any) => (
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
                                  {/* Late Logic can be added here */}
                                  {!item.is_completed && new Date(item.due_date) < new Date() && (
                                      <Badge variant="destructive" className="ml-2">Overdue</Badge>
                                  )}
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
