import { supabase } from "@/lib/supabase";
import type { Tables, InsertTables, UpdateTables } from "@/types/database";

export async function getBudgets(householdId: string) {
  const { data, error } = await supabase
    .from("budgets")
    .select("*, categories(*)")
    .eq("household_id", householdId)
    .order("created_at");

  if (error) throw error;
  return data as (Tables<"budgets"> & {
    categories: Tables<"categories">;
  })[];
}

export async function createBudget(data: InsertTables<"budgets">) {
  const { data: result, error } = await supabase
    .from("budgets")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updateBudget(
  id: string,
  data: UpdateTables<"budgets">
) {
  const { data: result, error } = await supabase
    .from("budgets")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function deleteBudget(id: string) {
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) throw error;
}
