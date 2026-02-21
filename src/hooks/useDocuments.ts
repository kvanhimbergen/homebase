import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  uploadDocumentFile,
} from "@/services/documents";
import type { UpdateTables } from "@/types/database";
import { useHousehold } from "./useHousehold";
import { useAuth } from "./useAuth";

export function useDocuments(search?: string) {
  const { currentHouseholdId } = useHousehold();

  return useQuery({
    queryKey: ["documents", currentHouseholdId, search],
    queryFn: () => getDocuments(currentHouseholdId!, search),
    enabled: !!currentHouseholdId,
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
    }: {
      file: File;
      name: string;
      tags: string[];
      expiresAt?: string;
    }) => {
      const storagePath = await uploadDocumentFile(currentHouseholdId!, file);

      return createDocument({
        household_id: currentHouseholdId!,
        name,
        storage_path: storagePath,
        file_type: file.type,
        file_size: file.size,
        tags,
        expires_at: expiresAt ?? null,
        uploaded_by: user!.id,
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
    mutationFn: ({ id, data }: { id: string; data: UpdateTables<"documents"> }) =>
      updateDocument(id, data),
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
