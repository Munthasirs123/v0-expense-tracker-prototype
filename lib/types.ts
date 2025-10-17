export type Category =
  | "Groceries"
  | "Dining"
  | "Transportation"
  | "Entertainment"
  | "Shopping"
  | "Bills"
  | "Healthcare"
  | "Travel"
  | "Other"

export interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  category: Category
  sourceFile: string
  monthId: string
}

export interface Month {
  id: string
  name: string
  year: number
  totalSpend: number
  transactionCount: number
}

export interface CategorySummary {
  category: Category
  totalSpend: number
  transactionCount: number
  transactions: Transaction[]
}

export interface LearningRule {
  merchantPattern: string
  category: Category
  lastUsed: string
}
