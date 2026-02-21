import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const PLAID_ENV = Deno.env.get("PLAID_ENV") ?? "sandbox";
const PLAID_BASE_URL =
  PLAID_ENV === "production"
    ? "https://production.plaid.com"
    : PLAID_ENV === "development"
      ? "https://development.plaid.com"
      : "https://sandbox.plaid.com";

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

    const { public_token, household_id, institution } = await req.json();
    if (!public_token || !household_id) {
      return new Response(
        JSON.stringify({ error: "public_token and household_id are required" }),
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

    // Verify membership
    const { data: membership } = await adminClient
      .from("household_members")
      .select("role")
      .eq("household_id", household_id)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return new Response(
        JSON.stringify({ error: "Only owners and admins can connect banks" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Exchange public token for access token
    const exchangeResponse = await fetch(
      `${PLAID_BASE_URL}/item/public_token/exchange`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: Deno.env.get("PLAID_CLIENT_ID"),
          secret: Deno.env.get("PLAID_SECRET"),
          public_token,
        }),
      }
    );

    const exchangeData = await exchangeResponse.json();
    if (!exchangeResponse.ok) {
      return new Response(
        JSON.stringify({
          error: exchangeData.error_message ?? "Token exchange failed",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { access_token, item_id: plaid_item_id } = exchangeData;

    // Insert plaid_items row
    const { data: plaidItem, error: insertError } = await adminClient
      .from("plaid_items")
      .insert({
        household_id,
        plaid_item_id,
        plaid_access_token: access_token,
        institution_name: institution?.name ?? null,
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    // Fetch accounts from Plaid
    const accountsResponse = await fetch(`${PLAID_BASE_URL}/accounts/get`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: Deno.env.get("PLAID_CLIENT_ID"),
        secret: Deno.env.get("PLAID_SECRET"),
        access_token,
      }),
    });

    const accountsData = await accountsResponse.json();
    if (!accountsResponse.ok) {
      return new Response(
        JSON.stringify({
          error: accountsData.error_message ?? "Failed to fetch accounts",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Upsert accounts
    let accountsCreated = 0;
    for (const acct of accountsData.accounts) {
      const { error: upsertError } = await adminClient
        .from("accounts")
        .upsert(
          {
            household_id,
            plaid_item_id: plaidItem.id,
            plaid_account_id: acct.account_id,
            name: acct.name,
            official_name: acct.official_name ?? null,
            type: acct.type,
            subtype: acct.subtype ?? null,
            mask: acct.mask ?? null,
            balance_current: acct.balances.current ?? 0,
            balance_available: acct.balances.available ?? null,
          },
          { onConflict: "plaid_account_id" }
        );

      if (upsertError) {
        console.error("Account upsert error:", upsertError);
      } else {
        accountsCreated++;
      }
    }

    return new Response(
      JSON.stringify({
        plaid_item_id: plaidItem.id,
        accounts_created: accountsCreated,
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
