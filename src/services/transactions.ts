import { supabase } from "@/lib/supabase";
import { eachMonthOfInterval, format, parseISO, startOfMonth } from "date-fns";
import type { Tables, InsertTables, UpdateTables } from "@/types/database";
import type { TransactionSource } from "@/lib/constants";

export type SortField = "date" | "amount" | "name";
export type SortDirection = "asc" | "desc";

export interface TransactionFilters {
  householdId: string;
  search?: string;
  accountId?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: SortField;
  sortDirection?: SortDirection;
  source?: TransactionSource;
  classifiedBy?: "user" | "ai" | "plaid" | "none";
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
  offset?: number;
}

export async function getTransactions(filters: TransactionFilters) {
  const sortBy = filters.sortBy ?? "date";
  const ascending = (filters.sortDirection ?? "desc") === "asc";

  let query = supabase
    .from("transactions")
    .select("*, categories(*), accounts(*)", { count: "exact" })
    .eq("household_id", filters.householdId)
    .eq("is_split", false)
    .order(sortBy, { ascending });

  // Secondary sort: when sorting by amount or name, add date desc as tiebreaker
  if (sortBy !== "date") {
    query = query.order("date", { ascending: false });
  }

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
  if (filters.source) {
    query = query.eq("source", filters.source);
  }
  if (filters.classifiedBy) {
    if (filters.classifiedBy === "none") {
      query = query.is("category_id", null);
    } else {
      query = query.eq("classified_by", filters.classifiedBy);
    }
  }
  if (filters.minAmount != null) {
    query = query.gte("amount", filters.minAmount);
  }
  if (filters.maxAmount != null) {
    query = query.lte("amount", filters.maxAmount);
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

export interface MonthCashFlow {
  month: string;
  income: number;
  expenses: number;
}

export async function getMultiMonthCashFlow(
  householdId: string,
  start: string,
  end: string
): Promise<MonthCashFlow[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("date, amount")
    .eq("household_id", householdId)
    .eq("is_split", false)
    .gte("date", start)
    .lte("date", end);

  if (error) throw error;

  const startDate = parseISO(start);
  const endDate = parseISO(end);
  const months = eachMonthOfInterval({ start: startDate, end: endDate });

  const buckets = new Map<string, { income: number; expenses: number }>();
  for (const m of months) {
    buckets.set(format(m, "MMM yyyy"), { income: 0, expenses: 0 });
  }

  for (const txn of data) {
    const key = format(startOfMonth(parseISO(txn.date)), "MMM yyyy");
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (txn.amount < 0) {
      bucket.income += Math.abs(txn.amount);
    } else {
      bucket.expenses += txn.amount;
    }
  }

  return months.map((m) => {
    const key = format(m, "MMM yyyy");
    const bucket = buckets.get(key)!;
    return { month: format(m, "MMM"), income: bucket.income, expenses: bucket.expenses };
  });
}
