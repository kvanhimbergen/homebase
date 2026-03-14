import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

interface ClassifyResult {
  transaction_id: string;
  category: string;
  confidence: number;
}

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

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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

    const { household_id, transaction_ids } = await req.json();
    if (!household_id) {
      return new Response(
        JSON.stringify({ error: "household_id is required" }),
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

    // Verify user belongs to this household
    const { data: membership } = await adminClient
      .from("household_members")
      .select("role")
      .eq("household_id", household_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load household categories
    const { data: categories } = await adminClient
      .from("categories")
      .select("id, name")
      .eq("household_id", household_id);

    if (!categories?.length) {
      return new Response(
        JSON.stringify({ classified: 0, skipped: 0, errors: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
    const categoryById = new Map(categories.map((c) => [c.id, c.name]));
    const categoryNames = categories.map((c) => c.name);

    // Fetch recent user-classified transactions as few-shot examples
    const { data: examples } = await adminClient
      .from("transactions")
      .select("name, merchant_name, amount, category_id")
      .eq("household_id", household_id)
      .eq("classified_by", "user")
      .not("category_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(50);

    // Deduplicate examples by merchant/name to get diverse coverage
    const seenNames = new Set<string>();
    const fewShotExamples: { name: string; merchant: string | null; amount: number; category: string }[] = [];
    for (const ex of examples ?? []) {
      const key = (ex.merchant_name ?? ex.name).toLowerCase();
      if (seenNames.has(key)) continue;
      seenNames.add(key);
      const catName = categoryById.get(ex.category_id);
      if (!catName) continue;
      fewShotExamples.push({
        name: ex.name,
        merchant: ex.merchant_name,
        amount: ex.amount,
        category: catName,
      });
    }

    // Load household accounts for context
    const { data: accounts } = await adminClient
      .from("accounts")
      .select("id, name, type")
      .eq("household_id", household_id);

    const accountById = new Map((accounts ?? []).map((a) => [a.id, a]));

    // Fetch transactions to classify
    let query = adminClient
      .from("transactions")
      .select("id, name, merchant_name, amount, date, check_number, account_id")
      .eq("household_id", household_id);

    if (transaction_ids && Array.isArray(transaction_ids) && transaction_ids.length > 0) {
      // Classify specific transactions by ID
      query = query.in("id", transaction_ids);
    } else {
      // Legacy: find uncategorized transactions
      query = query
        .is("category_id", null)
        .or("classified_by.is.null,classified_by.neq.user")
        .limit(500);
    }

    const { data: transactions, error: txnError } = await query.order("date", { ascending: false });

    if (txnError) {
      return new Response(
        JSON.stringify({ error: txnError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!transactions?.length) {
      return new Response(
        JSON.stringify({ classified: 0, skipped: 0, errors: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let classified = 0;
    let skipped = 0;
    let errors = 0;

    // Process all transactions in a single OpenAI call (client handles chunking)
    const txnList = transactions.map((t) => {
      const account = accountById.get(t.account_id);
      const entry: Record<string, unknown> = {
        id: t.id,
        name: t.name,
        merchant: t.merchant_name,
        amount: t.amount,
        date: t.date,
      };
      if (t.check_number) entry.check_number = t.check_number;
      if (account) {
        entry.account_name = account.name;
        entry.account_type = account.type; // depository, savings, credit, investment
      }
      return entry;
    });

    const hasTransferCategory = categoryNames.some((n) => n.toLowerCase() === "transfer");

    const examplesSection = fewShotExamples.length > 0
      ? `\n\nHere is how this household has previously categorized transactions — use these as guidance:\n${JSON.stringify(fewShotExamples)}\n`
      : "";

    const transferInstructions = hasTransferCategory
      ? `\n\nIMPORTANT — Transfer detection:
- If a transaction looks like a payment between the user's own accounts (e.g. credit card payment, savings transfer, loan payment), classify it as "Transfer".
- Common transfer indicators: descriptions containing "payment", "transfer", "xfer", "autopay", credit card company names (Chase, Amex, Capital One, Citi, Discover), bank names, "online banking transfer", "ACH transfer".
- Check transactions (check_number present) that reference a bank, credit card, or financial institution are likely transfers.
- When account_type is "depository" (checking) and the description mentions another financial institution, it's very likely a transfer.\n`
      : "";

    const prompt = `You are a financial transaction categorizer. Classify each transaction into exactly one of these categories: ${categoryNames.join(", ")}.
${examplesSection}${transferInstructions}
For each transaction, return a JSON object with:
- "results": an array of objects with "id" (the transaction id), "category" (exact category name from the list), and "confidence" (0.0-1.0, how confident you are).

Transactions to classify:
${JSON.stringify(txnList)}

Return ONLY valid JSON. Use the exact category names provided.`;

    try {
      const openaiRes = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            temperature: 0,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
          }),
        }
      );

      if (!openaiRes.ok) {
        const errText = await openaiRes.text();
        console.error("OpenAI error:", errText);
        return new Response(
          JSON.stringify({ classified: 0, skipped: 0, errors: transactions.length }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const openaiData = await openaiRes.json();
      const content = openaiData.choices?.[0]?.message?.content;
      if (!content) {
        return new Response(
          JSON.stringify({ classified: 0, skipped: 0, errors: transactions.length }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const parsed = JSON.parse(content) as { results: ClassifyResult[] };
      const results = parsed.results ?? [];

      for (const result of results) {
        const categoryId = categoryByName.get(result.category.toLowerCase());
        if (!categoryId) {
          skipped++;
          continue;
        }

        const { error: updateError } = await adminClient
          .from("transactions")
          .update({
            category_id: categoryId,
            classified_by: "ai",
            ai_category_confidence: Math.round(result.confidence * 100) / 100,
          })
          .eq("id", result.transaction_id ?? result.id)
          .eq("household_id", household_id);

        if (updateError) {
          console.error("Update error:", updateError.message);
          errors++;
        } else {
          classified++;
        }
      }
    } catch (err) {
      console.error("Classification error:", err);
      errors += transactions.length;
    }

    return new Response(
      JSON.stringify({ classified, skipped, errors }),
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
