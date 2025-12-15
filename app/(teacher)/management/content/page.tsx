import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus, Edit } from "lucide-react"

export default async function ContentListPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rawStudySets } = await supabase
    .from('study_sets')
    .select('*')
    .eq('owner_id', user?.id!)
    .order('created_at', { ascending: false })

  const studySets = rawStudySets as any[]

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold">Content Management</h1>
            <p className="text-muted-foreground">Manage your study sets and learning materials.</p>
        </div>
        <Link href="/management/content/new">
            <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Study Set
            </Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {studySets?.map((set) => (
            <Card key={set.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>{set.title}</CardTitle>
                        <CardDescription>{set.description}</CardDescription>
                    </div>
                    <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2 text-sm text-muted-foreground">
                        <span className="bg-secondary px-2 py-1 rounded">Type: {set.type}</span>
                        <span className="bg-secondary px-2 py-1 rounded">Target: {set.target_repeat} repeats</span>
                        <span className={set.is_public ? "text-green-600" : "text-yellow-600"}>
                            {set.is_public ? "Public" : "Private"}
                        </span>
                    </div>
                </CardContent>
            </Card>
        ))}

        {(!studySets || studySets.length === 0) && (
            <div className="text-center py-12 border rounded-lg bg-muted/20">
                <p className="text-muted-foreground">You haven't created any content yet.</p>
            </div>
        )}
      </div>
    </div>
  )
}
