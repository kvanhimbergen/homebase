import { supabase } from "@/lib/supabase";
import type { Tables, InsertTables, UpdateTables } from "@/types/database";

export async function getCategories(householdId: string) {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("household_id", householdId)
    .order("name");

  if (error) throw error;
  return data as Tables<"categories">[];
}

export async function createCategory(data: InsertTables<"categories">) {
  const { data: result, error } = await supabase
    .from("categories")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updateCategory(
  id: string,
  data: UpdateTables<"categories">
) {
  const { data: result, error } = await supabase
    .from("categories")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}
