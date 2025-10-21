// components/auth-provider.tsx

"use client"

import { createContext, useContext, useEffect, useState } from "react"
import type { SupabaseClient, User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"

type SupabaseContextType = {
  supabase: SupabaseClient
  user: User | null | undefined // Use undefined to represent the loading state
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const [user, setUser] = useState<User | null | undefined>(undefined) // Start in loading state

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // The session object is null if the user is logged out
      setUser(session?.user ?? null)
    })

    // Ensure we get the initial session state as well
    supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  return (
    <SupabaseContext.Provider value={{ supabase, user }}>
      {children}
    </SupabaseContext.Provider>
  )
}

export const useSupabase = () => {
  const context = useContext(SupabaseContext)
  if (context === undefined) {
    throw new Error("useSupabase must be used within a SupabaseProvider")
  }
  return context
}