'use client'

import { useFormState } from "react-dom"
import { upgradeToTeacher } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldAlert } from "lucide-react"

const initialState = {
  message: "",
  success: false
}

export default function BecomeTeacherPage() {
  const [state, formAction] = useFormState(upgradeToTeacher, initialState)

  return (
    <div className="container flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
                <ShieldAlert className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Teacher Access</CardTitle>
          <CardDescription>
            Enter the secret access code provided by the administrator to upgrade your account to a Teacher profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
                <Input 
                    name="code" 
                    type="password" 
                    placeholder="Enter Secret Code" 
                    required 
                />
            </div>
            
            {state?.message && (
                <div className={`text-sm p-2 rounded ${state.success ? 'bg-green-100 text-green-700' : 'bg-destructive/10 text-destructive'}`}>
                    {state.message}
                </div>
            )}

            <Button type="submit" className="w-full">
                Upgrade to Teacher
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
