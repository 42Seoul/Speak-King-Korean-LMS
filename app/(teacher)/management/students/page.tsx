import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default async function StudentManagementPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  
  // Fetch all students (profiles where role is student)
  const { data: rawStudents, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'student')
    .order('created_at', { ascending: false })

  const students = rawStudents as any[]

  if (error) {
    console.error("Error fetching students:", error)
    return <div>Error loading students.</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold">Students</h1>
            <p className="text-muted-foreground">Manage your enrolled students.</p>
        </div>
      </div>

      <div className="grid gap-4">
        {students?.map((student) => (
            <Card key={student.id}>
                <CardContent className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                        <Avatar>
                            <AvatarImage src={student.avatar_url || ""} />
                            <AvatarFallback>{student.email?.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="font-semibold">{student.nickname || "No Name"}</div>
                            <div className="text-sm text-muted-foreground">{student.email}</div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-8 text-sm">
                        <div className="text-center">
                            <div className="font-bold">Lv. {student.level || 1}</div>
                            <div className="text-muted-foreground">Level</div>
                        </div>
                        <div className="text-center">
                            <div className="font-bold">{new Date(student.created_at!).toLocaleDateString()}</div>
                            <div className="text-muted-foreground">Joined</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        ))}

        {(!students || students.length === 0) && (
             <div className="text-center py-12 border rounded-lg bg-muted/20">
                <p className="text-muted-foreground">No students found.</p>
            </div>
        )}
      </div>
    </div>
  )
}
