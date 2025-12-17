"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
// Progress 컴포넌트 더이상 사용 안 함
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Loader2, RefreshCw, User, Clock, Filter } from "lucide-react"

interface MonitoringData {
  id: string
  user_id: string
  study_set_id: string
  total_repeat_count: number
  total_speaking_count: number
  total_skip_count: number
  last_studied_at: string
  profiles: {
    email: string
    nickname: string | null
    avatar_url: string | null
  } | null
  study_sets: {
    title: string
    target_repeat: number
  } | null
}

interface StudySetOption {
    id: string
    title: string
}

const fetchStudySets = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('study_sets').select('id, title').order('created_at', { ascending: false })
    return data as StudySetOption[] || []
}

// Fetch progress updated in the last 24 hours
const fetchLiveProgress = async () => {
  const supabase = createClient()
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('user_study_progress')
    .select(`
      *,
      profiles (email, nickname, avatar_url),
      study_sets (title, target_repeat)
    `)
    .gte('last_studied_at', oneDayAgo)
    .order('last_studied_at', { ascending: false })

  if (error) throw error
  return data as unknown as MonitoringData[]
}

export default function LiveMonitoringPage() {
  const [isLive, setIsLive] = useState(false)
  const [autoOffTime, setAutoOffTime] = useState<Date | null>(null)
  const [selectedSetId, setSelectedSetId] = useState<string>("all")

  // Fetch Study Sets for Filter
  const { data: studySets } = useQuery({
      queryKey: ['study-sets-list'],
      queryFn: fetchStudySets
  })

  // Fetch Monitoring Data
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['live-progress'],
    queryFn: fetchLiveProgress,
    refetchInterval: isLive ? 10000 : false, // Poll every 10 seconds if live
    staleTime: isLive ? 0 : 60000, // Always fresh if live
  })

  // Filter Data Client-side
  const filteredData = selectedSetId === "all" 
      ? data 
      : data?.filter(item => item.study_set_id === selectedSetId)

  // 3-hour auto-off logic
  useEffect(() => {
    let timer: NodeJS.Timeout

    if (isLive) {
      const now = new Date()
      const offTime = new Date(now.getTime() + 3 * 60 * 60 * 1000) // 3 hours
      setAutoOffTime(offTime)

      timer = setTimeout(() => {
        setIsLive(false)
        setAutoOffTime(null)
        alert("Live monitoring turned off automatically after 3 hours.")
      }, 3 * 60 * 60 * 1000)
    } else {
      setAutoOffTime(null)
    }

    return () => clearTimeout(timer)
  }, [isLive])

  return (
    <div className="space-y-6 container mx-auto py-6">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
                Student Monitoring
                {isRefetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </h1>
            <p className="text-muted-foreground">
                Real-time tracking of student progress.
            </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
            {/* Filter */}
            <div className="flex items-center gap-2 bg-background border rounded-md px-3 py-2 w-full sm:w-auto">
                <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                <select 
                    className="bg-transparent border-none text-sm focus:ring-0 w-full sm:w-[200px] cursor-pointer outline-none"
                    value={selectedSetId}
                    onChange={(e) => setSelectedSetId(e.target.value)}
                >
                    <option value="all">All Study Sets</option>
                    {studySets?.map(set => (
                        <option key={set.id} value={set.id}>{set.title}</option>
                    ))}
                </select>
            </div>

            <div className="flex items-center gap-6 bg-secondary/30 p-2 px-4 rounded-lg border w-full sm:w-auto justify-between sm:justify-start">
                {isLive && autoOffTime && (
                    <div className="flex items-center gap-2 text-xs text-orange-600 font-medium animate-pulse whitespace-nowrap">
                        <Clock className="h-3 w-3" />
                        Off at {autoOffTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                )}
                
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Switch 
                            id="live-mode" 
                            checked={isLive}
                            onCheckedChange={setIsLive}
                        />
                        <Label htmlFor="live-mode" className="cursor-pointer flex items-center gap-2 whitespace-nowrap">
                            Live Mode
                            {isLive ? (
                                <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                            ) : (
                                <span className="h-2 w-2 rounded-full bg-gray-300"></span>
                            )}
                        </Label>
                    </div>
                    
                    <button 
                        onClick={() => refetch()}
                        className="p-2 hover:bg-secondary rounded-full transition-colors"
                        title="Refresh Now"
                    >
                        <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredData?.map((item) => {
            const target = item.study_sets?.target_repeat || 10
            const current = item.total_repeat_count
            const percent = Math.min((current / target) * 100, 100)
            const isCompleted = percent >= 100

            return (
                <Card key={item.id} className={`overflow-hidden transition-all duration-500 ${isLive ? 'animate-in fade-in zoom-in-95' : ''}`}>
                    <CardHeader className="pb-3 flex flex-row items-center gap-3 space-y-0">
                        {/* Avatar */}
                        <div className="relative h-10 w-10 shrink-0">
                            <div className="h-full w-full rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                                {item.profiles?.avatar_url ? (
                                    <img src={item.profiles.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-lg font-bold text-muted-foreground">
                                        {(item.profiles?.nickname?.[0] || item.profiles?.email?.[0] || '?').toUpperCase()}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="min-w-0 flex-1">
                            <CardTitle className="text-base truncate">
                                {item.profiles?.nickname || item.profiles?.email?.split('@')[0]}
                            </CardTitle>
                            <div className="text-xs text-muted-foreground truncate">
                                {item.study_sets?.title || "Unknown Set"}
                            </div>
                        </div>
                    </CardHeader>
                    
                    <CardContent>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                                <div className="bg-secondary/50 p-2 rounded text-center">
                                    <div className="font-bold text-lg">{current}</div>
                                    <div className="text-muted-foreground text-[10px] uppercase">Total Repeats</div>
                                </div>
                                <div className="bg-secondary/50 p-2 rounded text-center">
                                    <div className="font-bold text-lg text-red-500">{item.total_skip_count}</div>
                                    <div className="text-muted-foreground text-[10px] uppercase">Skips</div>
                                </div>
                            </div>
                            <div className="text-muted-foreground text-xs text-right mt-2">
                                Last activity: {new Date(item.last_studied_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )
        })}

        {/* Empty State */}
        {(!filteredData || filteredData.length === 0) && !isLoading && (
             <div className="col-span-full text-center py-20 border-2 border-dashed rounded-lg bg-muted/5">
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <User className="h-12 w-12 mb-4 opacity-20" />
                    <p className="text-lg font-medium">No activity found.</p>
                    <p className="text-sm">Try selecting a different study set or wait for students to start.</p>
                </div>
            </div>
        )}
      </div>
    </div>
  )
}
