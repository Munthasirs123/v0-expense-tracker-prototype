// lib/storage.server.ts
import { createClient } from "@/lib/supabase/server";
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
 */
export async function getMonth(monthId: string): Promise<Month | null> {
  const supabase = await createClient();
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
 * 1) Upsert months
 * 2) Insert transactions
 * (You can wrap these in Postgres functions for true transactions if needed.)
 */
export async function saveFinalizedUpload(
  transactionsToInsert: Omit<Transaction, "id" | "created_at">[],
  monthsToUpdate: Month[]
): Promise<{ success: boolean; error?: any }> {
  const supabase = await createClient();

  const { error: monthError } = await supabase.from("months").upsert(monthsToUpdate);
  if (monthError) {
    console.error("[storage.server] upsert months error:", monthError.message);
    return { success: false, error: monthError };
  }

  const { error: txError } = await supabase
    .from("transactions")
    .insert(transactionsToInsert);

  if (txError) {
    console.error("[storage.server] insert transactions error:", txError.message);
    return { success: false, error: txError };
  }

  return { success: true };
}
