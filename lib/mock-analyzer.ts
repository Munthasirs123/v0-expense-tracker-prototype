// lib/mock-analyzer.ts
import type { Transaction, Category, LearningRule } from "./types";

// The incoming type now includes `source_file` (snake_case)
type RawTransaction = {
  date: string;
  description: string;
  amount: number;
  source_file: string; // MODIFIED
};

// The return type should also match this.
type AnalyzedTransaction = Omit<Transaction, "id" | "user_id" | "month_id">;

export function analyzeTransactions(
  rawTransactions: RawTransaction[],
  monthId: string,
  learningRules: LearningRule[],
): AnalyzedTransaction[] {
  return rawTransactions.map((raw) => {
    const learnedCategory = findLearnedCategory(raw.description, learningRules);
    const category = learnedCategory || mockCategorize(raw.description);
    return {
      date: raw.date,
      description: raw.description,
      amount: Math.abs(raw.amount),
      category,
      source_file: raw.source_file, // MODIFIED to pass through snake_case
    };
  });
}

function findLearnedCategory(description: string, rules: LearningRule[]): Category | null {
    const normalizedDesc = description.toLowerCase();
    for (const rule of rules) {
        if (normalizedDesc.includes(rule.merchant_pattern.toLowerCase())) {
        return rule.category;
        }
    }
    return null;
}

function mockCategorize(description: string): Category {
    const desc = description.toLowerCase();
    if (desc.includes("grocery")) return "Groceries";
    if (desc.includes("restaurant")) return "Dining";
    if (desc.includes("uber")) return "Transportation";
    if (desc.includes("netflix")) return "Entertainment";
    if (desc.includes("amazon")) return "Shopping";
    if (desc.includes("electric")) return "Bills";
    if (desc.includes("doctor")) return "Healthcare";
    if (desc.includes("hotel")) return "Travel";
    return "Other";
}