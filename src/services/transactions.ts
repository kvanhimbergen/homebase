import { supabase } from "@/lib/supabase";
import { eachMonthOfInterval, format, parseISO, startOfMonth } from "date-fns";
import type { Tables, InsertTables, UpdateTables } from "@/types/database";
import type { TransactionSource } from "@/lib/constants";

export type SortField = "date" | "amount" | "name";
export type SortDirection = "asc" | "desc";

export interface TransactionFilters {
  householdId: string;
  search?: string;
  accountIds?: string[];
  categoryIds?: string[];
  startDate?: string;
  endDate?: string;
  sortBy?: SortField;
  sortDirection?: SortDirection;
  sources?: TransactionSource[];
  classifiedByList?: ("user" | "ai" | "plaid" | "none")[];
  minAmount?: number;
  maxAmount?: number;
  hasCheckNumber?: boolean;
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
  if (filters.accountIds && filters.accountIds.length > 0) {
    query = query.in("account_id", filters.accountIds);
  }
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    query = query.in("category_id", filters.categoryIds);
  }
  if (filters.startDate) {
    query = query.gte("date", filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte("date", filters.endDate);
  }
  if (filters.sources && filters.sources.length > 0) {
    query = query.in("source", filters.sources);
  }
  if (filters.classifiedByList && filters.classifiedByList.length > 0) {
    const hasNone = filters.classifiedByList.includes("none");
    const others = filters.classifiedByList.filter((v) => v !== "none");
    if (hasNone && others.length > 0) {
      query = query.or(`category_id.is.null,classified_by.in.(${others.join(",")})`);
    } else if (hasNone) {
      query = query.is("category_id", null);
    } else {
      query = query.in("classified_by", others);
    }
  }
  if (filters.hasCheckNumber) {
    query = query.not("check_number", "is", null);
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
    .eq("is_transfer", false)
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
    .eq("is_transfer", false)
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

export interface DailySpending {
  date: string;
  amount: number;
}

export async function getDailySpending(
  householdId: string,
  start: string,
  end: string
): Promise<DailySpending[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("date, amount")
    .eq("household_id", householdId)
    .eq("is_split", false)
    .eq("is_transfer", false)
    .gt("amount", 0)
    .gte("date", start)
    .lte("date", end);

  if (error) throw error;

  const byDate = new Map<string, number>();
  for (const txn of data) {
    byDate.set(txn.date, (byDate.get(txn.date) ?? 0) + txn.amount);
  }

  return Array.from(byDate.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function linkTransferPair(txnIdA: string, txnIdB: string) {
  // Look up one of the transactions to get the household_id
  const { data: txnA, error: fetchError } = await supabase
    .from("transactions")
    .select("household_id")
    .eq("id", txnIdA)
    .single();
  if (fetchError || !txnA) throw fetchError ?? new Error("Transaction not found");

  // Find the household's Transfer category
  const { data: transferCat, error: catError } = await supabase
    .from("categories")
    .select("id")
    .eq("household_id", txnA.household_id)
    .eq("name", "Transfer")
    .single();
  if (catError || !transferCat) throw catError ?? new Error("Transfer category not found");

  // Update both transactions
  const updates = {
    is_transfer: true,
    category_id: transferCat.id,
    classified_by: "user" as const,
  };

  const { error: errA } = await supabase
    .from("transactions")
    .update({ ...updates, transfer_pair_id: txnIdB })
    .eq("id", txnIdA);
  if (errA) throw errA;

  const { error: errB } = await supabase
    .from("transactions")
    .update({ ...updates, transfer_pair_id: txnIdA })
    .eq("id", txnIdB);
  if (errB) throw errB;
}

export type TransferMatch = Tables<"transactions"> & {
  accounts: Tables<"accounts"> | null;
};

export async function findTransferMatches(
  txnId: string
): Promise<TransferMatch[]> {
  // Fetch the source transaction
  const { data: source, error: srcError } = await supabase
    .from("transactions")
    .select("household_id, amount, date, account_id")
    .eq("id", txnId)
    .single();
  if (srcError || !source) throw srcError ?? new Error("Transaction not found");

  const targetAmount = -source.amount;
  const epsilon = 0.005;
  const srcDate = parseISO(source.date);
  const minDate = format(new Date(srcDate.getTime() - 7 * 86400000), "yyyy-MM-dd");
  const maxDate = format(new Date(srcDate.getTime() + 7 * 86400000), "yyyy-MM-dd");

  const { data, error } = await supabase
    .from("transactions")
    .select("*, accounts(*)")
    .eq("household_id", source.household_id)
    .gte("amount", targetAmount - epsilon)
    .lte("amount", targetAmount + epsilon)
    .neq("account_id", source.account_id)
    .eq("is_transfer", false)
    .eq("is_split", false)
    .gte("date", minDate)
    .lte("date", maxDate)
    .neq("id", txnId)
    .order("date", { ascending: false })
    .limit(20);

  if (error) throw error;
  return data as TransferMatch[];
}

export async function unlinkTransferPair(txnId: string) {
  // Get the paired transaction id
  const { data: txn, error: fetchError } = await supabase
    .from("transactions")
    .select("transfer_pair_id")
    .eq("id", txnId)
    .single();
  if (fetchError || !txn) throw fetchError ?? new Error("Transaction not found");

  const clearData = {
    transfer_pair_id: null,
    is_transfer: false,
    category_id: null,
    classified_by: null,
  };

  const { error: errA } = await supabase
    .from("transactions")
    .update(clearData)
    .eq("id", txnId);
  if (errA) throw errA;

  if (txn.transfer_pair_id) {
    const { error: errB } = await supabase
      .from("transactions")
      .update(clearData)
      .eq("id", txn.transfer_pair_id);
    if (errB) throw errB;
  }
}
