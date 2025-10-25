// lib/types.ts

// This represents a category object from the database
export type Category = {
  id: number;
  user_id: string;
  name: string;
  keywords: string[];
  icon?: string;
  color?: string;
};

// MODIFIED: The Transaction type now includes the full Category object, not just a string.
export type Transaction = {
  id: number;
  user_id: string;
  date: string;
  description: string;
  amount: number;
  category: Category | null; // It can be a full category object or null
  month_id: string;
  upload_id: string;
  source_file: string;
  created_at?: string;
};

export type Month = {
  id: string; // Format: "YYYY-MM"
  user_id: string;
  name: string; // e.g., "January"
  year: number;
  total_spend: number;
  transaction_count: number;
  created_at?: string;
};

export type LearningRule = {
  id?: number;
  user_id: string;
  merchant_pattern: string;
  category: string;
  created_at?: string;
};