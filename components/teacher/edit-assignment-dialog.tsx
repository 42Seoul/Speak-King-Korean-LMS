"use client"

import { useState } from "react"
import { Edit, Loader2 } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateAssignment, type UpdateAssignmentData } from "@/app/actions/assignment"
import { toast } from "sonner"
import { format } from "date-fns"

interface EditAssignmentDialogProps {
  assignment: {
    id: string
    target_count: number
    due_date: string
    assignment_type: 'accumulate' | 'new'
    student_name: string
    study_set_title: string
  }
}

export function EditAssignmentDialog({ assignment }: EditAssignmentDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State
  const [targetCount, setTargetCount] = useState(assignment.target_count.toString())
  const [assignmentType, setAssignmentType] = useState<'accumulate' | 'new'>(assignment.assignment_type)
  const [dueDate, setDueDate] = useState(
    format(new Date(assignment.due_date), "yyyy-MM-dd'T'HH:mm")
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const target = parseInt(targetCount)
    if (isNaN(target) || target <= 0) {
      toast.error("목표 횟수는 1 이상이어야 합니다.")
      return
    }

    try {
      setIsSubmitting(true)

      const updateData: UpdateAssignmentData = {
        target_count: target,
        due_date: new Date(dueDate).toISOString(),
        assignment_type: assignmentType,
      }

      await updateAssignment(assignment.id, updateData)

      toast.success("숙제가 수정되었습니다.")
      setOpen(false)
    } catch (e: any) {
      console.error("Failed to update assignment:", e)
      toast.error(e.message || "숙제 수정에 실패했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>숙제 수정</DialogTitle>
          <DialogDescription>
            {assignment.student_name} 학생의 "{assignment.study_set_title}" 숙제를 수정합니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* 숙제 유형 */}
            <div className="space-y-2">
              <Label htmlFor="type">숙제 유형</Label>
              <Select value={assignmentType} onValueChange={(v: any) => setAssignmentType(v)}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="accumulate">
                    누적 목표 (Total Goal)
                  </SelectItem>
                  <SelectItem value="new">
                    추가 연습 (Extra Practice)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {assignmentType === 'accumulate'
                  ? "전체 반복 횟수가 목표에 도달해야 합니다."
                  : "현재 진행도에 추가로 반복해야 합니다."}
              </p>
            </div>

            {/* 목표 횟수 */}
            <div className="space-y-2">
              <Label htmlFor="target">
                목표 반복 횟수 {assignmentType === 'new' && "(추가)"}
              </Label>
              <Input
                id="target"
                type="number"
                min="1"
                value={targetCount}
                onChange={(e) => setTargetCount(e.target.value)}
                placeholder="10"
                required
              />
            </div>

            {/* 마감일 */}
            <div className="space-y-2">
              <Label htmlFor="due">마감일</Label>
              <Input
                id="due"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  수정 중...
                </>
              ) : (
                "수정"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
