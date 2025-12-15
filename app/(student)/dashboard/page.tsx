import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { BookOpen, Trophy, User } from "lucide-react"
import { redirect } from "next/navigation"

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

  // Fetch study sets (public or owned by user)
  const { data: rawStudySets } = await supabase
    .from('study_sets')
    .select('*')
    .or(`is_public.eq.true,owner_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    
  const studySets = rawStudySets as any[]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Student Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-3">
        {/* ... (Keep existing stats cards) ... */}
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
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Progress</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0 Sessions</div>
            <p className="text-xs text-muted-foreground">Completed this week</p>
          </CardContent>
        </Card>

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
            {studySets && studySets.length > 0 ? (
                studySets.map((set) => (
                    <Card key={set.id} className="hover:bg-muted/50 transition-colors">
                        <CardHeader>
                            <CardTitle>{set.title}</CardTitle>
                            <CardDescription>{set.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between items-center">
                                <span className="text-xs bg-secondary px-2 py-1 rounded">
                                    {set.type === 'word' ? 'Words' : 'Sentences'}
                                </span>
                                <Link href={`/classroom/${set.id}`}>
                                    <Button size="sm">Start Learning</Button>
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
