"use client"

import { useState } from "react"
import { Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { deleteAssignment } from "@/app/actions/assignment"
import { toast } from "sonner"

interface DeleteAssignmentButtonProps {
  assignmentId: string
  studentName: string
  studySetTitle: string
}

export function DeleteAssignmentButton({
  assignmentId,
  studentName,
  studySetTitle
}: DeleteAssignmentButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [open, setOpen] = useState(false)

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      await deleteAssignment(assignmentId)
      toast.success("숙제가 삭제되었습니다.")
      setOpen(false)
    } catch (e: any) {
      console.error("Failed to delete assignment:", e)
      toast.error(e.message || "숙제 삭제에 실패했습니다.")
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={isDeleting}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>숙제를 삭제하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              <strong>{studentName}</strong> 학생의
              <strong> "{studySetTitle}"</strong> 숙제가 영구적으로 삭제됩니다.
            </p>
            <p className="text-destructive font-medium">
              이 작업은 되돌릴 수 없습니다.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? "삭제 중..." : "삭제"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
