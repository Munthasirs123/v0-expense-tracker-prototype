// lib/parsers/pdf.ts
import type { Transaction } from "../types";
import { createRequire } from "module";

// ---- Types used from pdfjs text content
type PdfJsTextItem = { str: string; transform: number[] };

// ---- Load pdfjs at runtime so Next can't bundle it
function loadPdfJs() {
  const runtimeRequire = createRequire(import.meta.url);
  const pdfjsLib = runtimeRequire("pdfjs-dist/legacy/build/pdf.js");
  // @ts-ignore - not typed in legacy build
  pdfjsLib.GlobalWorkerOptions.workerSrc = undefined;
  return pdfjsLib;
}

// ---- Parse: PDF bytes -> text lines
export async function parsePdfToLines(
  pdfData: Uint8Array
): Promise<{ lines: string[]; raw: string; engine: string; charCount: number }> {
  const pdfjsLib = loadPdfJs();
  const loadingTask = pdfjsLib.getDocument({
    data: pdfData,
    disableWorker: true,
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
  });
  const doc = await loadingTask.promise;
  const lines: string[] = [];

  try {
    for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
      const page = await doc.getPage(pageNo);
      const textContent = await page.getTextContent();
      const items = textContent.items as PdfJsTextItem[];
      const lineMap = new Map<number, PdfJsTextItem[]>();
      for (const item of items) {
        if (!item?.str?.trim()) continue;
        const y = Math.round(item.transform[5]);
        if (!lineMap.has(y)) lineMap.set(y, []);
        lineMap.get(y)!.push(item);
      }
      const ys = [...lineMap.keys()].sort((a, b) => b - a);
      for (const y of ys) {
        const row = lineMap.get(y)!;
        row.sort((a, b) => a.transform[4] - b.transform[4]);
        const text = row.map((i) => i.str).join(" ").trim();
        if (text) lines.push(text);
      }
      if (pageNo < doc.numPages) lines.push("");
      // @ts-ignore
      page.cleanup?.();
    }
  } finally {
    // @ts-ignore
    doc.cleanup?.();
    // @ts-ignore
    loadingTask.destroy?.();
  }

  const raw = lines.join("\n");
  return {
    lines,
    raw,
    engine: "pdfjs-dist legacy (node, no worker, external)",
    charCount: raw.length,
  };
}

// MODIFICATION: Add `sourceFile` parameter to the function signatures.
// Note: The return type is `Omit<Transaction, 'id'>` to match what analyzeTransactions expects.
type ExtractedTransaction = Omit<Transaction, "id" | "user_id" | "month_id">;

export function extractTransactions(lines: string[], sourceFile: string): ExtractedTransaction[] {
  const joined = lines.join("\n").toLowerCase();
  if (joined.includes("bank of america")) {
    return parseBankOfAmerica(lines, sourceFile);
  }
  return parseGeneric(lines, sourceFile);
}

function parseGeneric(lines: string[], sourceFile: string): ExtractedTransaction[] {
  const out: ExtractedTransaction[] = [];
  const rx =
    /(\b\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)\b.*?(-?\$?\d{1,3}(?:,\d{3})*\.\d{2}|\(\$?\d{1,3}(?:,\d{3})*\.\d{2}\))/;
  for (const raw of lines) {
    const line = raw.replace(/\s+/g, " ").trim();
    const m = rx.exec(line);
    if (!m) continue;
    const [, dateStr, amtStr] = m;
    const isNeg = amtStr.includes("(") || amtStr.startsWith("-");
    const amount = parseFloat(amtStr.replace(/[,$()-]/g, ""));
    const finalAmount = isNeg ? -Math.abs(amount) : amount;
    const description = line.replace(dateStr, "").replace(amtStr, "").replace(/\s+/g, " ").trim();
    const date = normalizeDate(dateStr);
    if (!Number.isNaN(finalAmount) && description) {
      out.push({ date, description, amount: finalAmount, source_file: sourceFile, category: 'Other' });
    }
  }
  return out;
}

function parseBankOfAmerica(lines: string[], sourceFile: string): ExtractedTransaction[] {
  const transactions: ExtractedTransaction[] = [];
  const transactionRegex =
    /^(\d{2}\/\d{2})\s+(\d{2}\/\d{2})\s+(.+?)\s+(?:[\d\s]+)?\s*(?:\d+)?\s+([-\d.,]+)$/;
  for (const lineRaw of lines) {
    const line = lineRaw.replace(/\s{2,}/g, " ").trim();
    const match = line.match(transactionRegex);
    if (match) {
      const [, , postDate, description, amountStr] = match;
      const isNeg = amountStr.includes("(") || amountStr.startsWith("-");
      const amount = parseFloat(amountStr.replace(/[(),]/g, ""));
      const normalized = isNeg ? -Math.abs(amount) : amount;
      const date = normalizeDate(postDate);
      if (!isNaN(normalized) && description) {
        transactions.push({
          date,
          description: description.trim(),
          amount: normalized,
          source_file: sourceFile, // Use snake_case to match the final DB schema
          category: 'Other', // Add a default category
        });
      }
    }
  }
  return transactions;
}

function normalizeDate(s: string): string {
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (!m) return new Date().toISOString();
  const mm = Number(m[1]);
  const dd = Number(m[2]);
  let yyyy = m[3] ? Number(m[3]) : new Date().getFullYear();
  if (yyyy < 100) yyyy = yyyy >= 50 ? 1900 + yyyy : 2000 + yyyy;
  const d = new Date(Date.UTC(yyyy, mm - 1, dd));
  if (isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}