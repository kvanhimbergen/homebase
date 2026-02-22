import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useCreateTransaction, useUpdateTransaction } from "@/hooks/useTransactions";
import { useCategoryTree } from "@/hooks/useCategories";
import { useHousehold } from "@/hooks/useHousehold";
import { formatCurrency } from "@/lib/formatters";
import type { Tables } from "@/types/database";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SplitLine {
  name: string;
  amount: string;
  categoryId: string;
}

export function SplitTransactionDialog({
  transaction,
  open,
  onOpenChange,
  initialLines,
}: {
  transaction: Tables<"transactions">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialLines?: SplitLine[];
}) {
  const [lines, setLines] = useState<SplitLine[]>(
    initialLines && initialLines.length > 0
      ? initialLines
      : [
          { name: transaction.name, amount: String(Math.abs(transaction.amount)), categoryId: "" },
          { name: "", amount: "", categoryId: "" },
        ]
  );
  const [saving, setSaving] = useState(false);

  const { currentHouseholdId } = useHousehold();
  const categoryTree = useCategoryTree();
  const createTxn = useCreateTransaction();
  const updateTxn = useUpdateTransaction();

  const totalAmount = Math.abs(transaction.amount);
  const splitTotal = lines.reduce(
    (sum, l) => sum + (parseFloat(l.amount) || 0),
    0
  );
  const remaining = totalAmount - splitTotal;
  const isBalanced = Math.abs(remaining) < 0.01;

  function addLine() {
    setLines((prev) => [...prev, { name: "", amount: "", categoryId: "" }]);
  }

  function removeLine(index: number) {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLine(index: number, field: keyof SplitLine, value: string) {
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [field]: value } : l))
    );
  }

  async function handleSplit() {
    if (!isBalanced || !currentHouseholdId) return;
    setSaving(true);

    try {
      // Mark parent as split
      await updateTxn.mutateAsync({
        id: transaction.id,
        data: { is_split: true },
      });

      // Create child transactions
      const sign = transaction.amount >= 0 ? 1 : -1;
      for (const line of lines) {
        const amt = parseFloat(line.amount);
        if (isNaN(amt) || amt === 0) continue;

        await createTxn.mutateAsync({
          household_id: currentHouseholdId,
          name: line.name || transaction.name,
          amount: amt * sign,
          date: transaction.date,
          category_id: line.categoryId || null,
          account_id: transaction.account_id,
          source: transaction.source,
          parent_transaction_id: transaction.id,
          is_split: false,
        });
      }

      toast.success("Transaction split successfully");
      onOpenChange(false);
    } catch {
      toast.error("Failed to split transaction");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Split Transaction</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span>Original: <strong>{formatCurrency(totalAmount)}</strong></span>
            <span
              className={cn(
                "font-medium",
                isBalanced ? "text-income" : "text-expense"
              )}
            >
              Remaining: {formatCurrency(Math.abs(remaining))}
            </span>
          </div>

          <div className="space-y-3">
            {lines.map((line, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={line.name}
                    onChange={(e) => updateLine(i, "name", e.target.value)}
                    placeholder="Item name"
                  />
                </div>
                <div className="w-24 space-y-1">
                  <Label className="text-xs">Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={line.amount}
                    onChange={(e) => updateLine(i, "amount", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="w-36 space-y-1">
                  <Label className="text-xs">Category</Label>
                  <Select
                    value={line.categoryId}
                    onValueChange={(v) => updateLine(i, "categoryId", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryTree.map(({ parent, children }) => (
                        <SelectGroup key={parent.id}>
                          <SelectItem value={parent.id}>{parent.name}</SelectItem>
                          {children.map((c) => (
                            <SelectItem key={c.id} value={c.id} className="pl-6">
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => removeLine(i)}
                  disabled={lines.length <= 2}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={addLine}>
            <Plus className="h-4 w-4 mr-1" /> Add Line
          </Button>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSplit}
              disabled={!isBalanced || saving}
            >
              {saving ? "Splitting..." : "Split Transaction"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
