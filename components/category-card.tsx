"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { CategorySummary, Category, Transaction } from "@/lib/types"
import { createClient } from "@/lib/supabase/client" // NEW: Import supabase client for fetching categories

interface CategoryCardProps {
  summary: CategorySummary
  onUpdateTransaction: (transactionId: number, newCategory: Category) => void
}

export function CategoryCard({ summary, onUpdateTransaction }: CategoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // A safe way to handle potentially uncategorized transactions
  const categoryName = summary.category?.name || "Uncategorized";

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
              {/* MODIFIED: We now render the `name` property of the category object. */}
              <h3 className="text-lg font-semibold">{categoryName}</h3>
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
  onUpdateCategory: (transactionId: number, newCategory: Category) => void
}

function TransactionRow({ transaction, onUpdateCategory }: TransactionRowProps) {
  // NEW: We need a full list of available categories for the dropdown.
  // We will fetch this list from the database.
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  useEffect(() => {
    async function fetchCategories() {
      const supabase = createClient();
      const { data } = await supabase.from('categories').select('*');
      if (data) {
        setAllCategories(data);
      }
    }
    fetchCategories();
  }, []);

  const handleCategoryChange = (newCategoryId: string) => {
    // Find the full category object from our fetched list.
    const newCategory = allCategories.find(c => c.id.toString() === newCategoryId);
    if (transaction.id === undefined || !newCategory) {
      console.error("Cannot update transaction without a valid ID and new category.", { transaction, newCategory });
      return;
    }
    onUpdateCategory(transaction.id, newCategory);
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{transaction.description}</div>
        <div className="text-sm text-muted-foreground">
          {new Date(transaction.date).toLocaleDateString()} • {transaction.source_file}
        </div>
      </div>
      <div className="flex items-center gap-4 ml-4">
        <div className="text-right">
          <div className="font-semibold">${transaction.amount.toFixed(2)}</div>
        </div>
        <div className="w-48">
          {/* MODIFIED: The Select component is now driven by category IDs and objects. */}
          <Select
            // The value of the select is the ID of the current category.
            value={transaction.category?.id?.toString()}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger className="h-8 text-xs">
              {/* Display the name of the current category. */}
              <SelectValue placeholder="Select category..." />
            </SelectTrigger>
            <SelectContent>
              {/* Populate the dropdown with all available categories. */}
              {allCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id.toString()}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}