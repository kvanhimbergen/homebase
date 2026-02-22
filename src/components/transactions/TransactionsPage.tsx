import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { format, subMonths } from "date-fns";
import {
  Search,
  SlidersHorizontal,
  Trash2,
  Scissors,
  X,
  Sparkles,
  Loader2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronDown,
  ArrowLeftRight,
  Unlink,
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
import { QFXImportDialog } from "./QFXImportDialog";
import { SplitTransactionDialog } from "./SplitTransactionDialog";
import { TransferMatchDialog } from "./TransferMatchDialog";
import {
  useTransactions,
  useUpdateTransaction,
  useDeleteTransactions,
  useClassifyTransactions,
  useLinkTransferPair,
  useUnlinkTransferPair,
} from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useAccounts } from "@/hooks/useAccounts";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { TRANSACTION_SOURCES, type TransactionSource } from "@/lib/constants";
import type { SortField, SortDirection } from "@/services/transactions";
import type { Tables } from "@/types/database";
import { toast } from "sonner";

const PAGE_SIZE = 50;

export function Component() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const initialCategory = searchParams.get("categoryId");
  const [categoryFilter, setCategoryFilter] = useState<string[]>(
    initialCategory ? [initialCategory] : []
  );
  const [accountFilter, setAccountFilter] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(
    format(subMonths(new Date(), 3), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [sortBy, setSortBy] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const [classifiedByFilter, setClassifiedByFilter] = useState<string[]>([]);
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [splitTxn, setSplitTxn] = useState<Tables<"transactions"> | null>(null);
  const [matchTxn, setMatchTxn] = useState<Tables<"transactions"> | null>(null);
  const [checksOnly, setChecksOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(!!searchParams.get("categoryId"));

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset to first page when any filter or sort changes
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, categoryFilter, accountFilter, startDate, endDate, sortBy, sortDirection, sourceFilter, classifiedByFilter, minAmount, maxAmount, checksOnly]);

  const parsedMin = minAmount !== "" ? parseFloat(minAmount) : undefined;
  const parsedMax = maxAmount !== "" ? parseFloat(maxAmount) : undefined;

  const { data: result, isLoading } = useTransactions({
    search: debouncedSearch || undefined,
    categoryIds: categoryFilter.length > 0 ? categoryFilter : undefined,
    accountIds: accountFilter.length > 0 ? accountFilter : undefined,
    startDate,
    endDate,
    sortBy,
    sortDirection,
    sources: sourceFilter.length > 0 ? sourceFilter as TransactionSource[] : undefined,
    classifiedByList: classifiedByFilter.length > 0 ? classifiedByFilter as ("user" | "ai" | "plaid" | "none")[] : undefined,
    minAmount: parsedMin != null && !isNaN(parsedMin) ? parsedMin : undefined,
    maxAmount: parsedMax != null && !isNaN(parsedMax) ? parsedMax : undefined,
    hasCheckNumber: checksOnly || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();
  const updateTxn = useUpdateTransaction();
  const deleteTxns = useDeleteTransactions();
  const classifyTxns = useClassifyTransactions();
  const linkTransfer = useLinkTransferPair();
  const unlinkTransfer = useUnlinkTransferPair();

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
          updateTxn.mutateAsync({
            id,
            data: { category_id: categoryId, classified_by: "user" },
          })
        )
      );
      toast.success(`Updated ${ids.length} transactions`);
      setSelected(new Set());
    } catch {
      toast.error("Failed to update transactions");
    }
  }

  async function handleClassify() {
    try {
      const result = await classifyTxns.mutateAsync();
      if (result.classified === 0) {
        toast.info("No uncategorized transactions to classify.");
      } else {
        toast.success(
          `Classified ${result.classified} transaction(s).${result.skipped ? ` ${result.skipped} skipped.` : ""}${result.errors ? ` ${result.errors} error(s).` : ""}`
        );
      }
    } catch {
      toast.error("Failed to classify transactions");
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

  async function handleMarkAsTransfer() {
    const ids = Array.from(selected);
    if (ids.length !== 2) return;
    try {
      await linkTransfer.mutateAsync({ txnIdA: ids[0], txnIdB: ids[1] });
      toast.success("Marked as transfer pair");
      setSelected(new Set());
    } catch {
      toast.error("Failed to link transfer pair");
    }
  }

  async function handleUnlinkTransfer(txnId: string) {
    try {
      await unlinkTransfer.mutateAsync(txnId);
      toast.success("Transfer unlinked");
    } catch {
      toast.error("Failed to unlink transfer");
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleClassify}
            disabled={classifyTxns.isPending}
          >
            {classifyTxns.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1" />
            )}
            Classify
          </Button>
          <CSVImportDialog />
          <QFXImportDialog />
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-9 text-sm w-44 justify-between font-normal">
                    {categoryFilter.length === 0
                      ? "All categories"
                      : categoryFilter.length === 1
                        ? categories?.find((c) => c.id === categoryFilter[0])?.name ?? "1 category"
                        : `${categoryFilter.length} categories`}
                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-52 p-2" align="start">
                  <div className="max-h-60 overflow-y-auto space-y-0.5">
                    {categories?.map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={categoryFilter.includes(c.id)}
                          onCheckedChange={(checked) => {
                            setCategoryFilter((prev) =>
                              checked
                                ? [...prev, c.id]
                                : prev.filter((id) => id !== c.id)
                            );
                          }}
                        />
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: c.color ?? "#94a3b8" }}
                        />
                        <span className="truncate">{c.name}</span>
                      </label>
                    ))}
                  </div>
                  {categoryFilter.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-1"
                      onClick={() => setCategoryFilter([])}
                    >
                      Clear
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-9 text-sm w-44 justify-between font-normal">
                    {accountFilter.length === 0
                      ? "All accounts"
                      : accountFilter.length === 1
                        ? accounts?.find((a) => a.id === accountFilter[0])?.name ?? "1 account"
                        : `${accountFilter.length} accounts`}
                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-52 p-2" align="start">
                  <div className="max-h-60 overflow-y-auto space-y-0.5">
                    {accounts?.map((a) => (
                      <label
                        key={a.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={accountFilter.includes(a.id)}
                          onCheckedChange={(checked) => {
                            setAccountFilter((prev) =>
                              checked
                                ? [...prev, a.id]
                                : prev.filter((id) => id !== a.id)
                            );
                          }}
                        />
                        <span className="truncate">{a.name}</span>
                      </label>
                    ))}
                  </div>
                  {accountFilter.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-1"
                      onClick={() => setAccountFilter([])}
                    >
                      Clear
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-9 text-sm w-36 justify-between font-normal">
                    {sourceFilter.length === 0
                      ? "All sources"
                      : sourceFilter.length === 1
                        ? sourceFilter[0].charAt(0).toUpperCase() + sourceFilter[0].slice(1)
                        : `${sourceFilter.length} sources`}
                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-44 p-2" align="start">
                  <div className="space-y-0.5">
                    {TRANSACTION_SOURCES.map((s) => (
                      <label
                        key={s}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={sourceFilter.includes(s)}
                          onCheckedChange={(checked) => {
                            setSourceFilter((prev) =>
                              checked
                                ? [...prev, s]
                                : prev.filter((v) => v !== s)
                            );
                          }}
                        />
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </label>
                    ))}
                  </div>
                  {sourceFilter.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-1"
                      onClick={() => setSourceFilter([])}
                    >
                      Clear
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-9 text-sm w-44 justify-between font-normal">
                    {classifiedByFilter.length === 0
                      ? "All statuses"
                      : classifiedByFilter.length === 1
                        ? { ai: "AI classified", user: "User classified", plaid: "Plaid classified", none: "Uncategorized" }[classifiedByFilter[0]]
                        : `${classifiedByFilter.length} statuses`}
                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="start">
                  <div className="space-y-0.5">
                    {([
                      { value: "ai", label: "AI classified" },
                      { value: "user", label: "User classified" },
                      { value: "plaid", label: "Plaid classified" },
                      { value: "none", label: "Uncategorized" },
                    ] as const).map(({ value, label }) => (
                      <label
                        key={value}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={classifiedByFilter.includes(value)}
                          onCheckedChange={(checked) => {
                            setClassifiedByFilter((prev) =>
                              checked
                                ? [...prev, value]
                                : prev.filter((v) => v !== value)
                            );
                          }}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  {classifiedByFilter.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-1"
                      onClick={() => setClassifiedByFilter([])}
                    >
                      Clear
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
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
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  placeholder="Min $"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="w-24 h-9 text-sm"
                />
                <span className="text-sm text-muted-foreground">–</span>
                <Input
                  type="number"
                  placeholder="Max $"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="w-24 h-9 text-sm"
                />
              </div>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <Checkbox
                  checked={checksOnly}
                  onCheckedChange={(checked) => setChecksOnly(!!checked)}
                />
                Checks only
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCategoryFilter([]);
                  setAccountFilter([]);
                  setSourceFilter([]);
                  setClassifiedByFilter([]);
                  setMinAmount("");
                  setMaxAmount("");
                  setChecksOnly(false);
                  setStartDate(format(subMonths(new Date(), 3), "yyyy-MM-dd"));
                  setEndDate(format(new Date(), "yyyy-MM-dd"));
                  setSortBy("date");
                  setSortDirection("desc");
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
          {selected.size === 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const id = Array.from(selected)[0];
                const txn = transactions.find((t) => t.id === id);
                if (txn) setMatchTxn(txn);
              }}
            >
              <Search className="h-3 w-3 mr-1" /> Find Match
            </Button>
          )}
          {selected.size === 2 && (
            <Button variant="outline" size="sm" onClick={handleMarkAsTransfer}>
              <ArrowLeftRight className="h-3 w-3 mr-1" /> Mark as Transfer
            </Button>
          )}
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
                <TableHead>
                  <SortableHeader
                    label="Date"
                    field="date"
                    currentSort={sortBy}
                    currentDirection={sortDirection}
                    onSort={(field, dir) => { setSortBy(field); setSortDirection(dir); }}
                  />
                </TableHead>
                <TableHead>
                  <SortableHeader
                    label="Description"
                    field="name"
                    currentSort={sortBy}
                    currentDirection={sortDirection}
                    onSort={(field, dir) => { setSortBy(field); setSortDirection(dir); }}
                  />
                </TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">
                  <SortableHeader
                    label="Amount"
                    field="amount"
                    currentSort={sortBy}
                    currentDirection={sortDirection}
                    onSort={(field, dir) => { setSortBy(field); setSortDirection(dir); }}
                    className="justify-end"
                  />
                </TableHead>
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
                        {txn.classified_by === "ai" &&
                          txn.ai_category_confidence != null && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] h-4 gap-0.5",
                                txn.ai_category_confidence >= 0.8
                                  ? "border-green-500/50 text-green-600"
                                  : txn.ai_category_confidence >= 0.5
                                    ? "border-yellow-500/50 text-yellow-600"
                                    : "border-red-500/50 text-red-600"
                              )}
                              title={`AI confidence: ${Math.round(txn.ai_category_confidence * 100)}%`}
                            >
                              <Sparkles className="h-2.5 w-2.5" />
                              {Math.round(txn.ai_category_confidence * 100)}%
                            </Badge>
                          )}
                        {txn.is_transfer && (
                          <Badge variant="outline" className="text-[10px] h-4 border-blue-500/50 text-blue-600">
                            <ArrowLeftRight className="h-2.5 w-2.5 mr-0.5" />
                            Transfer
                          </Badge>
                        )}
                        {txn.check_number && (
                          <Badge variant="outline" className="text-[10px] h-4">
                            Check #{txn.check_number}
                          </Badge>
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
                      <div className="flex items-center">
                        {txn.is_transfer && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100"
                            onClick={() => handleUnlinkTransfer(txn.id)}
                            title="Unlink transfer"
                          >
                            <Unlink className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100"
                          onClick={() => setSplitTxn(txn)}
                          title="Split transaction"
                        >
                          <Scissors className="h-3 w-3" />
                        </Button>
                      </div>
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

      {matchTxn && (
        <TransferMatchDialog
          transaction={matchTxn}
          open={!!matchTxn}
          onOpenChange={(open) => {
            if (!open) {
              setMatchTxn(null);
              setSelected(new Set());
            }
          }}
        />
      )}
    </div>
  );
}

function SortableHeader({
  label,
  field,
  currentSort,
  currentDirection,
  onSort,
  className,
}: {
  label: string;
  field: SortField;
  currentSort: SortField;
  currentDirection: SortDirection;
  onSort: (field: SortField, direction: SortDirection) => void;
  className?: string;
}) {
  const isActive = currentSort === field;

  return (
    <button
      className={cn(
        "inline-flex items-center gap-1 hover:text-foreground transition-colors -my-1",
        isActive ? "text-foreground" : "text-muted-foreground",
        className
      )}
      onClick={() => {
        if (isActive) {
          onSort(field, currentDirection === "asc" ? "desc" : "asc");
        } else {
          onSort(field, field === "name" ? "asc" : "desc");
        }
      }}
    >
      {label}
      {isActive ? (
        currentDirection === "asc" ? (
          <ArrowUp className="h-3.5 w-3.5" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5" />
        )
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
      )}
    </button>
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
        const cleared = value === "__uncategorized__";
        try {
          await updateTxn.mutateAsync({
            id: transaction.id,
            data: {
              category_id: cleared ? null : value,
              classified_by: cleared ? null : "user",
              ai_category_confidence: cleared ? null : undefined,
            },
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
        <SelectItem value="__uncategorized__">
          <span className="text-muted-foreground">Uncategorized</span>
        </SelectItem>
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
