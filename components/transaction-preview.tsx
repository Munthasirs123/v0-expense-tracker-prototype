"use client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { addLearningRule } from "@/lib/storage"
import type { Transaction, Category } from "@/lib/types"

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

interface TransactionPreviewProps {
  transactions: Transaction[]
  onUpdateCategory: (transactionId: string, category: Category) => void
  onConfirm: () => void
}

export function TransactionPreview({ transactions, onUpdateCategory, onConfirm }: TransactionPreviewProps) {
  const totalSpend = transactions.reduce((sum, t) => sum + t.amount, 0)

  const handleCategoryChange = (transactionId: string, category: Category) => {
    const transaction = transactions.find((t) => t.id === transactionId)
    if (transaction) {
      addLearningRule(transaction.description, category)
    }
    onUpdateCategory(transactionId, category)
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Preview Transactions</h3>
            <p className="text-sm text-muted-foreground">{transactions.length} transactions found</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">${totalSpend.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Total spend</div>
          </div>
        </div>
      </Card>

      <div className="space-y-2">
        <div className="grid grid-cols-12 gap-4 px-4 text-xs font-medium text-muted-foreground">
          <div className="col-span-2">Date</div>
          <div className="col-span-4">Description</div>
          <div className="col-span-2">Amount</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-2">Source</div>
        </div>

        <div className="space-y-2">
          {transactions.map((transaction) => (
            <Card key={transaction.id} className="p-4">
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-2 text-sm">{new Date(transaction.date).toLocaleDateString()}</div>
                <div className="col-span-4 text-sm font-medium">{transaction.description}</div>
                <div className="col-span-2 text-sm font-semibold">${transaction.amount.toFixed(2)}</div>
                <div className="col-span-2">
                  <Select
                    value={transaction.category}
                    onValueChange={(value) => handleCategoryChange(transaction.id, value as Category)}
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
                <div className="col-span-2">
                  <Badge variant="secondary" className="text-xs">
                    {transaction.sourceFile.substring(0, 15)}
                    {transaction.sourceFile.length > 15 ? "..." : ""}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button size="lg" onClick={onConfirm}>
          Confirm Import
        </Button>
      </div>
    </div>
  )
}
