// app/auth/callback/route.ts

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    // Our server helper already awaits Next.js cookies internally
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Successful sign-in, send them to the app root (or change as needed)
      return NextResponse.redirect(origin)
    }

    // Log for debugging (optional)
    console.error('Supabase auth error:', error.message)
  }

  // If there is an error or no code, redirect to login with a friendly message
  const errorUrl = new URL('/login', request.url)
  errorUrl.searchParams.set('error', 'Authentication Failed')
  return NextResponse.redirect(errorUrl)
}
