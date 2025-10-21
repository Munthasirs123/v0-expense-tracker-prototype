// app/api/process-transactions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractTransactions } from "@/lib/parsers/pdf";
import { analyzeTransactions } from "@/lib/mock-analyzer";
import { getLearningRules, getMonth, saveFinalizedUpload } from "@/lib/storage.server";
import type { Month, Transaction } from "@/lib/types";

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

    const [{ data: uploads, error: selectError }, learningRules] = await Promise.all([
      supabase.from("uploads").select("id, raw_text, file_name").in("id", uploadIds),
      getLearningRules(),
    ]);

    if (selectError) throw selectError;
    if (!uploads || uploads.length === 0) {
      return NextResponse.json({ ok: false, error: "No matching uploads found" }, { status: 404 });
    }

    let allTransactions: Omit<Transaction, "id" | "user_id" | "month_id">[] = [];

    for (const upload of uploads) {
      // MODIFICATION: Pass the file_name to extractTransactions
      const rawTransactions = extractTransactions(upload.raw_text.split("\n"), upload.file_name);
      const analyzed = analyzeTransactions(rawTransactions, "", learningRules).map((t) => ({
        ...t,
        upload_id: upload.id,
      }));
      allTransactions.push(...analyzed);
    }

    if (allTransactions.length === 0) {
      return NextResponse.json({ ok: true, redirectUrl: "/upload?status=no_transactions" });
    }

    // MODIFICATION: Simplified mapping since properties now match.
    const transactionsToInsert = allTransactions.map((t) => {
      const date = new Date(t.date);
      return {
        date: date.toISOString(),
        description: t.description,
        amount: t.amount,
        category: t.category,
        source_file: t.source_file,
        upload_id: t.upload_id,
        month_id: `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`,
        user_id: user.id,
      };
    });

    const monthlySummaries = new Map<string, { totalSpend: number; transactionCount: number }>();
    for (const t of transactionsToInsert) {
      const summary = monthlySummaries.get(t.month_id) || { totalSpend: 0, transactionCount: 0 };
      summary.totalSpend += t.amount;
      summary.transactionCount += 1;
      monthlySummaries.set(t.month_id, summary);
    }

    const monthsToUpdate: Month[] = [];
    for (const [monthId, summary] of monthlySummaries.entries()) {
      const existingMonth = await getMonth(monthId);
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

    const { success } = await saveFinalizedUpload(transactionsToInsert, monthsToUpdate);
    if (!success) {
      throw new Error("Failed to save finalized upload.");
    }

    const latestMonthId = monthsToUpdate.sort((a, b) => b.id.localeCompare(a.id))[0].id;
    return NextResponse.json({ ok: true, redirectUrl: `/month/${latestMonthId}` });

  } catch (e: any) {
    console.error("[process-transactions] failed:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "process-transactions failed" }, { status: 500 });
  }
}