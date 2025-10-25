// lib/analyzer.server.ts

import type { Category } from "./types";

/**
 * A simple but powerful map to clean up and normalize merchant names.
 * Keys are common patterns found in transaction descriptions.
 * Values are the clean, standardized merchant names.
 */
const MERCHANT_ALIAS_MAP: Record<string, string> = {
  "starbucks": "Starbucks",
  "cvs": "CVS",
  "wal-mart": "Walmart",
  "stop & shop": "Stop & Shop",
  "e-zpass": "E-ZPass",
  "uber": "Uber",
  "lyft": "Lyft",
  "doordash": "DoorDash",
  "netflix": "Netflix",
  "spotify": "Spotify",
  "openai": "OpenAI",
  "amazon": "Amazon",
  "amzn": "Amazon",
  "steamgames": "Steam",
  "exitlag": "ExitLag",
};

/**
 * Cleans a raw transaction description to identify a known merchant.
 * @param description The raw transaction description.
 * @returns A cleaned merchant name or the original description if no alias is found.
 */
function getCleanMerchant(description: string): string {
  const lowerCaseDescription = description.toLowerCase();
  for (const alias in MERCHANT_ALIAS_MAP) {
    if (lowerCaseDescription.includes(alias)) {
      return MERCHANT_ALIAS_MAP[alias];
    }
  }
  // If no alias matches, return a cleaned-up version of the original
  return description
    .replace(/\s+/g, ' ')
    .replace(/#\d+/g, '')
    .trim();
}

/**
 * The main analysis function. It takes a raw description and a list of
 * available categories and attempts to assign the best fit.
 *
 * @param description The raw transaction description from the parser.
 * @param categories An array of the user's category objects from the database.
 * @returns The ID of the best-matching category, or the ID of the "Other" category.
 */
export function analyzeTransaction(
  description: string,
  categories: (Pick<Category, 'id' | 'name' | 'keywords'>)[]
): number {
  const cleanMerchant = getCleanMerchant(description).toLowerCase();
  const otherCategory = categories.find(c => c.name.toLowerCase() === 'other');
  const fallbackCategoryId = otherCategory?.id || -1; // Fallback to -1 if "Other" isn't found

  // Find the best match based on keywords
  for (const category of categories) {
    if (category.name.toLowerCase() === 'other') continue; // Skip 'Other' in the initial pass

    // Check if the category name itself is in the description
    if (cleanMerchant.includes(category.name.toLowerCase())) {
        return category.id;
    }

    // Check against all keywords for the category
    for (const keyword of category.keywords) {
      if (cleanMerchant.includes(keyword.toLowerCase())) {
        return category.id;
      }
    }
  }

  // If no keyword matches, return the ID of the "Other" category
  return fallbackCategoryId;
}