export type Category =
  | "Groceries"
  | "Dining"
  | "Transportation"
  | "Entertainment"
  | "Shopping"
  | "Bills"
  | "Healthcare"
  | "Travel"
  | "Other";

// This mirrors the 'transactions' table in Supabase
export interface Transaction {
  id?: number; // The database will generate this, so it's optional on creation
  created_at?: string;
  upload_id?: string; // <<< THIS IS THE ADDED LINE
  date: string; // Should be in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)
  description: string;
  amount: number;
  category: Category;
  notes?: string;
  source_file?: string;
  month_id: string; // Format: "YYYY-MM"
  user_id: string; // The UUID of the authenticated user
}

// This mirrors the 'months' table in Supabase
export interface Month {
  id: string; // Format: "YYYY-MM"
  user_id: string;
  name: string;
  year: number;
  total_spend: number;
  transaction_count: number;
}

// This is a client-side only type for summarizing data. It remains mostly the same.
export interface CategorySummary {
  category: Category;
  totalSpend: number;
  transactionCount: number;
  transactions: Transaction[];
}

// This mirrors the 'learning_rules' table in Supabase
export interface LearningRule {
  merchant_pattern: string;
  user_id: string;
  category: Category;
  last_used?: string;
}