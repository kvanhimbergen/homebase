import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPlaidItems,
  createLinkToken,
  exchangePublicToken,
  syncTransactions,
} from "@/services/plaid";
import { useHousehold } from "./useHousehold";

export function usePlaidItems() {
  const { currentHouseholdId } = useHousehold();

  return useQuery({
    queryKey: ["plaid-items", currentHouseholdId],
    queryFn: () => getPlaidItems(currentHouseholdId!),
    enabled: !!currentHouseholdId,
  });
}

export function useCreateLinkToken() {
  return useMutation({
    mutationFn: (householdId: string) => createLinkToken(householdId),
  });
}

export function useExchangePublicToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: exchangePublicToken,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["account-balance-summary"] });
      queryClient.invalidateQueries({ queryKey: ["plaid-items"] });
    },
  });
}

export function useSyncTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncTransactions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["account-balance-summary"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow"] });
      queryClient.invalidateQueries({ queryKey: ["spending-by-category"] });
    },
  });
}
