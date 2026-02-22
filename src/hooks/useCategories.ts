import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/services/categories";
import type { Tables, InsertTables, UpdateTables } from "@/types/database";
import { useHousehold } from "./useHousehold";

export interface CategoryNode {
  parent: Tables<"categories">;
  children: Tables<"categories">[];
}

export function useCategories() {
  const { currentHouseholdId } = useHousehold();

  return useQuery({
    queryKey: ["categories", currentHouseholdId],
    queryFn: () => getCategories(currentHouseholdId!),
    enabled: !!currentHouseholdId,
  });
}

export function useCategoryTree() {
  const { data: categories } = useCategories();

  return useMemo(() => {
    if (!categories) return [];

    const parents = categories.filter((c) => !c.parent_id);
    const childrenByParent = new Map<string, Tables<"categories">[]>();

    for (const cat of categories) {
      if (cat.parent_id) {
        const list = childrenByParent.get(cat.parent_id) ?? [];
        list.push(cat);
        childrenByParent.set(cat.parent_id, list);
      }
    }

    return parents.map((parent) => ({
      parent,
      children: childrenByParent.get(parent.id) ?? [],
    }));
  }, [categories]);
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InsertTables<"categories">) => createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTables<"categories"> }) =>
      updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}
