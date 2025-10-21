// app/auth/callback/route.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (!code) {
    const url = new URL('/login', request.url)
    url.searchParams.set('error', 'Missing code')
    return NextResponse.redirect(url)
  }

  // ⬅️ REQUIRED in Next 15
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,       // e.g. https://kgiinscenppomtcpnucy.supabase.co
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,  // the anon public key
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        // In route handlers, use name/value/options signature
        set(name: string, value: string, options?: Parameters<typeof cookieStore.set>[2]) {
          cookieStore.set(name, value, options)
        },
        remove(name: string, options?: Parameters<typeof cookieStore.set>[2]) {
          cookieStore.set(name, '', { ...options, maxAge: 0 })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('exchangeCodeForSession failed:', error)
    const url = new URL('/login', request.url)
    url.searchParams.set('error', 'Authentication Failed')
    return NextResponse.redirect(url)
  }

  return NextResponse.redirect(new URL(next, request.url))
}
