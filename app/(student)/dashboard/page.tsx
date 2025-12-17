import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { BookOpen, Trophy, User, AlertCircle } from "lucide-react"
import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"

export default async function DashboardPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Check role and redirect if teacher
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  const userRole = (profile as any)?.role

  if (userRole === 'teacher' || userRole === 'admin') {
    redirect('/management/dashboard')
  }

  // 1. Fetch study sets (public or owned by user)
  const { data: rawStudySets } = await supabase
    .from('study_sets')
    .select('*')
    .or(`is_public.eq.true,owner_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    
  const studySets = rawStudySets as any[]

  // 2. Fetch user's study progress
  const { data: rawUserProgress } = await supabase
    .from('user_study_progress')
    .select('study_set_id, total_repeat_count')
    .eq('user_id', user.id)
  
  const userProgress = rawUserProgress as { study_set_id: string; total_repeat_count: number }[]

  // 3. Fetch Pending Assignments (NEW)
  const { data: pendingAssignments } = await supabase
    .from('assignments')
    .select('study_set_id')
    .eq('student_id', user.id)
    .eq('is_completed', false)

  const pendingSetIds = new Set(pendingAssignments?.map((a: any) => a.study_set_id))

  // Map progress to study sets
  const studySetsWithProgress = studySets?.map(set => {
    const progress = userProgress?.find(p => p.study_set_id === set.id)
    return {
      ...set,
      completedCount: progress?.total_repeat_count || 0,
      isAssigned: pendingSetIds.has(set.id)
    }
  }) || []

  // Calculate total completed sessions for the dashboard stat
  const totalCompletedSessions = userProgress?.reduce((sum, p) => sum + (p.total_repeat_count || 0), 0) || 0


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Student Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-3">
        {/* My Level Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Level</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Level 1</div>
            <p className="text-xs text-muted-foreground">Keep learning to level up!</p>
          </CardContent>
        </Card>
        
        {/* Study Progress Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Progress</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCompletedSessions} Sessions</div>
            <p className="text-xs text-muted-foreground">Completed overall</p>
          </CardContent>
        </Card>

        {/* Profile Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium truncate">{user?.email}</div>
            <p className="text-xs text-muted-foreground">Student</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
         <h2 className="text-xl font-semibold">Available Study Sets</h2>
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {studySetsWithProgress && studySetsWithProgress.length > 0 ? (
                studySetsWithProgress.map((set) => (
                    <Card key={set.id} className={`hover:bg-muted/50 transition-colors relative ${set.isAssigned ? 'border-red-200 bg-red-50/5' : ''}`}>
                        {/* Assignment Badge */}
                        {set.isAssigned && (
                             <div className="absolute top-3 right-3 z-10">
                                 <Badge variant="destructive" className="animate-pulse flex gap-1 items-center px-2 py-0.5 text-[10px]">
                                     <AlertCircle className="h-3 w-3" />
                                     HOMEWORK
                                 </Badge>
                             </div>
                        )}

                        <CardHeader>
                            <CardTitle className="pr-8">{set.title}</CardTitle>
                            <CardDescription>{set.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-xs bg-secondary px-2 py-1 rounded">
                                    {set.type === 'word' ? 'Words' : 'Sentences'}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    Completed: <span className="font-semibold text-foreground">{set.completedCount}</span> times
                                </span>
                            </div>
                            <div className="mt-4">
                                <Link href={`/classroom/${set.id}`}>
                                    <Button size="sm" className="w-full" variant={set.isAssigned ? "default" : "secondary"}>
                                        {set.isAssigned ? "Start Homework" : "Start Learning"}
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                ))
            ) : (
                <Card className="col-span-full">
                    <CardHeader>
                    <CardTitle>No content available</CardTitle>
                    </CardHeader>
                    <CardContent>
                    <p className="text-muted-foreground mb-4">There are no study sets available yet.</p>
                    </CardContent>
                </Card>
            )}
         </div>
      </div>
    </div>
  )
}
