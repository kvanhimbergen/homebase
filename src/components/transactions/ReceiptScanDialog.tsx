import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Camera, Upload, AlertCircle, RefreshCw } from "lucide-react";
import { useUploadAndProcessReceipt, useReceiptScan } from "@/hooks/useReceipts";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";
import type { ReceiptLineItem, ReceiptExtractedData } from "@/services/receipts";

interface ReceiptScanDialogProps {
  transaction: Tables<"transactions">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSplitWithLines: (lines: { name: string; amount: string; categoryId: string }[]) => void;
}

export function ReceiptScanDialog({
  transaction,
  open,
  onOpenChange,
  onSplitWithLines,
}: ReceiptScanDialogProps) {
  const [scanId, setScanId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useUploadAndProcessReceipt();
  const { data: scan } = useReceiptScan(scanId);

  const status = scan?.status ?? (uploadMutation.isPending ? "uploading" : "idle");
  const extractedData = (scan?.extracted_data ?? {}) as ReceiptExtractedData;
  const lineItems = ((scan?.line_items ?? []) as unknown) as ReceiptLineItem[];

  const handleFile = useCallback(
    async (file: File) => {
      try {
        const id = await uploadMutation.mutateAsync(file);
        setScanId(id);
      } catch {
        // Error is shown via the mutation state
      }
    },
    [uploadMutation]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleRetry() {
    setScanId(null);
    uploadMutation.reset();
  }

  function handleSplit() {
    const lines = lineItems.map((item) => ({
      name: item.name,
      amount: String(item.amount),
      categoryId: item.category_id ?? "",
    }));
    onOpenChange(false);
    onSplitWithLines(lines);
  }

  const lineItemsTotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const transactionTotal = Math.abs(transaction.amount);
  const difference = transactionTotal - lineItemsTotal;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setScanId(null);
          uploadMutation.reset();
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan Receipt
          </DialogTitle>
        </DialogHeader>

        {/* Upload state */}
        {(status === "idle" || status === "uploading") && !uploadMutation.isError && (
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25",
              uploadMutation.isPending && "pointer-events-none opacity-60"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium mb-1">
              {uploadMutation.isPending
                ? "Uploading..."
                : "Drop a receipt image here"}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              JPG, PNG, or PDF up to 10MB
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
            >
              Choose File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>
        )}

        {/* Upload error */}
        {uploadMutation.isError && (
          <div className="text-center py-6 space-y-3">
            <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
            <p className="text-sm text-destructive">
              Failed to upload receipt. Please try again.
            </p>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="h-4 w-4 mr-1" /> Retry
            </Button>
          </div>
        )}

        {/* Processing state */}
        {(status === "pending" || status === "processing") && (
          <div className="space-y-4 py-4">
            <div className="text-center space-y-2">
              <div className="h-8 w-8 mx-auto border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium">Scanning receipt...</p>
              <p className="text-xs text-muted-foreground">
                Extracting line items and categories
              </p>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-1/2 mx-auto" />
              <Skeleton className="h-4 w-2/3 mx-auto" />
            </div>
          </div>
        )}

        {/* Failed state */}
        {status === "failed" && (
          <div className="text-center py-6 space-y-3">
            <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
            <p className="text-sm text-destructive">
              {extractedData.error ?? "Failed to process receipt"}
            </p>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="h-4 w-4 mr-1" /> Try Again
            </Button>
          </div>
        )}

        {/* Results state */}
        {status === "completed" && lineItems.length > 0 && (
          <div className="space-y-4">
            {/* Header info */}
            {(extractedData.merchant || extractedData.date) && (
              <div className="flex items-center justify-between text-sm">
                {extractedData.merchant && (
                  <span className="font-medium">{extractedData.merchant}</span>
                )}
                {extractedData.date && (
                  <span className="text-muted-foreground">
                    {extractedData.date}
                  </span>
                )}
              </div>
            )}

            {/* Line items table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-3 py-2 font-medium">Item</th>
                    <th className="text-left px-3 py-2 font-medium">Category</th>
                    <th className="text-right px-3 py-2 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2">{item.name}</td>
                      <td className="px-3 py-2">
                        <Badge variant="secondary" className="text-xs">
                          {item.category}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals comparison */}
            <div className="flex items-center justify-between text-sm">
              <span>
                Receipt total:{" "}
                <strong>{formatCurrency(lineItemsTotal)}</strong>
              </span>
              <span
                className={cn(
                  "font-medium",
                  Math.abs(difference) < 0.01
                    ? "text-income"
                    : "text-expense"
                )}
              >
                {Math.abs(difference) < 0.01
                  ? "Balanced"
                  : `Difference: ${formatCurrency(Math.abs(difference))}`}
              </span>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSplit}>Split Transaction</Button>
            </div>
          </div>
        )}

        {/* Completed but no items */}
        {status === "completed" && lineItems.length === 0 && (
          <div className="text-center py-6 space-y-3">
            <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No line items could be extracted from this receipt.
            </p>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="h-4 w-4 mr-1" /> Try Again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
