import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  uploadReceiptImage,
  createReceiptScan,
  getReceiptScan,
  processReceipt,
} from "@/services/receipts";
import { useHousehold } from "./useHousehold";

export function useReceiptScan(id: string | null) {
  return useQuery({
    queryKey: ["receipt-scan", id],
    queryFn: () => getReceiptScan(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "pending" || status === "processing") return 2000;
      return false;
    },
  });
}

export function useUploadAndProcessReceipt() {
  const { currentHouseholdId } = useHousehold();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!currentHouseholdId) throw new Error("No household selected");

      // 1. Upload file to storage
      const storagePath = await uploadReceiptImage(currentHouseholdId, file);

      // 2. Create receipt_scans row
      const scan = await createReceiptScan({
        household_id: currentHouseholdId,
        storage_path: storagePath,
        status: "pending",
      });

      // 3. Call edge function (fire-and-forget — we poll via useReceiptScan)
      processReceipt(scan.id, currentHouseholdId).catch(() => {
        // Error is captured in the receipt_scans row status
        queryClient.invalidateQueries({ queryKey: ["receipt-scan", scan.id] });
      });

      return scan.id;
    },
  });
}
