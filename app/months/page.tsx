"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, FileText, Plus } from "lucide-react"
import { getMonths } from "@/lib/storage"
import type { Month } from "@/lib/types"

export default function MonthsPage() {
  const [months, setMonths] = useState<Month[]>([])

  useEffect(() => {
    setMonths(getMonths())
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              <span className="text-lg font-semibold">Statement Intelligence</span>
            </div>
            <Link href="/upload">
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Upload New
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
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
              {months
                .sort((a, b) => {
                  if (a.year !== b.year) return b.year - a.year
                  return b.name.localeCompare(a.name)
                })
                .map((month) => (
                  <Link key={month.id} href={`/month/${month.id}`}>
                    <Card className="p-6 hover:bg-accent transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-semibold">
                            {month.name} {month.year}
                          </h3>
                          <p className="text-sm text-muted-foreground">{month.transactionCount} transactions</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">${month.totalSpend.toFixed(2)}</div>
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
  )
}
