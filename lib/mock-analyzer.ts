// lib/mock-analyzer.ts

import type { Transaction, Category, LearningRule } from "./types";

export function analyzeTransactions(
  rawTransactions: Array<{ date: string; description: string; amount: number; sourceFile: string }>,
  monthId: string,
  learningRules: LearningRule[],
): Omit<Transaction, "user_id" | "month_id">[] {
  return rawTransactions.map((raw) => {
    const id = Date.now() + Math.random();
    const learnedCategory = findLearnedCategory(raw.description, learningRules);
    const category = learnedCategory || mockCategorize(raw.description);
    return {
      id,
      date: raw.date,
      description: raw.description,
      amount: Math.abs(raw.amount),
      category,
      sourceFile: raw.sourceFile,
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

function generateMockTransactions(
  fileName: string,
): Array<{ date: string; description: string; amount: number; sourceFile: string }> {
  return [{
    date: new Date().toISOString().split("T")[0],
    description: "MOCK - PDF PARSING FAILED OR FOUND NO TRANSACTIONS",
    amount: -123.45,
    sourceFile: fileName,
  }];
}