import { supabase } from "@/lib/supabase";
import type { Tables, InsertTables, UpdateTables } from "@/types/database";

export async function getDocuments(householdId: string, search?: string) {
  let query = supabase
    .from("documents")
    .select("*")
    .eq("household_id", householdId)
    .order("created_at", { ascending: false });

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Tables<"documents">[];
}

export async function createDocument(data: InsertTables<"documents">) {
  const { data: result, error } = await supabase
    .from("documents")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updateDocument(
  id: string,
  data: UpdateTables<"documents">
) {
  const { data: result, error } = await supabase
    .from("documents")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function deleteDocument(id: string) {
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadDocumentFile(
  householdId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `documents/${householdId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("household-files")
    .upload(path, file);

  if (error) throw error;
  return path;
}

export async function getDocumentUrl(path: string): Promise<string> {
  const { data } = await supabase.storage
    .from("household-files")
    .createSignedUrl(path, 3600);

  return data?.signedUrl ?? "";
}

export const DOCUMENT_TAGS = [
  "Insurance",
  "Medical",
  "Warranty",
  "Legal",
  "Tax",
  "Home",
  "Auto",
  "School",
  "Financial",
  "Other",
] as const;
