import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import {
  getTransactions,
  getRecentTransactions,
  getSpendingByCategory,
  getCashFlow,
  getMultiMonthCashFlow,
  getDailySpending,
  createTransaction,
  updateTransaction,
  deleteTransactions,
  linkTransferPair,
  unlinkTransferPair,
  findTransferMatches,
  type TransactionFilters,
  type TransferMatch,
} from "@/services/transactions";
import { classifyTransactions, type ClassifyResult } from "@/services/ai";
import { supabase } from "@/lib/supabase";
import type { InsertTables, UpdateTables } from "@/types/database";
import { useHousehold } from "./useHousehold";

const CLASSIFY_BATCH_SIZE = 20;

export function useTransactions(
  filters: Omit<TransactionFilters, "householdId">
) {
  const { currentHouseholdId } = useHousehold();

  return useQuery({
    queryKey: ["transactions", currentHouseholdId, filters],
    queryFn: () =>
      getTransactions({ householdId: currentHouseholdId!, ...filters }),
    enabled: !!currentHouseholdId,
  });
}

export function useRecentTransactions(limit = 10) {
  const { currentHouseholdId } = useHousehold();

  return useQuery({
    queryKey: ["recent-transactions", currentHouseholdId, limit],
    queryFn: () => getRecentTransactions(currentHouseholdId!, limit),
    enabled: !!currentHouseholdId,
  });
}

export function useSpendingByCategory(start: string, end: string) {
  const { currentHouseholdId } = useHousehold();

  return useQuery({
    queryKey: ["spending-by-category", currentHouseholdId, start, end],
    queryFn: () => getSpendingByCategory(currentHouseholdId!, start, end),
    enabled: !!currentHouseholdId,
  });
}

export function useCashFlow(start: string, end: string) {
  const { currentHouseholdId } = useHousehold();

  return useQuery({
    queryKey: ["cash-flow", currentHouseholdId, start, end],
    queryFn: () => getCashFlow(currentHouseholdId!, start, end),
    enabled: !!currentHouseholdId,
  });
}

export function useMultiMonthCashFlow(currentDate: Date, monthsBack = 6) {
  const { currentHouseholdId } = useHousehold();
  const end = format(endOfMonth(currentDate), "yyyy-MM-dd");
  const start = format(startOfMonth(subMonths(currentDate, monthsBack - 1)), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["multi-month-cash-flow", currentHouseholdId, start, end],
    queryFn: () => getMultiMonthCashFlow(currentHouseholdId!, start, end),
    enabled: !!currentHouseholdId,
  });
}

export function useDailySpending(start: string, end: string) {
  const { currentHouseholdId } = useHousehold();

  return useQuery({
    queryKey: ["daily-spending", currentHouseholdId, start, end],
    queryFn: () => getDailySpending(currentHouseholdId!, start, end),
    enabled: !!currentHouseholdId,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InsertTables<"transactions">) =>
      createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["recent-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["spending-by-category"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow"] });
      queryClient.invalidateQueries({ queryKey: ["daily-spending"] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTables<"transactions"> }) =>
      updateTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["recent-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["spending-by-category"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow"] });
      queryClient.invalidateQueries({ queryKey: ["daily-spending"] });
    },
  });
}

export function useDeleteTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => deleteTransactions(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["recent-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["spending-by-category"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow"] });
      queryClient.invalidateQueries({ queryKey: ["daily-spending"] });
    },
  });
}

export function useLinkTransferPair() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ txnIdA, txnIdB }: { txnIdA: string; txnIdB: string }) =>
      linkTransferPair(txnIdA, txnIdB),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["recent-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["spending-by-category"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow"] });
      queryClient.invalidateQueries({ queryKey: ["daily-spending"] });
      queryClient.invalidateQueries({ queryKey: ["credit-card-payments"] });
    },
  });
}

export function useUnlinkTransferPair() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (txnId: string) => unlinkTransferPair(txnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["recent-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["spending-by-category"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow"] });
      queryClient.invalidateQueries({ queryKey: ["daily-spending"] });
      queryClient.invalidateQueries({ queryKey: ["credit-card-payments"] });
    },
  });
}

export type { TransferMatch };

export function useFindTransferMatches(txnId: string | null) {
  return useQuery({
    queryKey: ["transfer-matches", txnId],
    queryFn: () => findTransferMatches(txnId!),
    enabled: !!txnId,
  });
}

export function useClassifyTransactions() {
  const queryClient = useQueryClient();
  const { currentHouseholdId } = useHousehold();

  return useMutation({
    mutationFn: async (opts?: {
      transactionIds?: string[];
      onProgress?: (done: number, total: number) => void;
    }): Promise<ClassifyResult> => {
      if (!currentHouseholdId) throw new Error("No household selected");

      // If specific IDs given and small enough, send directly
      if (opts?.transactionIds && opts.transactionIds.length <= CLASSIFY_BATCH_SIZE) {
        return classifyTransactions(currentHouseholdId, opts.transactionIds);
      }

      // Get IDs to classify: either provided or fetch uncategorized
      let ids = opts?.transactionIds;
      if (!ids) {
        const { data } = await supabase
          .from("transactions")
          .select("id")
          .eq("household_id", currentHouseholdId)
          .is("category_id", null)
          .order("date", { ascending: false })
          .limit(500);
        ids = data?.map((t) => t.id) ?? [];
      }

      if (ids.length === 0) {
        return { classified: 0, skipped: 0, errors: 0 };
      }

      // Process in batches with progress
      const totals: ClassifyResult = { classified: 0, skipped: 0, errors: 0 };

      for (let i = 0; i < ids.length; i += CLASSIFY_BATCH_SIZE) {
        const batch = ids.slice(i, i + CLASSIFY_BATCH_SIZE);
        try {
          const result = await classifyTransactions(currentHouseholdId, batch);
          totals.classified += result.classified;
          totals.skipped += result.skipped;
          totals.errors += result.errors;
        } catch {
          totals.errors += batch.length;
        }
        opts?.onProgress?.(Math.min(i + CLASSIFY_BATCH_SIZE, ids.length), ids.length);
      }

      return totals;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["recent-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["spending-by-category"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow"] });
      queryClient.invalidateQueries({ queryKey: ["daily-spending"] });
    },
  });
}
