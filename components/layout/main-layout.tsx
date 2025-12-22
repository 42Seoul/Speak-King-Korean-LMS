"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Sidebar } from "./sidebar"
import { MobileNav } from "./mobile-nav"
import { Header } from "@/components/shared/header" // 기존 헤더 (모바일용으로 재사용 또는 간소화 필요)
import { Loader2 } from "lucide-react"

export function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
          setRole((data as any)?.role || 'student')
        }
      } catch (e) {
        console.error("Auth check failed", e)
      } finally {
        setLoading(false)
      }
    }
    checkUser()
  }, [])

  if (loading) {
      return (
          <div className="flex h-screen items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
      )
  }

  // 로그인하지 않은 상태(Landing Page 등)에서는 레이아웃 적용 제외
  if (!role) {
      return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar role={role} />

      {/* Content Area */}
      <div className="md:pl-64 flex flex-col min-h-screen pb-16 md:pb-0">
        
        {/* Mobile Header (Only visible on mobile) */}
        <div className="md:hidden">
            {/* 기존 Header 컴포넌트를 사용하되, 네비게이션은 숨김 처리된 상태 */}
            <Header /> 
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
            {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <MobileNav role={role} />
    </div>
  )
}
