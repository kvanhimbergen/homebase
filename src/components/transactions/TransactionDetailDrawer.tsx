import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Scissors,
  Trash2,
  Unlink,
  ArrowLeftRight,
  Camera,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";

type TransactionWithRelations = Tables<"transactions"> & {
  categories: Tables<"categories"> | null;
  accounts: Tables<"accounts"> | null;
};

interface TransactionDetailDrawerProps {
  transaction: TransactionWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFindMatch: (txn: TransactionWithRelations) => void;
  onScanReceipt: (txn: TransactionWithRelations) => void;
  onSplit: (txn: TransactionWithRelations) => void;
  onDelete: (txnId: string) => void;
  onUnlink: (txnId: string) => void;
}

export function TransactionDetailDrawer({
  transaction,
  open,
  onOpenChange,
  onFindMatch,
  onScanReceipt,
  onSplit,
  onDelete,
  onUnlink,
}: TransactionDetailDrawerProps) {
  if (!transaction) return null;

  const isIncome = transaction.amount < 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">
            {transaction.merchant_name ?? transaction.name}
          </SheetTitle>
          <SheetDescription>{formatDate(transaction.date)}</SheetDescription>
        </SheetHeader>

        <div className="px-4">
          {/* Amount */}
          <p
            className={cn(
              "text-3xl font-bold tabular-nums",
              isIncome ? "text-income" : "text-foreground"
            )}
          >
            {isIncome ? "+" : "-"}
            {formatCurrency(Math.abs(transaction.amount))}
          </p>
        </div>

        <Separator className="mx-4 w-auto" />

        {/* Detail rows */}
        <div className="px-4 space-y-4">
          <DetailRow label="Category">
            {transaction.categories ? (
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      transaction.categories.color ?? "#94a3b8",
                  }}
                />
                <span>{transaction.categories.name}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">Uncategorized</span>
            )}
          </DetailRow>

          <DetailRow label="Account">
            {transaction.accounts?.name ?? (
              <span className="text-muted-foreground">—</span>
            )}
          </DetailRow>

          <DetailRow label="Date">{formatDate(transaction.date)}</DetailRow>

          <DetailRow label="Source">
            <Badge variant="secondary" className="text-xs">
              {transaction.source}
            </Badge>
          </DetailRow>

          {transaction.classified_by && (
            <DetailRow label="Classified by">
              <div className="flex items-center gap-2">
                <span className="capitalize">{transaction.classified_by}</span>
                {transaction.ai_category_confidence != null &&
                  transaction.ai_category_confidence > 0 && (
                    <Badge variant="outline" className="text-[10px] h-4">
                      {Math.round(transaction.ai_category_confidence * 100)}%
                      confidence
                    </Badge>
                  )}
              </div>
            </DetailRow>
          )}

          {transaction.check_number && (
            <DetailRow label="Check #">{transaction.check_number}</DetailRow>
          )}

          {transaction.notes && (
            <DetailRow label="Notes">{transaction.notes}</DetailRow>
          )}

          {transaction.is_transfer && (
            <DetailRow label="Transfer">
              <Badge
                variant="outline"
                className="border-blue-500/50 text-blue-600"
              >
                <ArrowLeftRight className="h-3 w-3 mr-1" />
                Linked transfer
              </Badge>
            </DetailRow>
          )}
        </div>

        <Separator className="mx-4 w-auto" />

        {/* Actions */}
        <div className="px-4 pb-4 space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => onFindMatch(transaction)}
          >
            <Search className="h-4 w-4 mr-2" />
            Find Transfer Match
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => onScanReceipt(transaction)}
          >
            <Camera className="h-4 w-4 mr-2" />
            Scan Receipt
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => onSplit(transaction)}
          >
            <Scissors className="h-4 w-4 mr-2" />
            Split Transaction
          </Button>
          {transaction.is_transfer && (
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => onUnlink(transaction.id)}
            >
              <Unlink className="h-4 w-4 mr-2" />
              Unlink Transfer
            </Button>
          )}
          <Button
            variant="destructive"
            className="w-full justify-start"
            onClick={() => onDelete(transaction.id)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Transaction
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <div className="text-sm text-right">{children}</div>
    </div>
  );
}
