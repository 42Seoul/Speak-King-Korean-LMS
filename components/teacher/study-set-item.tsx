"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, Loader2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { deleteStudySet } from "@/app/actions/study"
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

export function StudySetItem({ set }: { set: any }) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    try {
        setIsDeleting(true)
        await deleteStudySet(set.id)
        // Router refresh handled by server action revalidatePath, 
        // but UI might not update instantly if we don't trigger a router refresh client side too?
        // Next.js Server Actions usually handle this.
    } catch (e) {
        alert("Failed to delete.")
        setIsDeleting(false)
    }
  }

  return (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>{set.title}</CardTitle>
                <CardDescription>{set.description}</CardDescription>
            </div>
            <div className="flex gap-2">
                <Link href={`/management/content/${set.id}/edit`}>
                    <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                    </Button>
                </Link>
                
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the study set
                                "{set.title}" and remove it from our servers.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </CardHeader>
        <CardContent>
            <div className="flex gap-2 text-sm text-muted-foreground">
                <span className="bg-secondary px-2 py-1 rounded">Type: {set.type}</span>
                <span className="bg-secondary px-2 py-1 rounded">Target: {set.target_repeat} repeats</span>
                <span className={set.is_public ? "text-green-600" : "text-yellow-600"}>
                    {set.is_public ? "Public" : "Private"}
                </span>
            </div>
        </CardContent>
    </Card>
  )
}
