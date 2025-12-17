"use client"

import { createClient } from "@/lib/supabase/client"
import { LogOut, Shield, User } from "lucide-react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [role, setRole] = useState<string | null>(null)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            // 1. Get Role
            const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
            const userRole = (data as any)?.role || null
            setRole(userRole)

            // 2. Get Pending Assignment Count (if student)
            if (userRole === 'student') {
                const { count } = await supabase
                    .from('assignments')
                    .select('*', { count: 'exact', head: true })
                    .eq('student_id', user.id)
                    .eq('is_completed', false)
                
                setPendingCount(count || 0)
            }
        }
    }
    checkUser()
  }, [pathname]) // Refresh when route changes

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
            <Link href={role === 'teacher' ? "/management/dashboard" : "/dashboard"} className="font-bold text-lg hidden md:block">
              LMS MVP
            </Link>

            {/* Teacher Navigation */}
            {role === 'teacher' && (
                <nav className="flex items-center gap-4 text-sm font-medium">
                    <Link href="/management/dashboard" className="transition-colors hover:text-primary">Dashboard</Link>
                    <Link href="/management/monitoring" className="transition-colors hover:text-primary text-red-500 font-bold">Live</Link>
                    <Link href="/management/assignments" className="transition-colors hover:text-primary">Assignments</Link>
                    <Link href="/management/content" className="transition-colors hover:text-primary">Content</Link>
                    <Link href="/management/students" className="transition-colors hover:text-primary">Students</Link>
                </nav>
            )}
        </div>
        
        <div className="flex items-center gap-4">
          {role === 'student' && (
            <>
              <Link href="/assignments" className="relative group">
                <Button variant="ghost" size="sm" className="font-medium">
                  Assignments
                </Button>
                {pendingCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm group-hover:bg-red-600 transition-colors">
                        {pendingCount}
                    </span>
                )}
              </Link>
              <Link href="/become-teacher">
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                      <Shield className="mr-2 h-4 w-4" />
                      Teacher Access
                  </Button>
              </Link>
            </>
          )}

          <Link href="/account">
              <Button variant="ghost" size="icon" title="My Account">
                  <User className="h-4 w-4" />
              </Button>
          </Link>

          <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}