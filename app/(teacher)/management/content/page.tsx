import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"
import { StudySetItem } from "@/components/teacher/study-set-item"

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
            <StudySetItem key={set.id} set={set} />
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