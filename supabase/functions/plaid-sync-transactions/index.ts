import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const PLAID_ENV = Deno.env.get("PLAID_ENV") ?? "sandbox";
const PLAID_BASE_URL =
  PLAID_ENV === "production"
    ? "https://production.plaid.com"
    : PLAID_ENV === "development"
      ? "https://development.plaid.com"
      : "https://sandbox.plaid.com";

// Map Plaid personal_finance_category.primary → app category name
const PLAID_CATEGORY_MAP: Record<string, string> = {
  INCOME: "Income",
  TRANSFER_IN: "Income",
  FOOD_AND_DRINK: "Food & Dining",
  TRANSPORTATION: "Transportation",
  TRAVEL: "Transportation",
  GENERAL_MERCHANDISE: "Shopping",
  ENTERTAINMENT: "Entertainment",
  RECREATION: "Entertainment",
  MEDICAL: "Health",
  RENT_AND_UTILITIES: "Utilities",
  UTILITIES: "Utilities",
  INSURANCE: "Insurance",
  EDUCATION: "Education",
  PERSONAL_CARE: "Personal Care",
  LOAN_PAYMENTS: "Housing",
  HOME_IMPROVEMENT: "Housing",
  MORTGAGE: "Housing",
  TRANSFER_OUT: "Savings & Investments",
  INVESTMENT: "Savings & Investments",
  SAVINGS: "Savings & Investments",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the user is authenticated
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { plaid_item_id } = await req.json();
    if (!plaid_item_id) {
      return new Response(
        JSON.stringify({ error: "plaid_item_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch the plaid_items row
    const { data: plaidItem, error: itemError } = await adminClient
      .from("plaid_items")
      .select("*")
      .eq("id", plaid_item_id)
      .single();

    if (itemError || !plaidItem) {
      return new Response(
        JSON.stringify({ error: "Plaid item not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify user belongs to this household
    const { data: membership } = await adminClient
      .from("household_members")
      .select("role")
      .eq("household_id", plaidItem.household_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load household categories for mapping
    const { data: categories } = await adminClient
      .from("categories")
      .select("id, name")
      .eq("household_id", plaidItem.household_id);

    const categoryByName = new Map(
      (categories ?? []).map((c) => [c.name, c.id])
    );

    // Build account_id lookup: plaid_account_id → our UUID
    const { data: accounts } = await adminClient
      .from("accounts")
      .select("id, plaid_account_id")
      .eq("plaid_item_id", plaid_item_id);

    const accountIdMap = new Map(
      (accounts ?? [])
        .filter((a) => a.plaid_account_id)
        .map((a) => [a.plaid_account_id, a.id])
    );

    let cursor = plaidItem.cursor ?? undefined;
    let totalAdded = 0;
    let totalModified = 0;
    let totalRemoved = 0;
    let hasMore = true;

    while (hasMore) {
      const syncBody: Record<string, unknown> = {
        client_id: Deno.env.get("PLAID_CLIENT_ID"),
        secret: Deno.env.get("PLAID_SECRET"),
        access_token: plaidItem.plaid_access_token,
        count: 500,
      };
      if (cursor) {
        syncBody.cursor = cursor;
      }

      const syncResponse = await fetch(
        `${PLAID_BASE_URL}/transactions/sync`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(syncBody),
        }
      );

      const syncData = await syncResponse.json();
      if (!syncResponse.ok) {
        return new Response(
          JSON.stringify({
            error: syncData.error_message ?? "Transaction sync failed",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Process added transactions
      for (const txn of syncData.added ?? []) {
        const plaidPrimary =
          txn.personal_finance_category?.primary ?? "";
        const appCategoryName = PLAID_CATEGORY_MAP[plaidPrimary];
        const categoryId = appCategoryName
          ? categoryByName.get(appCategoryName) ?? null
          : null;
        const accountId = accountIdMap.get(txn.account_id) ?? null;

        await adminClient.from("transactions").upsert(
          {
            household_id: plaidItem.household_id,
            account_id: accountId,
            category_id: categoryId,
            plaid_transaction_id: txn.transaction_id,
            amount: txn.amount,
            date: txn.date,
            name: txn.name,
            merchant_name: txn.merchant_name ?? null,
            source: "plaid" as const,
            classified_by: categoryId ? "plaid" : null,
          },
          { onConflict: "plaid_transaction_id" }
        );
        totalAdded++;
      }

      // Process modified transactions
      for (const txn of syncData.modified ?? []) {
        const plaidPrimary =
          txn.personal_finance_category?.primary ?? "";
        const appCategoryName = PLAID_CATEGORY_MAP[plaidPrimary];
        const categoryId = appCategoryName
          ? categoryByName.get(appCategoryName) ?? null
          : null;
        const accountId = accountIdMap.get(txn.account_id) ?? null;

        await adminClient.from("transactions").upsert(
          {
            household_id: plaidItem.household_id,
            account_id: accountId,
            category_id: categoryId,
            plaid_transaction_id: txn.transaction_id,
            amount: txn.amount,
            date: txn.date,
            name: txn.name,
            merchant_name: txn.merchant_name ?? null,
            source: "plaid" as const,
            classified_by: categoryId ? "plaid" : null,
          },
          { onConflict: "plaid_transaction_id" }
        );
        totalModified++;
      }

      // Process removed transactions
      for (const txn of syncData.removed ?? []) {
        await adminClient
          .from("transactions")
          .delete()
          .eq("plaid_transaction_id", txn.transaction_id);
        totalRemoved++;
      }

      cursor = syncData.next_cursor;
      hasMore = syncData.has_more ?? false;

      // Update cursor after each page
      await adminClient
        .from("plaid_items")
        .update({ cursor, updated_at: new Date().toISOString() })
        .eq("id", plaid_item_id);
    }

    // Refresh account balances
    const balancesResponse = await fetch(`${PLAID_BASE_URL}/accounts/get`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: Deno.env.get("PLAID_CLIENT_ID"),
        secret: Deno.env.get("PLAID_SECRET"),
        access_token: plaidItem.plaid_access_token,
      }),
    });

    if (balancesResponse.ok) {
      const balancesData = await balancesResponse.json();
      for (const acct of balancesData.accounts ?? []) {
        await adminClient
          .from("accounts")
          .update({
            balance_current: acct.balances.current ?? 0,
            balance_available: acct.balances.available ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("plaid_account_id", acct.account_id);
      }
    }

    return new Response(
      JSON.stringify({
        added: totalAdded,
        modified: totalModified,
        removed: totalRemoved,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
