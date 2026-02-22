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

export async function getCreditCardPayments(householdId: string) {
  // Get all credit-type account IDs
  const { data: creditAccounts, error: accError } = await supabase
    .from("accounts")
    .select("id, name, balance_current")
    .eq("household_id", householdId)
    .eq("type", "credit");

  if (accError) throw accError;
  if (!creditAccounts || creditAccounts.length === 0) return [];

  const accountIds = creditAccounts.map((a) => a.id);

  // Get transfer-linked transactions for these accounts
  const { data: payments, error: payError } = await supabase
    .from("transactions")
    .select("*, accounts(*)")
    .eq("is_transfer", true)
    .in("account_id", accountIds)
    .order("date", { ascending: false })
    .limit(20);

  if (payError) throw payError;

  return creditAccounts.map((account) => {
    const accountPayments = (payments ?? []).filter(
      (p) => p.account_id === account.id
    );
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const monthTotal = accountPayments
      .filter((p) => p.date >= monthStart)
      .reduce((sum, p) => sum + Math.abs(p.amount), 0);

    return {
      account,
      payments: accountPayments.slice(0, 3) as (Tables<"transactions"> & { accounts: Tables<"accounts"> | null })[],
      monthTotal,
    };
  });
}
