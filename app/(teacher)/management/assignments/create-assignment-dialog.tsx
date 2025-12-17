"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createAssignments } from "@/app/actions/assignment"
import { Loader2, Plus, CalendarIcon } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"

export function CreateAssignmentDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)

  // Data State
  const [studySets, setStudySets] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])

  // Form State
  const [selectedSet, setSelectedSet] = useState("")
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [targetCount, setTargetCount] = useState(10)
  const [type, setType] = useState<'accumulate' | 'new'>('new')
  const [dueDate, setDueDate] = useState("")

  // Fetch Data on Open
  useEffect(() => {
    if (open) {
        setFetching(true)
        const fetchResources = async () => {
            const supabase = createClient()
            
            // Fetch Study Sets
            const { data: sets } = await supabase.from('study_sets').select('id, title').order('created_at', { ascending: false })
            setStudySets(sets || [])

            // Fetch Students (Ideally filter by teacher's courses, but fetching all students for MVP)
            const { data: users } = await supabase.from('profiles').select('id, email, nickname').eq('role', 'student')
            setStudents(users || [])
            
            setFetching(false)
        }
        fetchResources()
    }
  }, [open])

  const handleStudentToggle = (id: string) => {
      setSelectedStudents(prev => 
        prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
      )
  }

  const handleSelectAll = () => {
      if (selectedStudents.length === students.length) {
          setSelectedStudents([])
      } else {
          setSelectedStudents(students.map(s => s.id))
      }
  }

  const handleSubmit = async () => {
      if (!selectedSet || selectedStudents.length === 0 || !dueDate) {
          alert("Please fill in all fields.")
          return
      }

      setLoading(true)
      try {
          await createAssignments({
              study_set_id: selectedSet,
              student_ids: selectedStudents,
              assignment_type: type,
              target_count: targetCount,
              due_date: new Date(dueDate).toISOString()
          })
          setOpen(false)
          alert("Assignments created successfully!")
          // Reset form
          setSelectedStudents([])
          setSelectedSet("")
      } catch (e) {
          alert("Failed to create assignments.")
      } finally {
          setLoading(false)
      }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Assignment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Assignment</DialogTitle>
          <DialogDescription>
            Assign a study set to selected students.
          </DialogDescription>
        </DialogHeader>
        
        {fetching ? (
            <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        ) : (
            <div className="grid gap-4 py-4">
                {/* 1. Study Set */}
                <div className="grid gap-2">
                    <Label>Study Set</Label>
                    <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={selectedSet}
                        onChange={(e) => setSelectedSet(e.target.value)}
                    >
                        <option value="" disabled>Select a study set...</option>
                        {studySets.map(set => (
                            <option key={set.id} value={set.id}>{set.title}</option>
                        ))}
                    </select>
                </div>

                {/* 2. Students */}
                <div className="grid gap-2">
                    <div className="flex justify-between items-center">
                        <Label>Select Students ({selectedStudents.length})</Label>
                        <Button variant="ghost" size="sm" onClick={handleSelectAll} className="h-auto p-0 text-xs">
                            {selectedStudents.length === students.length ? "Deselect All" : "Select All"}
                        </Button>
                    </div>
                    <div className="border rounded-md h-[150px] overflow-y-auto p-2 space-y-2">
                        {students.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No students found.</p>}
                        {students.map(student => (
                            <div key={student.id} className="flex items-center space-x-2">
                                <Checkbox 
                                    id={`student-${student.id}`} 
                                    checked={selectedStudents.includes(student.id)}
                                    onCheckedChange={() => handleStudentToggle(student.id)}
                                />
                                <Label htmlFor={`student-${student.id}`} className="font-normal cursor-pointer text-sm">
                                    {student.nickname || student.email}
                                </Label>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Conditions */}
                <div className="grid grid-cols-2 gap-4">
                     <div className="grid gap-2">
                        <Label>Type</Label>
                        <select 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={type}
                            onChange={(e) => setType(e.target.value as any)}
                        >
                            <option value="new">New (Add)</option>
                            <option value="accumulate">Accumulate (Total)</option>
                        </select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Target Repeats</Label>
                        <Input 
                            type="number" 
                            min={1} 
                            value={targetCount} 
                            onChange={(e) => setTargetCount(parseInt(e.target.value))} 
                        />
                    </div>
                </div>

                {/* 4. Due Date */}
                <div className="grid gap-2">
                    <Label>Due Date</Label>
                    <Input 
                        type="datetime-local" 
                        value={dueDate} 
                        onChange={(e) => setDueDate(e.target.value)} 
                    />
                </div>
            </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || fetching}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
