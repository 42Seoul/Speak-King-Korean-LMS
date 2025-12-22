import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { format } from "date-fns"
import { Calendar, CheckCircle2, AlertCircle, Play, BarChart3 } from "lucide-react"

export default async function StudentAssignmentsPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <div>Please log in.</div>

  // 1. Fetch Assignments
  const { data: assignments } = await supabase
    .from('assignments')
    .select(`
        *,
        study_sets (title, description),
        profiles:teacher_id (nickname)
    `)
    .eq('student_id', user.id)
    .order('due_date', { ascending: true })

  // 2. Fetch User Progress (to calculate remaining count)
  const { data: progressList } = await supabase
    .from('user_study_progress')
    .select('study_set_id, total_repeat_count')
    .eq('user_id', user.id)

  const progressMap = new Map<string, number>()
  progressList?.forEach((p: any) => progressMap.set(p.study_set_id, p.total_repeat_count))

  const pending = assignments?.filter((a: any) => !a.is_completed) || []
  const completed = assignments?.filter((a: any) => a.is_completed) || []

  return (
    <div className="container py-8 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">My Assignments</h1>
        <p className="text-muted-foreground">Check your progress and finish your homework.</p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">To Do ({pending.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {pending.length === 0 ? (
             <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/5">
                <p className="text-muted-foreground">No pending assignments. Great job! 🎉</p>
             </div>
          ) : (
            pending.map((item: any) => {
                const isOverdue = new Date(item.due_date) < new Date()
                const current = progressMap.get(item.study_set_id) || 0
                const target = item.target_count
                const remaining = Math.max(0, target - current)
                const percent = Math.min(100, Math.floor((current / target) * 100))

                return (
                    <Card key={item.id} className={isOverdue ? "border-red-200 bg-red-50/10" : ""}>
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex gap-2 mb-2">
                                        <Badge variant={item.assignment_type === 'new' ? 'secondary' : 'outline'}>
                                            {item.assignment_type === 'new' ? 'Extra Practice' : 'Total Goal'}
                                        </Badge>
                                        {isOverdue && <Badge variant="destructive">Overdue</Badge>}
                                    </div>
                                    <CardTitle>{item.study_sets?.title}</CardTitle>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Assigned by T. {item.profiles?.nickname}
                                    </p>
                                </div>
                                <div className="text-right">
                                    {!isOverdue && (
                                        <Badge variant="outline" className="text-orange-500 border-orange-200 mb-1">
                                            D-{Math.ceil((new Date(item.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}
                                        </Badge>
                                    )}
                                    <div className="text-xs text-muted-foreground flex items-center justify-end gap-1 mt-1">
                                        <Calendar className="h-3 w-3" />
                                        {format(new Date(item.due_date), "MMM d")}
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {/* Progress Section */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm font-medium">
                                        <span className="flex items-center gap-2">
                                            <BarChart3 className="h-4 w-4 text-primary" />
                                            Progress: {percent}%
                                        </span>
                                        <span className="text-primary">
                                            {current} / {target} Repeats
                                        </span>
                                    </div>
                                    <Progress value={percent} className="h-2" />
                                    <p className="text-xs text-muted-foreground text-right">
                                        You need <b>{remaining}</b> more repeats to finish.
                                    </p>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <Link href={`/classroom/${item.study_set_id}`}>
                                        <Button className="w-full sm:w-auto">
                                            <Play className="mr-2 h-4 w-4" />
                                            Start Studying
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )
            })
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-4">
            {completed.map((item: any) => (
                 <Card key={item.id} className="opacity-80">
                    <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                             <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                <CardTitle className="line-through text-muted-foreground">{item.study_sets?.title}</CardTitle>
                             </div>
                             <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                         <div className="text-sm text-muted-foreground">
                            Goal met: {item.target_count} Repeats
                         </div>
                    </CardContent>
                </Card>
            ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}