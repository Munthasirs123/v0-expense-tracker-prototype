// lib/parsers/bank-of-america-credit.ts

import { normalizeAmount, normalizeDateISO, normalizeDescription } from "@/lib/normalize";

// This defines the structure of the transactions our parser will return.
// It's a "raw" transaction because it hasn't been categorized or fingerprinted yet.
export interface RawCreditCardTransaction {
  postingDate: string;
  description: string;
  amount: number;
  referenceNumber: string; // The unique ID for the transaction
}

/**
 * A specialized parser for Bank of America credit card statements.
 * It uses structural parsing to reliably extract purchase transactions.
 *
 * @param textLines An array of strings, where each string is a line from the OCR'd PDF text.
 * @returns An array of structured transaction objects.
 */
export function extractBoACreditCardTransactions(textLines: string[]): RawCreditCardTransaction[] {
  const transactions: RawCreditCardTransaction[] = [];
  let isTransactionSection = false;

  // This regex is specifically designed to match the columns in the "Purchases" table.
  // It captures: Posting Date, Description, Reference Number, and Amount.
  const transactionRegex =
    /^\d{2}\/\d{2}\s+(\d{2}\/\d{2})\s+(.+?)\s+(\d+)\s+\d{4}\s+([\d,]+\.\d{2})$/;

  for (const line of textLines) {
    // We use "signposts" to know when to start and stop parsing.
    if (line.trim().startsWith("Purchases and Adjustments")) {
      isTransactionSection = true;
      continue; // Skip the header line
    }

    if (line.trim().startsWith("TOTAL PURCHASES AND ADJUSTMENTS")) {
      isTransactionSection = false;
      break; // We're done with this section
    }

    if (isTransactionSection) {
      const match = line.match(transactionRegex);

      if (match) {
        const [_, postingDate, description, referenceNumber, amountStr] = match;

        transactions.push({
          // We use the posting date as the official date of the transaction
          postingDate: normalizeDateISO(`2025/${postingDate}`), // Add year for proper parsing
          description: normalizeDescription(description),
          referenceNumber: referenceNumber.trim(),
          amount: normalizeAmount(amountStr),
        });
      }
    }
  }

  console.log(`[BoACreditCardParser] Extracted ${transactions.length} transactions.`);
  return transactions;
}