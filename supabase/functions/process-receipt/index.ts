import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

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

    const { receipt_scan_id, household_id } = await req.json();
    if (!receipt_scan_id || !household_id) {
      return new Response(
        JSON.stringify({
          error: "receipt_scan_id and household_id are required",
        }),
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

    // Fetch the receipt scan row
    const { data: scan, error: scanError } = await adminClient
      .from("receipt_scans")
      .select("*")
      .eq("id", receipt_scan_id)
      .eq("household_id", household_id)
      .single();

    if (scanError || !scan) {
      return new Response(
        JSON.stringify({ error: "Receipt scan not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update status to processing
    await adminClient
      .from("receipt_scans")
      .update({ status: "processing" })
      .eq("id", receipt_scan_id);

    // Download image from storage
    const { data: fileData, error: downloadError } = await adminClient.storage
      .from("household-files")
      .download(scan.storage_path);

    if (downloadError || !fileData) {
      await adminClient
        .from("receipt_scans")
        .update({
          status: "failed",
          extracted_data: { error: "Failed to download receipt image" },
        })
        .eq("id", receipt_scan_id);

      return new Response(
        JSON.stringify({
          receipt_scan_id,
          status: "failed",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );

    // Determine media type
    const ext = scan.storage_path.split(".").pop()?.toLowerCase();
    const mediaType =
      ext === "png"
        ? "image/png"
        : ext === "gif"
          ? "image/gif"
          : ext === "webp"
            ? "image/webp"
            : ext === "pdf"
              ? "application/pdf"
              : "image/jpeg";

    // Load household categories
    const { data: categories } = await adminClient
      .from("categories")
      .select("id, name")
      .eq("household_id", household_id);

    const categoryNames = categories?.map((c) => c.name) ?? [];
    const categoryByName = new Map(
      (categories ?? []).map((c) => [c.name.toLowerCase(), c.id])
    );

    // Call OpenAI Vision API
    const openaiRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          temperature: 0,
          max_tokens: 2000,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Extract all line items from this receipt image. For each item return:
- name: the item description
- amount: the dollar amount (positive number)

Also extract: merchant name, date, subtotal, tax, total.

Then categorize each line item into one of these categories: ${categoryNames.join(", ")}.

Return JSON: {
  "merchant": "string",
  "date": "string",
  "subtotal": number,
  "tax": number,
  "total": number,
  "line_items": [{ "name": "string", "amount": number, "category": "exact category name", "confidence": 0.0-1.0 }]
}

Use the exact category names provided. Return ONLY valid JSON.`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mediaType};base64,${base64}`,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("OpenAI error:", errText);

      await adminClient
        .from("receipt_scans")
        .update({
          status: "failed",
          extracted_data: { error: `OpenAI API error: ${openaiRes.status}` },
        })
        .eq("id", receipt_scan_id);

      return new Response(
        JSON.stringify({ receipt_scan_id, status: "failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiData = await openaiRes.json();
    const content = openaiData.choices?.[0]?.message?.content;

    if (!content) {
      await adminClient
        .from("receipt_scans")
        .update({
          status: "failed",
          extracted_data: { error: "No response from OpenAI" },
        })
        .eq("id", receipt_scan_id);

      return new Response(
        JSON.stringify({ receipt_scan_id, status: "failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(content);

    // Map category names to IDs
    const lineItems = (parsed.line_items ?? []).map(
      (item: {
        name: string;
        amount: number;
        category: string;
        confidence: number;
      }) => ({
        name: item.name,
        amount: item.amount,
        category: item.category,
        category_id: categoryByName.get(item.category.toLowerCase()) ?? null,
        confidence: item.confidence,
      })
    );

    // Update receipt scan with results
    await adminClient
      .from("receipt_scans")
      .update({
        status: "completed",
        extracted_data: {
          merchant: parsed.merchant ?? null,
          date: parsed.date ?? null,
          subtotal: parsed.subtotal ?? null,
          tax: parsed.tax ?? null,
          total: parsed.total ?? null,
        },
        line_items: lineItems,
      })
      .eq("id", receipt_scan_id);

    return new Response(
      JSON.stringify({ receipt_scan_id, status: "completed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("process-receipt error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
