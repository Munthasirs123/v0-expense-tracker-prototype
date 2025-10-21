"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { CategorySummary, Category, Transaction } from "@/lib/types"

const CATEGORIES: Category[] = [
  "Groceries",
  "Dining",
  "Transportation",
  "Entertainment",
  "Shopping",
  "Bills",
  "Healthcare",
  "Travel",
  "Other",
]

interface CategoryCardProps {
  summary: CategorySummary
  // CORRECTED: The ID is a number, matching the database schema.
  onUpdateTransaction: (transactionId: number, category: Category) => void
}

export function CategoryCard({ summary, onUpdateTransaction }: CategoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 text-left hover:bg-accent transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            <div>
              <h3 className="text-lg font-semibold">{summary.category}</h3>
              <p className="text-sm text-muted-foreground">{summary.transactionCount} transactions</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">${summary.totalSpend.toFixed(2)}</div>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-border">
          <div className="p-4 space-y-2">
            {summary.transactions
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} onUpdateCategory={onUpdateTransaction} />
              ))}
          </div>
        </div>
      )}
    </Card>
  )
}

interface TransactionRowProps {
  transaction: Transaction
  // CORRECTED: The ID is a number.
  onUpdateCategory: (transactionId: number, category: Category) => void
}

function TransactionRow({ transaction, onUpdateCategory }: TransactionRowProps) {
  const handleCategoryChange = (newCategory: Category) => {
    // ADDED: A safety check to ensure we only call the update function with a valid ID.
    if (transaction.id === undefined) {
      console.error("Cannot update a transaction without an ID.", transaction);
      return;
    }
    onUpdateCategory(transaction.id, newCategory);
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{transaction.description}</div>
            <div className="text-sm text-muted-foreground">
              {new Date(transaction.date).toLocaleDateString()} • {transaction.source_file}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 ml-4">
        <div className="text-right">
          <div className="font-semibold">${transaction.amount.toFixed(2)}</div>
        </div>
        <div className="w-36">
          <Select
            value={transaction.category}
            onValueChange={(value) => handleCategoryChange(value as Category)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}