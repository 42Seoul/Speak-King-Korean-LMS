"use client"

import { useState, useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Loader2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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

const fetchStudySets = async () => {
  const supabase = createClient()
  const { data } = await supabase
    .from('study_sets')
    .select('id, title')
    .order('created_at', { ascending: false })
  return data || []
}

const fetchLiveProgress = async ({ queryKey }: any) => {
  const [_, { showLiveOnly, selectedSetId }] = queryKey
  const supabase = createClient()
  
  let query = supabase
    .from('user_study_progress')
    .select(`
      *,
      profiles (email, nickname),
      study_sets (title, target_repeat)
    `)
    .order('last_studied_at', { ascending: false })

  // Filter: Live Only (Last 5 minutes window for "Active" status)
  if (showLiveOnly) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      query = query.gte('last_studied_at', fiveMinutesAgo)
  }

  // Filter: Specific Study Set
  if (selectedSetId && selectedSetId !== 'all') {
      query = query.eq('study_set_id', selectedSetId)
  }

  const { data, error } = await query

  if (error) throw error
  return data as unknown as MonitoringData[]
}

export default function LiveMonitoringPage() {
  const [showLiveOnly, setShowLiveOnly] = useState(false) // Default to OFF to prevent accidental long polling
  const [selectedSetId, setSelectedSetId] = useState<string>("all")
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-off timer logic
  useEffect(() => {
    if (showLiveOnly) {
        toast.info("Live monitoring started. It will stop automatically in 60 minutes.")
        
        timeoutRef.current = setTimeout(() => {
            setShowLiveOnly(false)
            toast.warning("Live monitoring stopped automatically (60 min limit).")
        }, 60 * 60 * 1000) // 60 minutes
    } else {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
        }
    }

    return () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }
    }
  }, [showLiveOnly])

  // Fetch Study Sets for Filter
  const { data: studySets } = useQuery({
      queryKey: ['study-sets-list'],
      queryFn: fetchStudySets
  })

  // Fetch Monitoring Data
  const { data, isLoading } = useQuery({
    queryKey: ['live-progress', { showLiveOnly, selectedSetId }],
    queryFn: fetchLiveProgress,
    // Poll every 1 minute (60000ms) only when Live Mode is ON
    refetchInterval: showLiveOnly ? 60000 : false, 
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
                Live Monitoring
                {isLoading && showLiveOnly && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </h1>
            <p className="text-muted-foreground">
                {showLiveOnly 
                    ? "Updating every minute. Auto-off in 60 min." 
                    : "Live monitoring is paused. Enable to see real-time updates."}
            </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
             {/* Filter: Study Set */}
             <div className="w-[200px]">
                <Select value={selectedSetId} onValueChange={setSelectedSetId}>
                    <SelectTrigger>
                        <SelectValue placeholder="All Study Sets" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Study Sets</SelectItem>
                        {studySets?.map((set: any) => (
                            <SelectItem key={set.id} value={set.id}>
                                {set.title}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
             </div>

             {/* Toggle: Live Only */}
             <div className="flex items-center space-x-2 border p-2 rounded-md bg-card">
                <Switch 
                    id="live-mode" 
                    checked={showLiveOnly}
                    onCheckedChange={setShowLiveOnly}
                />
                <Label htmlFor="live-mode" className="cursor-pointer flex items-center gap-2">
                    {showLiveOnly ? (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                    ) : (
                        <span className="relative flex h-2 w-2">
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-300"></span>
                        </span>
                    )}
                    Live Mode
                </Label>
            </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data?.map((item) => {
            const target = item.study_sets?.target_repeat || 10
            const current = item.total_repeat_count
            const percent = Math.min((current / target) * 100, 100)

            return (
                <Card key={item.id} className={showLiveOnly ? "border-l-4 border-l-primary" : ""}>
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                            <CardTitle className="text-base truncate pr-2">
                                {item.profiles?.nickname || item.profiles?.email}
                            </CardTitle>
                            <Badge variant={showLiveOnly ? "secondary" : "outline"} className="text-xs">
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
                <p className="text-muted-foreground">No records found matching current filters.</p>
            </div>
        )}
      </div>
    </div>
  )
}
