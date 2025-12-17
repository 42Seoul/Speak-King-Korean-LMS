"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { TEACHER_MENU, STUDENT_MENU } from "./menu-items"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface MobileNavProps {
  role: string | null
}

export function MobileNav({ role }: MobileNavProps) {
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
  }, [role, pathname])

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur z-50 pb-safe">
      <nav className="flex justify-around items-center h-16">
        {menuItems.map((item, index) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          
          return (
            <Link
              key={index}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 relative",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                  <Icon className={cn("h-5 w-5", item.activeColor && isActive ? item.activeColor : "")} />
                  {item.badge && pendingCount > 0 && (
                      <span className="absolute -top-1 -right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border border-background">
                        {pendingCount}
                      </span>
                  )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
