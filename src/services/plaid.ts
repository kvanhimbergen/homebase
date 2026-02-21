import { supabase } from "@/lib/supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function invokeFn<T>(
  fnName: string,
  body: Record<string, unknown>
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    let msg = `${fnName}: ${res.status}`;
    try {
      const json = JSON.parse(text);
      if (json.error) msg = json.error;
      else if (json.msg) msg = json.msg;
    } catch {
      if (text) msg = `${fnName}: ${text.slice(0, 200)}`;
    }
    throw new Error(msg);
  }

  return JSON.parse(text) as T;
}

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
