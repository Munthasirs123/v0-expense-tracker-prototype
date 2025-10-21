// components/auth-provider.tsx

"use client"

import { createContext, useContext, useEffect, useState } from "react"
import type { SupabaseClient, User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"

type SupabaseContextType = {
  supabase: SupabaseClient
  user: User | null
}

// Create the context with a default null value
const SupabaseContext = createContext<SupabaseContextType | null>(null)

// Create the provider component
export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  // Create a Supabase client instance once per component lifecycle
  const [supabase] = useState(() => createClient())
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // This function is called when the user signs in or out
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // If a session exists, the user is logged in. Otherwise, they are logged out.
      setUser(session?.user ?? null)
    })

    // We also need to get the initial session data when the app loads
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // Clean up the subscription when the component unmounts
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  // Provide the supabase client and the user state to all child components
  return (
    <SupabaseContext.Provider value={{ supabase, user }}>
      {children}
    </SupabaseContext.Provider>
  )
}

// Create a custom hook to easily access the context from any component
export const useSupabase = () => {
  const context = useContext(SupabaseContext)
  if (context === null) {
    throw new Error("useSupabase must be used within a SupabaseProvider")
  }
  return context
}