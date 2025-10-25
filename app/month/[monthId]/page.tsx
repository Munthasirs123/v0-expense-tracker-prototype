// app/month/[monthId]/page.tsx

"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, FileText, Loader2 } from "lucide-react"
import { CategoryCard } from "@/components/category-card"
import { getMonth, getTransactionsByMonth, updateTransactionCategory, addLearningRule } from "@/lib/storage"
import type { Month, CategorySummary, Category, Transaction } from "@/lib/types"
import ProtectedPage from "@/components/protected-page"
import { useSupabase } from "@/components/auth-provider"
import { createClient } from "@/lib/supabase/client"

export default function MonthPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useSupabase()
  const monthId = params.monthId as string

  const [month, setMonth] = useState<Month | null>(null)
  const [categorySummaries, setCategorySummaries] = useState<CategorySummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadMonthData = useCallback(async () => {
    if (!monthId || !user) return

    setIsLoading(true)
    
    const [monthData, transactions] = await Promise.all([
      getMonth(monthId),
      getTransactionsByMonth(monthId),
    ])

    if (!monthData) {
      setIsLoading(false)
      return
    }
    
    setMonth(monthData)

    // MODIFIED: The Map now uses the category's ID (a number) as its key.
    const categoryMap = new Map<number, CategorySummary>();
    const uncategorizedSummary: CategorySummary = {
      // Create a placeholder for any transactions that might be uncategorized.
      category: { id: -1, name: 'Uncategorized', keywords: [], user_id: user.id },
      totalSpend: 0,
      transactionCount: 0,
      transactions: [],
    };

    for (const transaction of transactions) {
      const category = transaction.category;
      // If a transaction has no category, group it under "Uncategorized".
      if (!category) {
        uncategorizedSummary.totalSpend += transaction.amount;
        uncategorizedSummary.transactionCount += 1;
        uncategorizedSummary.transactions.push(transaction);
        continue;
      }
      
      // Use the category's unique ID to check if we've seen it before.
      if (!categoryMap.has(category.id)) {
        categoryMap.set(category.id, {
          category: category,
          totalSpend: 0,
          transactionCount: 0,
          transactions: [],
        });
      }
      
      const summary = categoryMap.get(category.id)!;
      summary.totalSpend += transaction.amount;
      summary.transactionCount += 1;
      summary.transactions.push(transaction);
    }

    const summaries = Array.from(categoryMap.values()).sort((a, b) => b.totalSpend - a.totalSpend);

    // If there were any uncategorized transactions, add them to the list.
    if (uncategorizedSummary.transactionCount > 0) {
      summaries.push(uncategorizedSummary);
    }

    setCategorySummaries(summaries)
    setIsLoading(false)
  }, [monthId, user])

  useEffect(() => {
    loadMonthData()
  }, [loadMonthData])

  // REFACTORED: This function now matches the expected signature from CategoryCard.
  const handleUpdateTransaction = async (transactionId: number, newCategory: Category) => {
    if (!user) return;

    // Find the full transaction object in our state to get its description.
    // This is more robust than passing the entire object through the component tree.
    const allTransactions = categorySummaries.flatMap(s => s.transactions);
    const transaction = allTransactions.find(t => t.id === transactionId);

    if (!transaction) {
      console.error("Could not find the transaction to update.");
      return;
    }

    // Perform the database updates.
    await updateTransactionCategory(transactionId, newCategory);
    
    await addLearningRule({
      merchant_pattern: transaction.description,
      category: newCategory,
      user_id: user.id
    });
    
    // Refresh the data to show the change in the UI.
    await loadMonthData();
  }
  
  if (isLoading) {
    return (
      <ProtectedPage>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ProtectedPage>
    )
  }

  if (!month) {
    return (
      <ProtectedPage>
        <div className="min-h-screen bg-background flex items-center justify-center text-center">
          <div>
            <h1 className="text-2xl font-bold">Month Not Found</h1>
            <p className="text-muted-foreground">We couldn't find any data for {monthId}.</p>
            <Link href="/upload" className="mt-4 inline-block">
              <Button>Upload a Statement</Button>
            </Link>
          </div>
        </div>
      </ProtectedPage>
    )
  }

  return (
    <ProtectedPage>
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              <span className="text-lg font-semibold">Statement Intelligence</span>
            </div>
            {user && (
              <Button variant="ghost" size="sm" onClick={async () => {
                const { error } = await createClient().auth.signOut()
                if (!error) {
                  router.push('/login')
                }
              }}>Sign Out</Button>
            )}
          </div>
        </header>

        <main className="container mx-auto px-4 py-12">
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
              <Link href="/upload">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Upload
                </Button>
              </Link>
            </div>

            <Card className="p-8">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold">
                    {month.name} {month.year}
                  </h1>
                  <p className="text-muted-foreground mt-1">{month.transaction_count} transactions</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold">${month.total_spend.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">Total spend</div>
                </div>
              </div>
            </Card>

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
                      // MODIFIED: Use the unique ID from the category object for the key.
                      key={summary.category?.id || 'uncategorized'}
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
    </ProtectedPage>
  )
}