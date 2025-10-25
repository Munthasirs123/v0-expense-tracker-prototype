// lib/storage.server.ts
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LearningRule, Month, Transaction } from "./types";

/**
 * Fetch learning rules for the current (server) user.
 * Reads the cookie from the request context via createClient().
 */
export async function getLearningRules(): Promise<LearningRule[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("learning_rules").select("*");
  if (error) {
    console.error("[storage.server] getLearningRules error:", error.message);
    return [];
  }
  return data || [];
}

/**
 * Fetch a single month's summary for the current user (server context).
 * @param supabase - Authenticated Supabase client
 * @param monthId - The month ID to fetch
 */
export async function getMonth(
  supabase: SupabaseClient,
  monthId: string
): Promise<Month | null> {
  const { data, error } = await supabase
    .from("months")
    .select("*")
    .eq("id", monthId)
    .single();

  if (error) return null;
  return data;
}

/**
 * Save final upload atomically-ish:
 * 1) Upsert months with explicit conflict resolution
 * 2) Upsert transactions, ignoring duplicates based on the fingerprint.
 * 3) Return the list of transactions that were actually inserted.
 * 
 * @param supabase - Authenticated Supabase client
 * @param transactionsToInsert - Array of transactions to insert
 * @param monthsToUpdate - Array of month summaries to upsert
 */
export async function saveFinalizedUpload(
  supabase: SupabaseClient,
  transactionsToInsert: (Omit<Transaction, "id" | "created_at"> & { fingerprint: string })[],
  monthsToUpdate: Month[]
): Promise<{ 
  success: boolean; 
  error?: any; 
  // NEW: We will return the data that was actually inserted.
  insertedData?: Pick<Transaction, 'month_id' | 'amount'>[] 
}> {
  // The months upsert remains the same for now, we will fix its calculation in the API.
  const { error: monthError } = await supabase
    .from("months")
    .upsert(monthsToUpdate, { onConflict: 'id, user_id' });

  if (monthError) {
    console.error("[storage.server] upsert months error:", monthError.message);
    return { success: false, error: monthError };
  }

  // MODIFIED: We add .select() to the query.
  // This tells Supabase to return the rows that were successfully inserted or upserted.
  // On a re-upload, this will return an empty array.
  const { data: insertedData, error: txError } = await supabase
    .from("transactions")
    .upsert(transactionsToInsert, {
      onConflict: 'fingerprint',
      ignoreDuplicates: true
    })
    .select('month_id, amount'); // Only select the data we need for the summary

  if (txError) {
    console.error("[storage.server] upsert transactions error:", txError.message);
    return { success: false, error: txError };
  }

  // Return the newly inserted data so the API can perform the correct summary calculation.
  return { success: true, insertedData: insertedData || [] };
}