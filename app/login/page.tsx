// app/login/page.tsx

"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"

// Simple SVG for the Google icon
function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width="24px"
      height="24px"
      {...props}
    >
      <path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
      />
      <path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.022,35.244,44,30.036,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </svg>
  )
}

export default function LoginPage() {
  const { supabase, user } = useSupabase()
  const router = useRouter()

  // If the user is already logged in, redirect them to the upload page.
  useEffect(() => {
    if (user) {
      router.replace("/upload")
    }
  }, [user, router])

  // This function will be called when the user clicks the "Sign in with Google" button.
  async function handleGoogleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // This is where the user will be sent back to after they sign in with Google.
        redirectTo: `${location.origin}/auth/callback`,
      },
    })
  }

  // We can't show anything until we know for sure if the user is logged in or not.
  if (user) {
      return null
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-md p-8 space-y-8 text-center">
        <div className="flex justify-center items-center gap-2 mb-4">
          <FileText className="h-8 w-8" />
          <span className="text-2xl font-semibold">Statement Intelligence</span>
        </div>
        <h1 className="text-xl font-bold text-foreground">
          Sign in to continue
        </h1>

        <Button
          size="lg"
          className="w-full gap-2"
          onClick={handleGoogleSignIn}
        >
          <GoogleIcon />
          Sign in with Google
        </Button>
      </div>
    </div>
  )
}