import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  getDocuments,
  getDocumentCategories,
  getDocumentVersions,
  createDocument,
  updateDocument,
  deleteDocument,
  uploadDocumentFile,
  toggleFavorite,
  uploadNewVersion,
} from "@/services/documents";
import type { DocumentFilterOptions } from "@/services/documents";
import type { Tables, UpdateTables, Json } from "@/types/database";
import { useHousehold } from "./useHousehold";
import { useAuth } from "./useAuth";

export function useDocumentCategories() {
  const { currentHouseholdId } = useHousehold();

  return useQuery({
    queryKey: ["document-categories", currentHouseholdId],
    queryFn: () => getDocumentCategories(currentHouseholdId!),
    enabled: !!currentHouseholdId,
  });
}

export interface CategoryTreeNode extends Tables<"document_categories"> {
  children: Tables<"document_categories">[];
}

export function useDocumentCategoryTree() {
  const { data: categories } = useDocumentCategories();

  return useMemo(() => {
    if (!categories) return [];

    const parents = categories.filter((c) => !c.parent_id);
    return parents.map((parent) => ({
      ...parent,
      children: categories
        .filter((c) => c.parent_id === parent.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    })) as CategoryTreeNode[];
  }, [categories]);
}

export function useDocuments(filters?: DocumentFilterOptions) {
  const { currentHouseholdId } = useHousehold();

  return useQuery({
    queryKey: ["documents", currentHouseholdId, filters],
    queryFn: () => getDocuments(currentHouseholdId!, filters),
    enabled: !!currentHouseholdId,
  });
}

export function useDocumentVersions(versionGroupId: string | null) {
  return useQuery({
    queryKey: ["document-versions", versionGroupId],
    queryFn: () => getDocumentVersions(versionGroupId!),
    enabled: !!versionGroupId,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  const { currentHouseholdId } = useHousehold();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      file,
      name,
      tags,
      expiresAt,
      categoryId,
      memberId,
      documentYear,
      metadata,
      notes,
    }: {
      file: File;
      name: string;
      tags?: string[];
      expiresAt?: string;
      categoryId?: string;
      memberId?: string;
      documentYear?: number;
      metadata?: Json;
      notes?: string;
    }) => {
      const storagePath = await uploadDocumentFile(currentHouseholdId!, file);

      return createDocument({
        household_id: currentHouseholdId!,
        name,
        storage_path: storagePath,
        file_type: file.type,
        file_size: file.size,
        tags: tags ?? [],
        expires_at: expiresAt ?? null,
        uploaded_by: user!.id,
        category_id: categoryId ?? null,
        member_id: memberId ?? null,
        document_year: documentYear ?? null,
        metadata: metadata ?? {},
        notes: notes ?? null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateTables<"documents">;
    }) => updateDocument(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      isFavorite,
    }: {
      id: string;
      isFavorite: boolean;
    }) => toggleFavorite(id, isFavorite),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useUploadNewVersion() {
  const queryClient = useQueryClient();
  const { currentHouseholdId } = useHousehold();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({
      existingDoc,
      file,
    }: {
      existingDoc: Tables<"documents">;
      file: File;
    }) => uploadNewVersion(existingDoc, file, user!.id, currentHouseholdId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["document-versions"] });
    },
  });
}
