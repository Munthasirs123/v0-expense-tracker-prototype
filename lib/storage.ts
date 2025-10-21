// lib/storage.ts

import { createClient } from "@/lib/supabase/client"
import type { LearningRule, Month, Transaction, Category } from "./types"

// This file now contains functions to interact with your Supabase database.

// --- Transaction Functions ---

/**
 * Fetches all transactions for a specific month belonging to the current user.
 * RLS policies in Supabase ensure the user can only fetch their own data.
 */
export async function getTransactionsByMonth(monthId: string): Promise<Transaction[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("month_id", monthId)
    .order("date", { ascending: false })

  if (error) {
    console.error("Error fetching transactions:", error.message)
    return []
  }
  return data || []
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
 * NEW: Fetches all month summaries for the current user.
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

// --- Upload Finalization Function ---

/**
 * Saves all data from a finalized upload in a single operation.
 * This involves updating months and inserting transactions.
 */
export async function saveFinalizedUpload(
  transactionsToInsert: Omit<Transaction, "id" | "created_at">[],
  monthsToUpdate: Month[],
) {
  const supabase = createClient()

  // 1. Upsert the month summary data.
  const { error: monthError } = await supabase.from("months").upsert(monthsToUpdate)
  if (monthError) {
    console.error("Error saving months:", monthError.message)
    // In a real app, you would want to handle this failure, maybe retry or notify the user.
    return { success: false, error: monthError }
  }

  // 2. Insert all the new transactions.
  const { error: transactionError } = await supabase.from("transactions").insert(transactionsToInsert)
  if (transactionError) {
    console.error("Error saving transactions:", transactionError.message)
    // Attempt to roll back the month update could be added here in a more advanced scenario.
    return { success: false, error: transactionError }
  }

  return { success: true }
}