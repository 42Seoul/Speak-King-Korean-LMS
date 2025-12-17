import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { Calendar, CheckCircle2, AlertCircle, Play } from "lucide-react"

export default async function StudentAssignmentsPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <div>Please log in.</div>

  const { data: assignments } = await supabase
    .from('assignments')
    .select(`
        *,
        study_sets (title, description),
        profiles:teacher_id (nickname)
    `)
    .eq('student_id', user.id)
    .order('due_date', { ascending: true })

  const pending = assignments?.filter((a: any) => !a.is_completed) || []
  const completed = assignments?.filter((a: any) => a.is_completed) || []

  return (
    <div className="container py-8 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">My Assignments</h1>
        <p className="text-muted-foreground">Keep up with your study goals.</p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">To Do ({pending.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {pending.length === 0 ? (
             <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">No pending assignments. Great job! 🎉</p>
             </div>
          ) : (
            pending.map((item: any) => {
                const isOverdue = new Date(item.due_date) < new Date()
                return (
                    <Card key={item.id} className={isOverdue ? "border-red-200 bg-red-50/10" : ""}>
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <Badge variant={item.assignment_type === 'new' ? 'secondary' : 'outline'} className="mb-2">
                                        {item.assignment_type === 'new' ? 'Extra Practice' : 'Total Goal'}
                                    </Badge>
                                    <CardTitle>{item.study_sets?.title}</CardTitle>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Assigned by T. {item.profiles?.nickname}
                                    </p>
                                </div>
                                {isOverdue ? (
                                    <Badge variant="destructive">Overdue</Badge>
                                ) : (
                                    <Badge variant="outline" className="text-orange-500 border-orange-200">
                                        D-{Math.ceil((new Date(item.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col sm:flex-row justify-between gap-4 items-end sm:items-center">
                                <div className="space-y-1 text-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Calendar className="h-4 w-4" />
                                        Due: {format(new Date(item.due_date), "PPP p")}
                                    </div>
                                    <div className="flex items-center gap-2 font-medium">
                                        <AlertCircle className="h-4 w-4 text-primary" />
                                        Goal: {item.target_count} Repeats
                                    </div>
                                </div>
                                <Link href={`/classroom/${item.study_set_id}`}>
                                    <Button>
                                        <Play className="mr-2 h-4 w-4" />
                                        Start Now
                                    </Button>
                                </Link>
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
