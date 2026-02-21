import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  getAccountBalanceSummary,
} from "@/services/accounts";
import type { InsertTables, UpdateTables } from "@/types/database";
import { useHousehold } from "./useHousehold";

export function useAccounts() {
  const { currentHouseholdId } = useHousehold();

  return useQuery({
    queryKey: ["accounts", currentHouseholdId],
    queryFn: () => getAccounts(currentHouseholdId!),
    enabled: !!currentHouseholdId,
  });
}

export function useAccountBalanceSummary() {
  const { currentHouseholdId } = useHousehold();

  return useQuery({
    queryKey: ["account-balance-summary", currentHouseholdId],
    queryFn: () => getAccountBalanceSummary(currentHouseholdId!),
    enabled: !!currentHouseholdId,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InsertTables<"accounts">) => createAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["account-balance-summary"] });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTables<"accounts"> }) =>
      updateAccount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["account-balance-summary"] });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["account-balance-summary"] });
    },
  });
}
