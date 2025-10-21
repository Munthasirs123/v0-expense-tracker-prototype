// app/page.tsx

"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/auth-provider'
import { Loader2 } from 'lucide-react'

export default function HomePage() {
  const { user } = useSupabase()
  const router = useRouter()

  useEffect(() => {
    // This effect runs when the component mounts or the user state changes.
    
    // If the user state is still loading, do nothing.
    if (user === undefined) {
      return 
    }

    // If a user object exists, they are logged in. Redirect to the main app.
    if (user) {
      router.replace('/upload')
    } 
    // If the user is definitively logged out, redirect to the login page.
    else {
      router.replace('/login')
    }
  }, [user, router])

  // While waiting for the redirect, show a loading spinner for a better UX.
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  )
}