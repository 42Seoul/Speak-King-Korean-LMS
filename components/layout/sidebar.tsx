"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { TEACHER_MENU, STUDENT_MENU } from "./menu-items"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { LogOut, Shield } from "lucide-react"

interface SidebarProps {
  role: string | null
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const supabase = createClient()
  const [pendingCount, setPendingCount] = useState(0)

  const menuItems = role === 'teacher' ? TEACHER_MENU : STUDENT_MENU

  useEffect(() => {
    const fetchBadge = async () => {
        if (role === 'student') {
            const { count } = await supabase
                .from('assignments')
                .select('*', { count: 'exact', head: true })
                .eq('is_completed', false)
            
            setPendingCount(count || 0)
        }
    }
    fetchBadge()
  }, [role, pathname]) // Refresh on navigation

  return (
    <div className="hidden md:flex h-screen w-64 flex-col fixed left-0 top-0 border-r bg-background">
      {/* Logo */}
      <div className="h-14 flex items-center px-6 border-b">
        <Link href={role === 'teacher' ? "/management/dashboard" : "/dashboard"} className="font-bold text-xl flex items-center gap-2">
            <span className="text-primary">LMS</span> MVP
        </Link>
      </div>

      {/* Menu */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="grid gap-1 px-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            
            return (
              <Link
                key={index}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:text-primary hover:bg-muted",
                  isActive ? "bg-muted text-primary" : "text-muted-foreground",
                  item.activeColor && isActive ? item.activeColor : ""
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {item.badge && pendingCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {pendingCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Footer Actions */}
      <div className="border-t p-4 space-y-2">
         {role === 'student' && (
            <Link href="/become-teacher">
                <Button variant="outline" size="sm" className="w-full justify-start text-muted-foreground">
                    <Shield className="mr-2 h-4 w-4" />
                    Teacher Access
                </Button>
            </Link>
         )}
         <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-muted-foreground hover:text-red-500"
            onClick={async () => {
                await supabase.auth.signOut()
                window.location.href = '/login'
            }}
         >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
         </Button>
      </div>
    </div>
  )
}
