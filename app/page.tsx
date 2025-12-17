import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Fetch profile to check role
    const { data: rawProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    const profile = rawProfile as any
    
    if (profile?.role === 'teacher' || profile?.role === 'admin') {
      redirect('/management/dashboard')
    } else {
      redirect('/dashboard')
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">Speaking King Korean LMS</h1>
      <p className="text-xl mb-8">Fast, repetitive speaking practice.</p>
      
      <div className="flex gap-4">
        <Link href="/login">
          <Button size="lg">Login to Start</Button>
        </Link>
      </div>
    </main>
  );
}