import { supabase } from "@/lib/supabase";
import type { Tables, InsertTables, UpdateTables } from "@/types/database";

export interface DocumentFilterOptions {
  search?: string;
  categoryId?: string;
  memberId?: string;
  favoritesOnly?: boolean;
  expiringSoon?: boolean;
}

export type DocumentWithCategory = Tables<"documents"> & {
  document_categories: Tables<"document_categories"> | null;
};

export async function getDocumentCategories(householdId: string) {
  const { data, error } = await supabase
    .from("document_categories")
    .select("*")
    .eq("household_id", householdId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data as Tables<"document_categories">[];
}

export async function getDocuments(
  householdId: string,
  filters?: DocumentFilterOptions
) {
  let query = supabase
    .from("documents")
    .select("*, document_categories(*)")
    .eq("household_id", householdId)
    .eq("is_latest_version", true)
    .order("created_at", { ascending: false });

  if (filters?.search) {
    query = query.ilike("name", `%${filters.search}%`);
  }
  if (filters?.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }
  if (filters?.memberId) {
    query = query.eq("member_id", filters.memberId);
  }
  if (filters?.favoritesOnly) {
    query = query.eq("is_favorite", true);
  }
  if (filters?.expiringSoon) {
    const now = new Date().toISOString();
    const thirtyDays = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ).toISOString();
    query = query.not("expires_at", "is", null).gte("expires_at", now).lte("expires_at", thirtyDays);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as DocumentWithCategory[];
}

export async function getDocumentVersions(versionGroupId: string) {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("version_group_id", versionGroupId)
    .order("version", { ascending: false });

  if (error) throw error;
  return data as Tables<"documents">[];
}

export async function createDocument(data: InsertTables<"documents">) {
  const { data: result, error } = await supabase
    .from("documents")
    .insert(data)
    .select("*, document_categories(*)")
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
    .select("*, document_categories(*)")
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

export async function toggleFavorite(id: string, isFavorite: boolean) {
  const { data, error } = await supabase
    .from("documents")
    .update({ is_favorite: isFavorite })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function uploadNewVersion(
  existingDoc: Tables<"documents">,
  file: File,
  userId: string,
  householdId: string
) {
  // Mark old version as not latest
  await supabase
    .from("documents")
    .update({ is_latest_version: false })
    .eq("id", existingDoc.id);

  // Upload new file
  const storagePath = await uploadDocumentFile(householdId, file);

  // Create new version row
  const { data, error } = await supabase
    .from("documents")
    .insert({
      household_id: existingDoc.household_id,
      name: existingDoc.name,
      storage_path: storagePath,
      file_type: file.type,
      file_size: file.size,
      tags: existingDoc.tags,
      expires_at: existingDoc.expires_at,
      uploaded_by: userId,
      category_id: existingDoc.category_id,
      member_id: existingDoc.member_id,
      is_favorite: existingDoc.is_favorite,
      version: existingDoc.version + 1,
      version_group_id: existingDoc.version_group_id,
      is_latest_version: true,
      document_year: existingDoc.document_year,
      metadata: existingDoc.metadata,
      notes: existingDoc.notes,
    })
    .select("*, document_categories(*)")
    .single();

  if (error) throw error;
  return data;
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
