"use client"

import { createClient } from "@/lib/supabase/client"
import { LogOut, Shield, User } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

export function Header() {
  const router = useRouter()
  const supabase = createClient()
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
            setRole((data as any)?.role || null)
        }
    }
    checkUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <Link href={role === 'teacher' ? "/management/dashboard" : "/dashboard"} className="font-bold text-lg">
          LMS MVP
        </Link>
        
        <div className="flex items-center gap-4">
          {role === 'student' && (
              <Link href="/become-teacher">
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                      <Shield className="mr-2 h-4 w-4" />
                      Teacher Access
                  </Button>
              </Link>
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
