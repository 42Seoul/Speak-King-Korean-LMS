import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { EditContentForm } from "./edit-form"

interface EditPageProps {
  params: {
    id: string
  }
}

export default async function EditPage({ params }: EditPageProps) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch data
  const { data: rawStudySet, error } = await supabase
    .from('study_sets')
    .select('*')
    .eq('id', params.id)
    .single()

  const studySet = rawStudySet as any

  if (error || !studySet) {
    return notFound()
  }

  // Check ownership
  if (studySet.owner_id !== user.id) {
    return <div>Permission Denied</div>
  }

  return (
    <EditContentForm 
        studySetId={studySet.id} 
        initialData={{
            title: studySet.title,
            description: studySet.description,
            target_repeat: studySet.target_repeat,
            content: studySet.content
        }} 
    />
  )
}
