// app/api/process-transactions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMonth, saveFinalizedUpload } from "@/lib/storage.server";
import type { Category, Month, Transaction } from "@/lib/types";

import { extractBoACreditCardTransactions } from "@/lib/parsers/bank-of-america-credit";
import { createCreditCardTransactionFingerprint } from "@/lib/normalize";
// NEW: We import our intelligent analyzer.
import { analyzeTransaction } from "@/lib/analyzer.server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { uploadIds } = await req.json();
    if (!Array.isArray(uploadIds) || !uploadIds.length) {
      return NextResponse.json({ ok: false, error: "uploadIds required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // --- NEW: Fetch Categories ---
    // We fetch the user's categories first, as the analyzer needs them.
    const { data: categories, error: categoriesError } = await supabase
      .from("categories")
      .select("id, name, keywords")
      .eq("user_id", user.id);

    if (categoriesError) throw categoriesError;
    if (!categories || categories.length === 0) {
      return NextResponse.json({ ok: false, error: "No categories found for user." }, { status: 404 });
    }
    // --- END NEW ---

    const uploadId = uploadIds[0];
    const { data: upload, error: selectError } = await supabase
      .from("uploads")
      .select("id, raw_text, file_name")
      .eq("id", uploadId)
      .single();

    if (selectError || !upload) {
      return NextResponse.json({ ok: false, error: "Upload not found" }, { status: 404 });
    }

    const rawTransactions = extractBoACreditCardTransactions(upload.raw_text.split("\n"));

    if (rawTransactions.length === 0) {
      return NextResponse.json({ ok: true, redirectUrl: "/upload?status=no_transactions_found" });
    }

    const transactionsToInsert = rawTransactions.map((t) => {
      const date = new Date(t.postingDate);
      
      // MODIFIED: We now call the analyzer for each transaction.
      const categoryId = analyzeTransaction(t.description, categories);

      return {
        date: date.toISOString(),
        description: t.description,
        amount: t.amount,
        // The category_id column in your DB should store the ID of the category.
        category_id: categoryId, 
        source_file: upload.file_name,
        upload_id: upload.id,
        month_id: `${date.getUTCFullYear()}-${(date.getUTCMonth() + 1).toString().padStart(2, "0")}`,
        user_id: user.id,
        fingerprint: createCreditCardTransactionFingerprint(t, user.id, upload.file_name),
      };
    });

    // --- REFACTORED LOGIC STARTS HERE ---

    // Step 1: Attempt to save the transactions. This will handle all deduplication.
    // We pass an empty array for months for now, as we will calculate the totals *after* this step.
    const { success, error, insertedData } = await saveFinalizedUpload(supabase, transactionsToInsert, []);
    
    if (!success) {
      // If the transaction save failed, we can't proceed.
      throw new Error(`Failed to save transactions. Reason: ${error?.message}`);
    }

    // Step 2: Check if any new data was actually inserted.
    // On a re-upload, `insertedData` will be an empty array.
    if (!insertedData || insertedData.length === 0) {
      console.log("[API /process-transactions] No new transactions were inserted. Skipping month update.");
      // We can redirect to the last month from the *proposed* transactions as a fallback.
      const latestMonthId = transactionsToInsert.sort((a, b) => b.month_id.localeCompare(a.month_id))[0].month_id;
      return NextResponse.json({ ok: true, redirectUrl: `/month/${latestMonthId}` });
    }

    console.log(`[API /process-transactions] Successfully inserted ${insertedData.length} new transactions.`);

    // Step 3: Calculate summaries ONLY from the data that was actually inserted.
    const monthlySummaries = new Map<string, { totalSpend: number; transactionCount: number }>();
    for (const t of insertedData) {
      const summary = monthlySummaries.get(t.month_id) || { totalSpend: 0, transactionCount: 0 };
      summary.totalSpend += t.amount;
      summary.transactionCount += 1;
      monthlySummaries.set(t.month_id, summary);
    }

    // Step 4: Update the months table with the new, correct totals.
    const monthsToUpdate: Month[] = [];
    for (const [monthId, summary] of monthlySummaries.entries()) {
      const existingMonth = await getMonth(supabase, monthId);
      const [year, monthNum] = monthId.split("-");
      const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleString("en-US", { month: "long" });
      
      monthsToUpdate.push({
        id: monthId,
        user_id: user.id,
        name: monthName,
        year: parseInt(year),
        total_spend: (existingMonth?.total_spend || 0) + summary.totalSpend,
        transaction_count: (existingMonth?.transaction_count || 0) + summary.transactionCount,
      });
    }

    // Step 5: Save the updated month summaries.
    const { error: monthError } = await supabase.from("months").upsert(monthsToUpdate);
    if (monthError) {
      // In a production app, we might add logic here to "roll back" the transaction insert for consistency.
      throw new Error(`Failed to update month summaries. Reason: ${monthError.message}`);
    }
    
    // --- REFACTORED LOGIC ENDS HERE ---

    const latestMonthId = monthsToUpdate.sort((a, b) => b.id.localeCompare(a.id))[0].id;
    return NextResponse.json({ ok: true, redirectUrl: `/month/${latestMonthId}` });

  } catch (e: any) {
    console.error("[process-transactions] failed:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "process-transactions failed" }, { status: 500 });
  }
}