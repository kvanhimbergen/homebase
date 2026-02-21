import { invokeFn } from "@/lib/invoke-fn";

export interface ClassifyResult {
  classified: number;
  skipped: number;
  errors: number;
}

export async function classifyTransactions(
  householdId: string
): Promise<ClassifyResult> {
  return invokeFn<ClassifyResult>("ai-classify-transactions", {
    household_id: householdId,
  });
}
