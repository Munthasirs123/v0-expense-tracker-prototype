"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, FileText } from "lucide-react"
import { CategoryCard } from "@/components/category-card"
import { getMonth, getTransactionsByMonth, saveTransactions, getTransactions, addLearningRule } from "@/lib/storage"
import type { Month, CategorySummary, Category } from "@/lib/types"

export default function MonthPage() {
  const params = useParams()
  const monthId = params.monthId as string

  const [month, setMonth] = useState<Month | null>(null)
  const [categorySummaries, setCategorySummaries] = useState<CategorySummary[]>([])

  useEffect(() => {
    loadMonthData()
  }, [monthId])

  const loadMonthData = () => {
    const monthData = getMonth(monthId)
    setMonth(monthData)

    const transactions = getTransactionsByMonth(monthId)

    // Group by category
    const categoryMap = new Map<Category, CategorySummary>()

    for (const transaction of transactions) {
      if (!categoryMap.has(transaction.category)) {
        categoryMap.set(transaction.category, {
          category: transaction.category,
          totalSpend: 0,
          transactionCount: 0,
          transactions: [],
        })
      }

      const summary = categoryMap.get(transaction.category)!
      summary.totalSpend += transaction.amount
      summary.transactionCount += 1
      summary.transactions.push(transaction)
    }

    const summaries = Array.from(categoryMap.values()).sort((a, b) => b.totalSpend - a.totalSpend)

    setCategorySummaries(summaries)
  }

  const handleUpdateTransaction = (transactionId: string, category: Category) => {
    const allTransactions = getTransactions()
    const transaction = allTransactions.find((t) => t.id === transactionId)

    if (transaction) {
      // Save learning rule based on merchant description
      addLearningRule(transaction.description, category)
    }

    const updatedTransactions = allTransactions.map((t) => (t.id === transactionId ? { ...t, category } : t))

    saveTransactions(updatedTransactions)
    loadMonthData()
  }

  if (!month) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            <span className="text-lg font-semibold">Statement Intelligence</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex items-center gap-4">
            <Link href="/months">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Months
              </Button>
            </Link>
          </div>

          {/* Month Summary */}
          <Card className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">
                  {month.name} {month.year}
                </h1>
                <p className="text-muted-foreground mt-1">{month.transactionCount} transactions</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold">${month.totalSpend.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Total spend</div>
              </div>
            </div>
          </Card>

          {/* Categories */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Categories</h2>
            {categorySummaries.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="text-muted-foreground">No transactions found</div>
              </Card>
            ) : (
              <div className="space-y-3">
                {categorySummaries.map((summary) => (
                  <CategoryCard
                    key={summary.category}
                    summary={summary}
                    onUpdateTransaction={handleUpdateTransaction}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
