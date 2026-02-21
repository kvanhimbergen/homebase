import { supabase } from "@/lib/supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export async function invokeFn<T>(
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
