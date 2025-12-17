import { Header } from "@/components/shared/header"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  const userRole = (profile as any)?.role

  if (userRole !== 'teacher' && userRole !== 'admin') {
     // Optional: Redirect to student dashboard if not teacher
     // redirect('/dashboard') 
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-6">
        {/* Navigation moved to Header */}
        {children}
      </main>
    </div>
  )
}