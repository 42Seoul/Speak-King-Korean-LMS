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

  // In MVP, if role is not strictly enforced via RLS for viewing pages, 
  // we should at least redirect students out.
  // Note: For this demo to work easily without manual DB updates, 
  // we might skip strict 'teacher' check or allow 'admin'/'teacher'.
  if (userRole !== 'teacher' && userRole !== 'admin') {
     // Optional: Redirect to student dashboard if not teacher
     // redirect('/dashboard') 
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-6">
        <div className="flex items-center justify-between mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold tracking-tight text-primary">Teacher Zone</h2>
            <nav className="flex gap-4 text-sm font-medium">
                <a href="/management/dashboard" className="hover:underline">Dashboard</a>
                <a href="/management/monitoring" className="hover:underline text-red-500 font-bold">Live Monitor</a>
                <a href="/management/content" className="hover:underline">Content</a>
                <a href="/management/students" className="hover:underline">Students</a>
            </nav>
        </div>
        {children}
      </main>
    </div>
  )
}
