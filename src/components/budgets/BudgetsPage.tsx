import { useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Plus, Trash2, PiggyBank } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBudgets, useCreateBudget, useDeleteBudget } from "@/hooks/useBudgets";
import { useCategories } from "@/hooks/useCategories";
import { useSpendingByCategory } from "@/hooks/useTransactions";
import { useHousehold } from "@/hooks/useHousehold";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function Component() {
  const now = new Date();
  const start = format(startOfMonth(now), "yyyy-MM-dd");
  const end = format(endOfMonth(now), "yyyy-MM-dd");

  const { data: budgets, isLoading } = useBudgets();
  const { data: spending } = useSpendingByCategory(start, end);
  const deleteBudget = useDeleteBudget();

  const budgetRows = (budgets ?? []).map((budget) => {
    const spent = Math.abs(
      spending?.find((s) => s.category_id === budget.category_id)?.total ?? 0
    );
    const pct = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
    const remaining = budget.amount - spent;

    return { ...budget, spent, pct, remaining };
  });

  const totalBudgeted = budgetRows.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgetRows.reduce((sum, b) => sum + b.spent, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Budgets</h1>
        <AddBudgetDialog />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Total Budgeted</p>
            <p className="text-2xl font-bold">{formatCurrency(totalBudgeted)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Total Spent</p>
            <p className="text-2xl font-bold text-expense">
              {formatCurrency(totalSpent)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Remaining</p>
            <p
              className={cn(
                "text-2xl font-bold",
                totalBudgeted - totalSpent >= 0 ? "text-income" : "text-expense"
              )}
            >
              {formatCurrency(totalBudgeted - totalSpent)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Progress List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {format(now, "MMMM yyyy")} Budget Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : budgetRows.length === 0 ? (
            <div className="text-center py-12">
              <PiggyBank className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                No budgets created yet.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Click "Add Budget" to set spending targets for your categories.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {budgetRows.map((row) => {
                const overBudget = row.spent > row.amount;
                return (
                  <div key={row.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {row.categories?.name ?? "Unknown"}
                        </span>
                        {overBudget && (
                          <span className="text-xs text-expense font-medium">
                            Over budget
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {formatCurrency(row.spent)} / {formatCurrency(row.amount)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={async () => {
                            try {
                              await deleteBudget.mutateAsync(row.id);
                              toast.success("Budget deleted");
                            } catch (err) {
                              toast.error(`Failed to delete budget: ${err instanceof Error ? err.message : err}`);
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <Progress
                      value={Math.min(row.pct, 100)}
                      className={cn(
                        "h-3",
                        overBudget
                          ? "[&>div]:bg-expense"
                          : row.pct > 75
                            ? "[&>div]:bg-yellow-500"
                            : "[&>div]:bg-income"
                      )}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatPercent(row.pct)} used</span>
                      <span
                        className={cn(
                          overBudget ? "text-expense" : "text-income"
                        )}
                      >
                        {overBudget ? "-" : ""}
                        {formatCurrency(Math.abs(row.remaining))} remaining
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget vs Actual Table */}
      {budgetRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Budget vs Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Budgeted</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                  <TableHead className="text-right">% Used</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgetRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.categories?.name ?? "Unknown"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(row.amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(row.spent)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        row.remaining >= 0 ? "text-income" : "text-expense"
                      )}
                    >
                      {row.remaining >= 0 ? "+" : ""}
                      {formatCurrency(row.remaining)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPercent(row.pct)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold border-t-2">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(totalBudgeted)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(totalSpent)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums",
                      totalBudgeted - totalSpent >= 0
                        ? "text-income"
                        : "text-expense"
                    )}
                  >
                    {totalBudgeted - totalSpent >= 0 ? "+" : ""}
                    {formatCurrency(totalBudgeted - totalSpent)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {totalBudgeted > 0
                      ? formatPercent((totalSpent / totalBudgeted) * 100)
                      : "0%"}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AddBudgetDialog() {
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");

  const { currentHouseholdId } = useHousehold();
  const { data: categories } = useCategories();
  const createBudget = useCreateBudget();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId || !amount || !currentHouseholdId) return;

    try {
      await createBudget.mutateAsync({
        household_id: currentHouseholdId,
        category_id: categoryId,
        amount: parseFloat(amount),
        start_date: format(startOfMonth(new Date()), "yyyy-MM-dd"),
      });
      toast.success("Budget created");
      setOpen(false);
      setCategoryId("");
      setAmount("");
    } catch (err) {
      toast.error(`Failed to create budget: ${err instanceof Error ? err.message : err}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Budget
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Budget</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label>Monthly Target</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 500.00"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createBudget.isPending}>
              Create Budget
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
