import type { Transaction, Month, LearningRule } from "./types"

const STORAGE_KEYS = {
  TRANSACTIONS: "expense-tracker-transactions",
  MONTHS: "expense-tracker-months",
  LEARNING_RULES: "expense-tracker-learning-rules",
}

// Transaction storage
export function saveTransactions(transactions: Transaction[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions))
  }
}

export function getTransactions(): Transaction[] {
  if (typeof window !== "undefined") {
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)
    return data ? JSON.parse(data) : []
  }
  return []
}

export function getTransactionsByMonth(monthId: string): Transaction[] {
  return getTransactions().filter((t) => t.monthId === monthId)
}

// Month storage
export function saveMonths(months: Month[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEYS.MONTHS, JSON.stringify(months))
  }
}

export function getMonths(): Month[] {
  if (typeof window !== "undefined") {
    const data = localStorage.getItem(STORAGE_KEYS.MONTHS)
    return data ? JSON.parse(data) : []
  }
  return []
}

export function getMonth(monthId: string): Month | null {
  const months = getMonths()
  return months.find((m) => m.id === monthId) || null
}

// Learning rules storage
export function saveLearningRules(rules: LearningRule[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEYS.LEARNING_RULES, JSON.stringify(rules))
  }
}

export function getLearningRules(): LearningRule[] {
  if (typeof window !== "undefined") {
    const data = localStorage.getItem(STORAGE_KEYS.LEARNING_RULES)
    return data ? JSON.parse(data) : []
  }
  return []
}

export function addLearningRule(merchantPattern: string, category: string): void {
  const rules = getLearningRules()

  // Update existing rule or add new one
  const existingIndex = rules.findIndex((r) => r.merchantPattern.toLowerCase() === merchantPattern.toLowerCase())

  if (existingIndex >= 0) {
    rules[existingIndex] = {
      merchantPattern,
      category: category as any,
      lastUsed: new Date().toISOString(),
    }
  } else {
    rules.push({
      merchantPattern,
      category: category as any,
      lastUsed: new Date().toISOString(),
    })
  }

  saveLearningRules(rules)
}
