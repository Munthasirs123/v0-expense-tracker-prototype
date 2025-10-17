import type { Transaction, Category, LearningRule } from "./types"

// Mock AI analyzer that categorizes transactions
export function analyzeTransactions(
  rawTransactions: Array<{
    date: string
    description: string
    amount: number
    sourceFile: string
  }>,
  monthId: string,
  learningRules: LearningRule[],
): Transaction[] {
  return rawTransactions.map((raw) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // First check learning rules
    const learnedCategory = findLearnedCategory(raw.description, learningRules)

    // If no learned rule, use mock AI categorization
    const category = learnedCategory || mockCategorize(raw.description)

    return {
      id,
      date: raw.date,
      description: raw.description,
      amount: Math.abs(raw.amount),
      category,
      sourceFile: raw.sourceFile,
      monthId,
    }
  })
}

function findLearnedCategory(description: string, rules: LearningRule[]): Category | null {
  const normalizedDesc = description.toLowerCase()

  for (const rule of rules) {
    if (normalizedDesc.includes(rule.merchantPattern.toLowerCase())) {
      return rule.category
    }
  }

  return null
}

function mockCategorize(description: string): Category {
  const desc = description.toLowerCase()

  // Simple keyword-based categorization
  if (
    desc.includes("grocery") ||
    desc.includes("supermarket") ||
    desc.includes("whole foods") ||
    desc.includes("trader joe")
  ) {
    return "Groceries"
  }
  if (
    desc.includes("restaurant") ||
    desc.includes("cafe") ||
    desc.includes("coffee") ||
    desc.includes("pizza") ||
    desc.includes("burger")
  ) {
    return "Dining"
  }
  if (
    desc.includes("uber") ||
    desc.includes("lyft") ||
    desc.includes("gas") ||
    desc.includes("parking") ||
    desc.includes("transit")
  ) {
    return "Transportation"
  }
  if (
    desc.includes("movie") ||
    desc.includes("netflix") ||
    desc.includes("spotify") ||
    desc.includes("gym") ||
    desc.includes("theater")
  ) {
    return "Entertainment"
  }
  if (
    desc.includes("amazon") ||
    desc.includes("target") ||
    desc.includes("walmart") ||
    desc.includes("mall") ||
    desc.includes("store")
  ) {
    return "Shopping"
  }
  if (
    desc.includes("electric") ||
    desc.includes("water") ||
    desc.includes("internet") ||
    desc.includes("phone") ||
    desc.includes("insurance")
  ) {
    return "Bills"
  }
  if (
    desc.includes("doctor") ||
    desc.includes("pharmacy") ||
    desc.includes("hospital") ||
    desc.includes("medical") ||
    desc.includes("dental")
  ) {
    return "Healthcare"
  }
  if (desc.includes("hotel") || desc.includes("airline") || desc.includes("airbnb") || desc.includes("flight")) {
    return "Travel"
  }

  return "Other"
}

// Mock parser for CSV/PDF files
export function parseStatementFile(file: File): Promise<
  Array<{
    date: string
    description: string
    amount: number
    sourceFile: string
  }>
> {
  return new Promise((resolve) => {
    // Simulate file parsing delay
    setTimeout(() => {
      // Generate mock transactions based on file name
      const mockTransactions = generateMockTransactions(file.name)
      resolve(mockTransactions)
    }, 1000)
  })
}

function generateMockTransactions(fileName: string): Array<{
  date: string
  description: string
  amount: number
  sourceFile: string
}> {
  const merchants = [
    { name: "Whole Foods Market", amount: -85.43 },
    { name: "Starbucks Coffee", amount: -5.75 },
    { name: "Shell Gas Station", amount: -52.0 },
    { name: "Netflix Subscription", amount: -15.99 },
    { name: "Amazon.com", amount: -127.89 },
    { name: "Uber Ride", amount: -23.5 },
    { name: "Target Store", amount: -64.32 },
    { name: "Chipotle Mexican Grill", amount: -12.45 },
    { name: "CVS Pharmacy", amount: -28.76 },
    { name: "Electric Company", amount: -145.0 },
    { name: "Trader Joes", amount: -73.21 },
    { name: "Local Pizza Place", amount: -32.5 },
    { name: "Gym Membership", amount: -49.99 },
    { name: "Movie Theater", amount: -28.0 },
    { name: "Gas Station", amount: -45.0 },
  ]

  const transactions = []
  const numTransactions = Math.floor(Math.random() * 10) + 8 // 8-17 transactions

  for (let i = 0; i < numTransactions; i++) {
    const merchant = merchants[Math.floor(Math.random() * merchants.length)]
    const daysAgo = Math.floor(Math.random() * 30)
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)

    transactions.push({
      date: date.toISOString().split("T")[0],
      description: merchant.name,
      amount: merchant.amount,
      sourceFile: fileName,
    })
  }

  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}
