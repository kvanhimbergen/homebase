import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import {
  getTransactions,
  getRecentTransactions,
  getSpendingByCategory,
  getCashFlow,
  getMultiMonthCashFlow,
  createTransaction,
  updateTransaction,
  deleteTransactions,
  type TransactionFilters,
} from "@/services/transactions";
import { classifyTransactions } from "@/services/ai";
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

export function useClassifyTransactions() {
  const queryClient = useQueryClient();
  const { currentHouseholdId } = useHousehold();

  return useMutation({
    mutationFn: () => {
      if (!currentHouseholdId) throw new Error("No household selected");
      return classifyTransactions(currentHouseholdId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["recent-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["spending-by-category"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow"] });
    },
  });
}
