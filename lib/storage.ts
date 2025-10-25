// lib/storage.ts

import { createClient } from "@/lib/supabase/client"
import type { LearningRule, Month, Transaction, Category } from "./types"

// This file contains client-side functions to interact with your Supabase database.
// Server-side operations (like saveFinalizedUpload) are in storage.server.ts.

// --- Transaction Functions ---

/**
 * Fetches all transactions for a specific month belonging to the current user.
 * MODIFIED: This now also fetches the related category information for each transaction.
 * RLS policies in Supabase ensure the user can only fetch their own data.
 */
export async function getTransactionsByMonth(monthId: string): Promise<Transaction[]> {
  const supabase = createClient()

  // MODIFIED: This is the critical change.
  // "*, categories(*)" tells Supabase to fetch all columns from the transactions table
  // AND all columns from the related row in the categories table.
  const { data, error } = await supabase
    .from("transactions")
    .select("*, categories(*)") // The magic is right here
    .eq("month_id", monthId)
    .order("date", { ascending: false })

  if (error) {
    console.error("Error fetching transactions with categories:", error.message)
    return []
  }
  
  // The data will now be shaped like: { ..., amount: 10, categories: { name: 'Dining', ... } }
  // We need to flatten this structure to match what the UI expects.
  const formattedData = data.map(tx => ({
    ...tx,
    category: tx.categories // Replace the 'categories' object with a 'category' property
  }));

  return formattedData || []
}

/**
 * Updates the category of a single transaction.
 */
export async function updateTransactionCategory(transactionId: number, category: Category) {
  const supabase = createClient()
  const { error } = await supabase
    .from("transactions")
    .update({ category })
    .eq("id", transactionId)

  if (error) {
    console.error("Error updating transaction category:", error.message)
  }
}

// --- Month Functions ---

/**
 * Fetches a single month's summary data for the current user.
 */
export async function getMonth(monthId: string): Promise<Month | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("months")
    .select("*")
    .eq("id", monthId)
    .single() // Expects only one row for the current user

  if (error) {
    // It's normal for this to error if the month doesn't exist yet, so we don't always log it.
    return null
  }
  return data
}

/**
 * Fetches all month summaries for the current user.
 */
export async function getMonths(): Promise<Month[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("months")
    .select("*")
    .order("id", { ascending: false }); // Order by YYYY-MM descending (most recent first)

  if (error) {
    console.error("Error fetching months:", error.message);
    return [];
  }
  return data || [];
}

// --- Learning Rule Functions ---

/**
 * Fetches all learning rules for the current user.
 */
export async function getLearningRules(): Promise<LearningRule[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from("learning_rules").select("*")

  if (error) {
    console.error("Error fetching learning rules:", error.message)
    return []
  }
  return data || []
}

/**
 * Adds or updates a learning rule for the current user.
 * 'upsert' will INSERT a new rule or UPDATE an existing one if the primary key
 * (merchant_pattern, user_id) already exists.
 */
export async function addLearningRule(rule: LearningRule) {
  const supabase = createClient()
  const { error } = await supabase.from("learning_rules").upsert(rule)

  if (error) {
    console.error("Error adding learning rule:", error.message)
  }
}