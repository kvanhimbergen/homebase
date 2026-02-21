import { supabase } from "@/lib/supabase";
import type { Tables, InsertTables, UpdateTables } from "@/types/database";

export async function getAccounts(householdId: string) {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("household_id", householdId)
    .order("name");

  if (error) throw error;
  return data as Tables<"accounts">[];
}

export async function createAccount(data: InsertTables<"accounts">) {
  const { data: result, error } = await supabase
    .from("accounts")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updateAccount(
  id: string,
  data: UpdateTables<"accounts">
) {
  const { data: result, error } = await supabase
    .from("accounts")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function deleteAccount(id: string) {
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) throw error;
}

export async function getAccountBalanceSummary(householdId: string) {
  const { data, error } = await supabase
    .from("accounts")
    .select("type, balance_current")
    .eq("household_id", householdId)
    .eq("is_hidden", false);

  if (error) throw error;

  const summary = {
    checking: 0,
    savings: 0,
    credit: 0,
    investment: 0,
    other: 0,
    netWorth: 0,
  };

  for (const account of data) {
    const balance = account.balance_current ?? 0;
    switch (account.type) {
      case "depository":
        summary.checking += balance;
        break;
      case "savings":
        summary.savings += balance;
        break;
      case "credit":
        summary.credit += balance;
        break;
      case "investment":
        summary.investment += balance;
        break;
      default:
        summary.other += balance;
    }
  }

  summary.netWorth =
    summary.checking + summary.savings + summary.investment - summary.credit + summary.other;

  return summary;
}
