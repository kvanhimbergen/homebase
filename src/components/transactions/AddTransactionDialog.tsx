import { useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useCreateTransaction } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useAccounts } from "@/hooks/useAccounts";
import { useHousehold } from "@/hooks/useHousehold";
import { toast } from "sonner";

export function AddTransactionDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [notes, setNotes] = useState("");
  const [isExpense, setIsExpense] = useState(true);

  const { currentHouseholdId } = useHousehold();
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();
  const createTxn = useCreateTransaction();

  function reset() {
    setName("");
    setAmount("");
    setDate(format(new Date(), "yyyy-MM-dd"));
    setCategoryId("");
    setAccountId("");
    setNotes("");
    setIsExpense(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !amount || !currentHouseholdId) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return;

    try {
      await createTxn.mutateAsync({
        household_id: currentHouseholdId,
        name,
        amount: isExpense ? numAmount : -numAmount,
        date,
        category_id: categoryId || null,
        account_id: accountId || null,
        notes: notes || null,
        source: "manual",
      });
      toast.success("Transaction added");
      reset();
      setOpen(false);
    } catch {
      toast.error("Failed to add transaction");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Transaction
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={isExpense ? "default" : "outline"}
              size="sm"
              onClick={() => setIsExpense(true)}
            >
              Expense
            </Button>
            <Button
              type="button"
              variant={!isExpense ? "default" : "outline"}
              size="sm"
              onClick={() => setIsExpense(false)}
            >
              Income
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="txn-name">Description</Label>
            <Input
              id="txn-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grocery store"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="txn-amount">Amount</Label>
              <Input
                id="txn-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="txn-date">Date</Label>
              <Input
                id="txn-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts?.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="txn-notes">Notes</Label>
            <Textarea
              id="txn-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createTxn.isPending}>
              {createTxn.isPending ? "Adding..." : "Add Transaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
