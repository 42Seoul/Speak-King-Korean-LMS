"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Loader2 } from "lucide-react"

interface MonitoringData {
  id: string
  user_id: string
  study_set_id: string
  total_repeat_count: number
  total_speaking_count: number
  last_studied_at: string
  profiles: {
    email: string
    nickname: string | null
  } | null
  study_sets: {
    title: string
    target_repeat: number
  } | null
}

const fetchLiveProgress = async () => {
  const supabase = createClient()
  
  // Fetch progress updated in the last 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('user_study_progress')
    .select(`
      *,
      profiles (email, nickname),
      study_sets (title, target_repeat)
    `)
    .gte('last_studied_at', fiveMinutesAgo)
    .order('last_studied_at', { ascending: false })

  if (error) throw error
  return data as unknown as MonitoringData[]
}

export default function LiveMonitoringPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['live-progress'],
    queryFn: fetchLiveProgress,
    refetchInterval: 5000, // Poll every 5 seconds
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
                Live Monitoring
                {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </h1>
            <p className="text-muted-foreground">Real-time view of students active in the last 5 minutes.</p>
        </div>
        <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm font-medium">Live</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data?.map((item) => {
            const target = item.study_sets?.target_repeat || 10
            const current = item.total_repeat_count
            const percent = Math.min((current / target) * 100, 100)

            return (
                <Card key={item.id} className="border-l-4 border-l-primary">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                            <CardTitle className="text-base truncate pr-2">
                                {item.profiles?.nickname || item.profiles?.email}
                            </CardTitle>
                            <Badge variant="secondary" className="text-xs">
                                {new Date(item.last_studied_at).toLocaleTimeString()}
                            </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                            {item.study_sets?.title}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span>Progress</span>
                                <span>{current} / {target} Rounds</span>
                            </div>
                            <Progress value={percent} className="h-2" />
                            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                <div>🗣️ Spoken: {item.total_speaking_count}</div>
                                {/* <div>⏭️ Skipped: {item.total_skip_count}</div> */}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )
        })}

        {(!data || data.length === 0) && !isLoading && (
             <div className="col-span-full text-center py-20 border rounded-lg bg-muted/10 border-dashed">
                <p className="text-muted-foreground">No active students right now.</p>
            </div>
        )}
      </div>
    </div>
  )
}
