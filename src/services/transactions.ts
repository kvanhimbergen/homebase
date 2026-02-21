import { supabase } from "@/lib/supabase";
import type { Tables, InsertTables, UpdateTables } from "@/types/database";

export interface TransactionFilters {
  householdId: string;
  search?: string;
  accountId?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export async function getTransactions(filters: TransactionFilters) {
  let query = supabase
    .from("transactions")
    .select("*, categories(*), accounts(*)", { count: "exact" })
    .eq("household_id", filters.householdId)
    .eq("is_split", false)
    .order("date", { ascending: false });

  if (filters.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,merchant_name.ilike.%${filters.search}%`
    );
  }
  if (filters.accountId) {
    query = query.eq("account_id", filters.accountId);
  }
  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }
  if (filters.startDate) {
    query = query.gte("date", filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte("date", filters.endDate);
  }
  if (filters.limit) {
    query = query.limit(filters.limit);
  }
  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit ?? 50) - 1);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data as (Tables<"transactions"> & { categories: Tables<"categories"> | null; accounts: Tables<"accounts"> | null })[], count };
}

export async function getRecentTransactions(
  householdId: string,
  limit = 10
) {
  const { data, error } = await supabase
    .from("transactions")
    .select("*, categories(*), accounts(*)")
    .eq("household_id", householdId)
    .eq("is_split", false)
    .order("date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as (Tables<"transactions"> & { categories: Tables<"categories"> | null; accounts: Tables<"accounts"> | null })[];
}

export async function createTransaction(
  data: InsertTables<"transactions">
) {
  const { data: result, error } = await supabase
    .from("transactions")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updateTransaction(
  id: string,
  data: UpdateTables<"transactions">
) {
  const { data: result, error } = await supabase
    .from("transactions")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function deleteTransactions(ids: string[]) {
  const { error } = await supabase
    .from("transactions")
    .delete()
    .in("id", ids);
  if (error) throw error;
}

export async function getSpendingByCategory(
  householdId: string,
  start: string,
  end: string
) {
  const { data, error } = await supabase.rpc("spending_by_category", {
    p_household_id: householdId,
    p_start: start,
    p_end: end,
  });
  if (error) throw error;
  return data;
}

export async function getCashFlow(
  householdId: string,
  start: string,
  end: string
) {
  const { data, error } = await supabase
    .from("transactions")
    .select("amount")
    .eq("household_id", householdId)
    .eq("is_split", false)
    .gte("date", start)
    .lte("date", end);

  if (error) throw error;

  const income = data
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const expenses = data
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  return { income, expenses, net: income - expenses };
}
