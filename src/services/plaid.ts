import { supabase } from "@/lib/supabase";
import { invokeFn } from "@/lib/invoke-fn";

export async function createLinkToken(householdId: string) {
  return invokeFn<{ link_token: string }>("plaid-create-link-token", {
    household_id: householdId,
  });
}

export async function exchangePublicToken(params: {
  publicToken: string;
  householdId: string;
  institution: { name: string; institution_id: string };
}) {
  return invokeFn<{ plaid_item_id: string; accounts_created: number }>(
    "plaid-exchange-token",
    {
      public_token: params.publicToken,
      household_id: params.householdId,
      institution: params.institution,
    }
  );
}

export async function syncTransactions(plaidItemId: string) {
  return invokeFn<{ added: number; modified: number; removed: number }>(
    "plaid-sync-transactions",
    { plaid_item_id: plaidItemId }
  );
}

export async function getPlaidItems(householdId: string) {
  const { data, error } = await supabase
    .from("plaid_items")
    .select("id, household_id, plaid_item_id, institution_name, cursor, error, created_at, updated_at")
    .eq("household_id", householdId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}
