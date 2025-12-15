import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import StudyPlayer, { StudyItem } from "@/components/classroom/study-player"

interface ClassroomPageProps {
  params: {
    id: string
  }
}

export default async function ClassroomPage({ params }: ClassroomPageProps) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch the study set
  const { data: rawStudySet, error } = await supabase
    .from('study_sets')
    .select('*')
    .eq('id', params.id)
    .single()

  const studySet = rawStudySet as any

  if (error || !studySet) {
    console.error("Error fetching study set:", error)
    return notFound()
  }

  // Parse content (Supabase returns Json type, need to cast)
  // In a real app, use Zod to validate this structure at runtime
  const studyItems = studySet.content as unknown as StudyItem[]
  
  if (!studyItems || studyItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="text-2xl font-bold mb-4">Empty Study Set</h1>
        <p>This study set has no content yet.</p>
      </div>
    )
  }

  // This function would be a Server Action in a real implementation to update DB
  // For MVP, we pass a dummy handler or implement a client-side call inside the component
  // We'll handle the completion logic inside the client component for now via API call
  async function handleSessionComplete() {
    "use server"
    // Server Action logic would go here
    console.log("Session Complete Triggered on Server")
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{studySet.title}</h1>
        <p className="text-muted-foreground">{studySet.description}</p>
      </div>

      <StudyPlayer 
        studySetId={studySet.id}
        items={studyItems} 
        targetRepeat={studySet.target_repeat || 10}
      />
    </div>
  )
}
