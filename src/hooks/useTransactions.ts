import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTransactions,
  getRecentTransactions,
  getSpendingByCategory,
  getCashFlow,
  createTransaction,
  updateTransaction,
  deleteTransactions,
  type TransactionFilters,
} from "@/services/transactions";
import type { InsertTables, UpdateTables } from "@/types/database";
import { useHousehold } from "./useHousehold";

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
    },
  });
}
