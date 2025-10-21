// lib/parsers/pdf.ts

// Helper type for PDF.js text items
type PdfJsTextItem = {
  str: string;
  transform: number[]; // [scaleX, skewY, skewX, scaleY, x, y]
};

export type Transaction = {
  date: string;
  description: string;
  amount: number;
  sourceFile?: string;
};

/**
 * Parse PDF to lines using layout-aware coordinate-based reconstruction.
 * This prevents text from being mashed together by respecting spatial layout.
 */
export async function parsePdfToLines(
  pdfData: Uint8Array
): Promise<{ lines: string[]; raw: string; engine: string; charCount: number }> {
  // Dynamically import the server-friendly legacy build of pdfjs-dist
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.js");

  // Use CDN for the worker file to avoid Next.js webpack bundling issues
  // This is the most reliable approach for server-side PDF parsing
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

  const loadingTask = pdfjs.getDocument({
    data: pdfData,
    // These flags reinforce that we're in a non-browser environment
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
  });

  const doc = await loadingTask.promise;
  const allLines: string[] = [];
  let fullRawText = "";

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const textContent = await page.getTextContent();
    const items = textContent.items as PdfJsTextItem[];

    if (items.length === 0) continue;

    // Group text items by their vertical position (y-coordinate)
    // Round Y to handle slight variations in vertical positioning
    const lineMap = new Map<number, PdfJsTextItem[]>();
    for (const item of items) {
      if (!item.str.trim()) continue; // Skip empty strings
      const y = Math.round(item.transform[5]); // Y-coordinate
      if (!lineMap.has(y)) {
        lineMap.set(y, []);
      }
      lineMap.get(y)!.push(item);
    }

    // Sort lines by their vertical position (top to bottom)
    // Higher Y values typically appear at the top in PDF coordinate system
    const sortedY = Array.from(lineMap.keys()).sort((a, b) => b - a);

    // For each line, sort text items by their horizontal position (left to right)
    for (const y of sortedY) {
      const lineItems = lineMap.get(y)!;
      lineItems.sort((a, b) => a.transform[4] - b.transform[4]); // Sort by X-coordinate

      // Join items with space, but detect large gaps that might indicate columns
      let lineText = "";
      for (let i = 0; i < lineItems.length; i++) {
        const item = lineItems[i];
        const nextItem = lineItems[i + 1];

        lineText += item.str;

        // Add spacing based on horizontal distance to next item
        if (nextItem) {
          const currentX = item.transform[4];
          const nextX = nextItem.transform[4];
          const gap = nextX - currentX - item.str.length * 5; // Rough character width estimate

          if (gap > 20) {
            // Large gap detected - might be different columns
            lineText += "   "; // Multiple spaces to preserve structure
          } else if (gap > 0) {
            lineText += " "; // Normal space
          }
        }
      }

      const trimmedLine = lineText.trim();
      if (trimmedLine) {
        allLines.push(trimmedLine);
      }
    }

    // Add page break indicator
    if (p < doc.numPages) {
      allLines.push(""); // Empty line between pages
    }
  }

  // Use the cleanup method to free memory
  await doc.cleanup();

  // Build raw text for preview
  fullRawText = allLines.join("\n");

  return {
    lines: allLines.filter(line => line.length > 0), // Remove empty lines for processing
    raw: fullRawText.trim(),
    engine: "pdfjs-dist-legacy-layout-aware",
    charCount: fullRawText.length,
  };
}

/**
 * Bank of America-specific transaction parser.
 * Designed for the specific layout of BofA credit card statements.
 */
function parseBankOfAmerica(lines: string[]): Transaction[] {
  const transactions: Transaction[] = [];
  
  // Regex designed for the specific layout of the BofA statement.
  // It looks for two dates, a description, an optional reference number,
  // an optional account number, and a final amount.
  const transactionRegex =
    /^(\d{2}\/\d{2})\s+(\d{2}\/\d{2})\s+(.+?)\s+([\d\s]+)\s+(\d+)\s+([-\d.,]+)$/;

  for (const line of lines) {
    const match = line.match(transactionRegex);
    if (match) {
      const [, transDate, postDate, description, , , amountStr] = match;
      
      // We use the posting date as the primary date.
      const date = normalizeDate(postDate);
      
      // Clean up the amount string (remove commas) and parse it.
      const amount = parseFloat(amountStr.replace(/,/g, ""));

      if (!isNaN(amount) && description) {
        transactions.push({
          date,
          description: description.trim(),
          amount,
        });
      }
    }
  }
  
  return transactions;
}

/**
 * Generic fallback transaction parser.
 * Uses pattern matching for common statement formats.
 */
function parseGeneric(lines: string[]): Transaction[] {
  const out: Transaction[] = [];
  if (!lines.length) return out;

  // Pattern to match date and amount
  // Supports formats like: 12/31/2024 or 12/31 or 12-31-2024
  // Amounts like: $1,234.56 or (1,234.56) or -$1,234.56
  const rx = /(\b\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)\b.*?(-?\$?\d{1,3}(?:,\d{3})*\.\d{2}|\(\$?\d{1,3}(?:,\d{3})*\.\d{2}\))/;

  for (const raw of lines) {
    const line = raw.replace(/\s+/g, " ").trim();
    const m = rx.exec(line);
    if (!m) continue;

    const [, dateStr, amtStr] = m;
    
    // Determine if amount is negative (parentheses or minus sign)
    const isNeg = amtStr.includes("(") || amtStr.startsWith("-");
    const amount = parseFloat(amtStr.replace(/[,$()-]/g, ""));
    const finalAmount = isNeg ? -Math.abs(amount) : amount;

    // Extract description by removing date and amount from line
    const description = line
      .replace(dateStr, "")
      .replace(amtStr, "")
      .replace(/\s+/g, " ")
      .trim();

    const date = normalizeDate(dateStr);

    if (!Number.isNaN(finalAmount) && description) {
      out.push({ date, description, amount: finalAmount });
    }
  }

  return out;
}

/**
 * Extract transactions from parsed lines.
 * Uses strategy pattern to select appropriate parser based on bank identification.
 */
export function extractTransactions(lines: string[]): Transaction[] {
  const rawText = lines.join("\n").toLowerCase();

  // Strategy Selection - identify bank and use appropriate parser
  if (rawText.includes("bank of america")) {
    console.log("Detected Bank of America statement - using specialized parser");
    return parseBankOfAmerica(lines);
  }

  // Add more bank-specific strategies here in the future:
  // if (rawText.includes("chase")) {
  //   return parseChase(lines);
  // }
  // if (rawText.includes("wells fargo")) {
  //   return parseWellsFargo(lines);
  // }
  
  // Fallback to generic parser if no specific bank is identified
  console.log("No specific bank detected - using generic parser");
  return parseGeneric(lines);
}

/**
 * Normalize date string to ISO format.
 * Handles various formats: MM/DD/YYYY, MM/DD/YY, MM-DD-YYYY, etc.
 */
function normalizeDate(s: string): string {
  // Match MM/DD or MM/DD/YY or MM/DD/YYYY (with / or -)
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (!m) return new Date().toISOString();

  const mm = Number(m[1]);
  const dd = Number(m[2]);
  let yyyy = m[3] ? Number(m[3]) : new Date().getFullYear();
  
  // Handle 2-digit years
  if (yyyy < 100) {
    yyyy = yyyy >= 50 ? 1900 + yyyy : 2000 + yyyy;
  }

  // Create date in UTC to avoid timezone issues
  const d = new Date(Date.UTC(yyyy, mm - 1, dd));
  
  // Validate the date
  if (isNaN(d.getTime())) {
    return new Date().toISOString();
  }

  return d.toISOString();
}
