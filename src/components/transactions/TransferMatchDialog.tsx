import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useFindTransferMatches,
  useLinkTransferPair,
  type TransferMatch,
} from "@/hooks/useTransactions";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";
import { toast } from "sonner";

export function TransferMatchDialog({
  transaction,
  open,
  onOpenChange,
}: {
  transaction: Tables<"transactions">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: matches, isLoading } = useFindTransferMatches(
    open ? transaction.id : null
  );
  const linkTransfer = useLinkTransferPair();

  async function handleSelect(match: TransferMatch) {
    try {
      await linkTransfer.mutateAsync({
        txnIdA: transaction.id,
        txnIdB: match.id,
      });
      toast.success("Marked as transfer pair");
      onOpenChange(false);
    } catch {
      toast.error("Failed to link transfer pair");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Find Transfer Match</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Matching transaction for{" "}
            <strong className="text-foreground">
              {transaction.merchant_name ?? transaction.name}
            </strong>{" "}
            &middot; {formatDate(transaction.date)} &middot;{" "}
            <span
              className={cn(
                "font-medium",
                transaction.amount < 0 ? "text-income" : ""
              )}
            >
              {transaction.amount < 0 ? "+" : "-"}
              {formatCurrency(Math.abs(transaction.amount))}
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-1">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20 ml-auto" />
                </div>
              ))
            ) : !matches || matches.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No matching transactions found within 7 days.
              </div>
            ) : (
              matches.map((match) => (
                <button
                  key={match.id}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent text-left text-sm transition-colors disabled:opacity-50"
                  onClick={() => handleSelect(match)}
                  disabled={linkTransfer.isPending}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {match.merchant_name ?? match.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(match.date)}
                    </div>
                  </div>
                  {match.accounts && (
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {match.accounts.name}
                    </Badge>
                  )}
                  <span
                    className={cn(
                      "font-medium tabular-nums shrink-0",
                      match.amount < 0 ? "text-income" : ""
                    )}
                  >
                    {match.amount < 0 ? "+" : "-"}
                    {formatCurrency(Math.abs(match.amount))}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
