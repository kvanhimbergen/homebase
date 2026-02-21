import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const BATCH_SIZE = 50;

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

    const { household_id } = await req.json();
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
    const categoryNames = categories.map((c) => c.name);

    // Fetch uncategorized transactions (skip user-classified ones)
    const { data: transactions, error: txnError } = await adminClient
      .from("transactions")
      .select("id, name, merchant_name, amount, date")
      .eq("household_id", household_id)
      .is("category_id", null)
      .neq("classified_by", "user")
      .order("date", { ascending: false })
      .limit(500);

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

    // Process in batches
    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE);

      const txnList = batch.map((t) => ({
        id: t.id,
        name: t.name,
        merchant: t.merchant_name,
        amount: t.amount,
        date: t.date,
      }));

      const prompt = `You are a financial transaction categorizer. Classify each transaction into exactly one of these categories: ${categoryNames.join(", ")}.

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
          errors += batch.length;
          continue;
        }

        const openaiData = await openaiRes.json();
        const content = openaiData.choices?.[0]?.message?.content;
        if (!content) {
          errors += batch.length;
          continue;
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
        console.error("Batch error:", err);
        errors += batch.length;
      }
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
