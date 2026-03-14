import { invokeFn } from "@/lib/invoke-fn";

export interface ClassifyResult {
  classified: number;
  skipped: number;
  errors: number;
}

/**
 * Classify a batch of transactions by ID.
 * If no IDs provided, the edge function finds uncategorized ones (legacy).
 */
export async function classifyTransactions(
  householdId: string,
  transactionIds?: string[]
): Promise<ClassifyResult> {
  return invokeFn<ClassifyResult>("ai-classify-transactions", {
    household_id: householdId,
    ...(transactionIds && { transaction_ids: transactionIds }),
  });
}
