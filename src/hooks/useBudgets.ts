import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
} from "@/services/budgets";
import type { InsertTables, UpdateTables } from "@/types/database";
import { useHousehold } from "./useHousehold";

export function useBudgets() {
  const { currentHouseholdId } = useHousehold();

  return useQuery({
    queryKey: ["budgets", currentHouseholdId],
    queryFn: () => getBudgets(currentHouseholdId!),
    enabled: !!currentHouseholdId,
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InsertTables<"budgets">) => createBudget(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTables<"budgets"> }) =>
      updateBudget(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteBudget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}
