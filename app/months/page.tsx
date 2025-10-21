"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, FileText, Plus, Loader2 } from "lucide-react"
import { getMonths } from "@/lib/storage"
import type { Month } from "@/lib/types"
import ProtectedPage from "@/components/protected-page"
import { useSupabase } from "@/components/auth-provider"
import { createClient } from "@/lib/supabase/client"

export default function MonthsPage() {
  const router = useRouter()
  const { user } = useSupabase()
  const [months, setMonths] = useState<Month[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Fetch months when the component mounts and a user is available.
    async function loadMonths() {
      setIsLoading(true)
      const monthData = await getMonths()
      setMonths(monthData)
      setIsLoading(false)
    }

    if (user) {
      loadMonths()
    }
  }, [user])

  // Show a loader while data is being fetched.
  if (isLoading) {
    return (
      <ProtectedPage>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ProtectedPage>
    )
  }

  return (
    <ProtectedPage>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              <span className="text-lg font-semibold">Statement Intelligence</span>
            </div>
            {user && (
              <Button variant="ghost" size="sm" onClick={async () => {
                const { error } = await createClient().auth.signOut()
                if (!error) { router.push('/login') }
              }}>Sign Out</Button>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
              <Link href="/upload">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Upload
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">Past Months</h1>
                <p className="text-muted-foreground">View and manage your expense history</p>
              </div>
            </div>

            {months.length === 0 ? (
              <Card className="p-12 text-center space-y-4">
                <div className="text-muted-foreground">No months uploaded yet</div>
                <Link href="/upload">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Upload Your First Statement
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="grid gap-4">
                {/* Data is already sorted by the database query */}
                {months.map((month) => (
                  <Link key={month.id} href={`/month/${month.id}`}>
                    <Card className="p-6 hover:bg-accent transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-semibold">
                            {month.name} {month.year}
                          </h3>
                          {/* CORRECTED: Using snake_case from the type definition */}
                          <p className="text-sm text-muted-foreground">{month.transaction_count} transactions</p>
                        </div>
                        <div className="text-right">
                          {/* CORRECTED: Using snake_case from the type definition */}
                          <div className="text-2xl font-bold">${month.total_spend.toFixed(2)}</div>
                          <div className="text-sm text-muted-foreground">Total spend</div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedPage>
  )
}