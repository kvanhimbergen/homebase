import { useState, useEffect, useCallback } from "react";
import { format, subMonths } from "date-fns";
import {
  Search,
  SlidersHorizontal,
  Trash2,
  Scissors,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AddTransactionDialog } from "./AddTransactionDialog";
import { CSVImportDialog } from "./CSVImportDialog";
import { SplitTransactionDialog } from "./SplitTransactionDialog";
import {
  useTransactions,
  useUpdateTransaction,
  useDeleteTransactions,
} from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useAccounts } from "@/hooks/useAccounts";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";
import { toast } from "sonner";

const PAGE_SIZE = 50;

export function Component() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [startDate, setStartDate] = useState(
    format(subMonths(new Date(), 3), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [splitTxn, setSplitTxn] = useState<Tables<"transactions"> | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: result, isLoading } = useTransactions({
    search: debouncedSearch || undefined,
    categoryId: categoryFilter || undefined,
    accountId: accountFilter || undefined,
    startDate,
    endDate,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();
  const updateTxn = useUpdateTransaction();
  const deleteTxns = useDeleteTransactions();

  const transactions = result?.data ?? [];
  const totalCount = result?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selected.size === transactions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(transactions.map((t) => t.id)));
    }
  }, [selected.size, transactions]);

  async function handleBulkCategory(categoryId: string) {
    const ids = Array.from(selected);
    try {
      await Promise.all(
        ids.map((id) =>
          updateTxn.mutateAsync({ id, data: { category_id: categoryId } })
        )
      );
      toast.success(`Updated ${ids.length} transactions`);
      setSelected(new Set());
    } catch {
      toast.error("Failed to update transactions");
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selected);
    try {
      await deleteTxns.mutateAsync(ids);
      toast.success(`Deleted ${ids.length} transactions`);
      setSelected(new Set());
    } catch {
      toast.error("Failed to delete transactions");
    }
  }

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        document
          .querySelector<HTMLButtonElement>("[data-add-transaction]")
          ?.click();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <div className="flex items-center gap-2">
          <CSVImportDialog />
          <div data-add-transaction>
            <AddTransactionDialog />
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t">
              <div className="w-44">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All categories</SelectItem>
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-44">
                <Select value={accountFilter} onValueChange={setAccountFilter}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="All accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All accounts</SelectItem>
                    {accounts?.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-36 h-9 text-sm"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-36 h-9 text-sm"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCategoryFilter("");
                  setAccountFilter("");
                  setStartDate(format(subMonths(new Date(), 3), "yyyy-MM-dd"));
                  setEndDate(format(new Date(), "yyyy-MM-dd"));
                }}
              >
                <X className="h-3 w-3 mr-1" /> Clear
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selected.size} selected
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                Set Category
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1">
              {categories?.map((c) => (
                <button
                  key={c.id}
                  className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-accent"
                  onClick={() => handleBulkCategory(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </PopoverContent>
          </Popover>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
            <Trash2 className="h-3 w-3 mr-1" /> Delete
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      <Card>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      transactions.length > 0 &&
                      selected.size === transactions.length
                    }
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <p className="text-sm text-muted-foreground">
                      No transactions found.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((txn) => (
                  <TableRow key={txn.id} className="group">
                    <TableCell>
                      <Checkbox
                        checked={selected.has(txn.id)}
                        onCheckedChange={() => toggleSelect(txn.id)}
                      />
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatDate(txn.date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate max-w-[200px]">
                          {txn.merchant_name ?? txn.name}
                        </span>
                        {txn.ai_category_confidence != null &&
                          txn.ai_category_confidence > 0 && (
                            <span className="text-xs" title="AI classified">
                              ✨
                            </span>
                          )}
                        {txn.source !== "manual" && txn.source !== "plaid" && (
                          <Badge variant="outline" className="text-[10px] h-4">
                            {txn.source}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <InlineCategorySelect
                        transaction={txn}
                        categories={categories ?? []}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {txn.accounts?.name ?? "\u2014"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-sm font-medium text-right tabular-nums",
                        txn.amount < 0 ? "text-income" : ""
                      )}
                    >
                      {txn.amount < 0 ? "+" : "-"}
                      {formatCurrency(Math.abs(txn.amount))}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100"
                        onClick={() => setSplitTxn(txn)}
                        title="Split transaction"
                      >
                        <Scissors className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}–
              {Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {splitTxn && (
        <SplitTransactionDialog
          transaction={splitTxn}
          open={!!splitTxn}
          onOpenChange={(open) => !open && setSplitTxn(null)}
        />
      )}
    </div>
  );
}

function InlineCategorySelect({
  transaction,
  categories,
}: {
  transaction: Tables<"transactions"> & { categories: Tables<"categories"> | null };
  categories: Tables<"categories">[];
}) {
  const updateTxn = useUpdateTransaction();

  return (
    <Select
      value={transaction.category_id ?? ""}
      onValueChange={async (value) => {
        try {
          await updateTxn.mutateAsync({
            id: transaction.id,
            data: { category_id: value || null },
          });
        } catch {
          toast.error("Failed to update category");
        }
      }}
    >
      <SelectTrigger className="h-7 w-36 text-xs border-none shadow-none hover:bg-muted">
        <SelectValue placeholder="Uncategorized">
          {transaction.categories ? (
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: transaction.categories.color ?? "#94a3b8",
                }}
              />
              <span className="truncate">{transaction.categories.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Uncategorized</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {categories.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: c.color ?? "#94a3b8" }}
              />
              {c.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
