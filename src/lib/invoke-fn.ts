import { supabase } from "@/lib/supabase";

export async function invokeFn<T>(
  fnName: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fnName, {
    body,
  });

  if (error) {
    throw new Error(error.message || `${fnName} failed`);
  }

  return data as T;
}
