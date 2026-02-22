import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  format,
  parse,
  startOfMonth,
  endOfMonth,
  subMonths,
  eachMonthOfInterval,
} from "date-fns";
import { Download, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpendingDonut, SpendingLegend } from "@/components/charts/SpendingDonut";
import { CashFlowBar } from "@/components/charts/CashFlowBar";
import { CategoryTrends, type TrendData } from "@/components/charts/CategoryTrends";
import { useSpendingByCategory, useCashFlow } from "@/hooks/useTransactions";
import { useHousehold } from "@/hooks/useHousehold";
import { formatCurrency } from "@/lib/formatters";
import { supabase } from "@/lib/supabase";

export function Component() {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState(
    format(subMonths(new Date(), 5), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );

  // Current month for spending donut
  const currentStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const currentEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

  const { data: spending, isLoading: spendingLoading } = useSpendingByCategory(
    currentStart,
    currentEnd
  );
  const { data: cashFlow, isLoading: cashFlowLoading } = useCashFlow(
    currentStart,
    currentEnd
  );

  const totalSpent =
    spending?.reduce((sum, s) => sum + Math.abs(s.total), 0) ?? 0;

  // Drill-down + hover state
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [selectedParentName, setSelectedParentName] = useState<string | null>(null);
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(null);

  // Reset drill-down when date range changes
  const dateKey = `${currentStart}-${currentEnd}`;
  const [prevDateKey, setPrevDateKey] = useState(dateKey);
  if (dateKey !== prevDateKey) {
    setPrevDateKey(dateKey);
    setSelectedParentId(null);
    setSelectedParentName(null);
    setHoveredCategoryId(null);
  }

  function handleCategoryClick(categoryId: string, hasCategoryChildren: boolean) {
    if (hasCategoryChildren && !selectedParentId) {
      const parentItem = spending?.find((s) => s.category_id === categoryId);
      setSelectedParentId(categoryId);
      setSelectedParentName(parentItem?.category_name ?? null);
      setHoveredCategoryId(null);
    } else {
      navigate(`/transactions?categoryId=${categoryId}`);
    }
  }

  function handleCategoryBack() {
    setSelectedParentId(null);
    setSelectedParentName(null);
    setHoveredCategoryId(null);
  }

  function handleCashFlowBarClick(month: string, type: "income" | "expenses") {
    const parsed = parse(month, "MMM yy", new Date());
    const s = format(startOfMonth(parsed), "yyyy-MM-dd");
    const e = format(endOfMonth(parsed), "yyyy-MM-dd");
    navigate(`/transactions?amountType=${type}&startDate=${s}&endDate=${e}`);
  }

  // Monthly cash flow data for bar chart
  const { currentHouseholdId } = useHousehold();
  const months = useMemo(
    () =>
      eachMonthOfInterval({
        start: new Date(startDate),
        end: new Date(endDate),
      }),
    [startDate, endDate]
  );

  // We use individual month queries for the cash flow bar chart
  const monthlyQueries = months.map((month) => {
    const s = format(startOfMonth(month), "yyyy-MM-dd");
    const e = format(endOfMonth(month), "yyyy-MM-dd");
    return { month: format(month, "MMM yy"), start: s, end: e };
  });

  async function exportCSV() {
    if (!currentHouseholdId) return;

    const { data, error } = await supabase
      .from("transactions")
      .select("date, name, merchant_name, amount, categories(name), accounts(name)")
      .eq("household_id", currentHouseholdId)
      .eq("is_split", false)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });

    if (error || !data) return;

    const rows = data.map((t: Record<string, unknown>) => {
      const cat = t.categories as { name: string } | null;
      const acc = t.accounts as { name: string } | null;
      return [
        t.date,
        t.name,
        t.merchant_name ?? "",
        t.amount,
        cat?.name ?? "",
        acc?.name ?? "",
      ].join(",");
    });

    const csv =
      "Date,Description,Merchant,Amount,Category,Account\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `homebase-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">From</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-36 h-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">To</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-36 h-9 text-sm"
            />
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      <Tabs defaultValue="spending">
        <TabsList>
          <TabsTrigger value="spending">Spending</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
        </TabsList>

        <TabsContent value="spending" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Spending by Category — {format(new Date(), "MMMM yyyy")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {spendingLoading ? (
                  <Skeleton className="h-[280px] w-full" />
                ) : spending && spending.length > 0 ? (
                  <>
                    <SpendingDonut
                      data={spending}
                      total={totalSpent}
                      onCategoryClick={handleCategoryClick}
                      selectedParentId={selectedParentId}
                      selectedParentName={selectedParentName}
                      onBack={handleCategoryBack}
                      hoveredCategoryId={hoveredCategoryId}
                      onHoverCategory={setHoveredCategoryId}
                    />
                    <div className="mt-4">
                      <SpendingLegend
                        data={spending}
                        onCategoryClick={handleCategoryClick}
                        selectedParentId={selectedParentId}
                        hoveredCategoryId={hoveredCategoryId}
                        onHoverCategory={setHoveredCategoryId}
                      />
                    </div>
                  </>
                ) : (
                  <EmptyState />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {cashFlowLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div
                      className="flex justify-between items-center py-3 border-b cursor-pointer hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors"
                      onClick={() => navigate("/transactions?amountType=income")}
                    >
                      <span className="text-sm">Income</span>
                      <span className="text-sm font-semibold text-income tabular-nums">
                        {formatCurrency(cashFlow?.income ?? 0)}
                      </span>
                    </div>
                    <div
                      className="flex justify-between items-center py-3 border-b cursor-pointer hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors"
                      onClick={() => navigate("/transactions?amountType=expenses")}
                    >
                      <span className="text-sm">Expenses</span>
                      <span className="text-sm font-semibold text-expense tabular-nums">
                        {formatCurrency(cashFlow?.expenses ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-sm font-medium">Net</span>
                      <span
                        className={`text-lg font-bold tabular-nums ${
                          (cashFlow?.net ?? 0) >= 0
                            ? "text-income"
                            : "text-expense"
                        }`}
                      >
                        {formatCurrency(cashFlow?.net ?? 0)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cashflow" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cash Flow Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <CashFlowBarFetcher months={monthlyQueries} onBarClick={handleCashFlowBarClick} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Category Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryTrendsFetcher months={monthlyQueries} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Income Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {cashFlowLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Income breakdown will appear once you have income
                    transactions categorized.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CashFlowBarFetcher({
  months,
  onBarClick,
}: {
  months: { month: string; start: string; end: string }[];
  onBarClick?: (month: string, type: "income" | "expenses") => void;
}) {
  const { currentHouseholdId } = useHousehold();
  const [data, setData] = useState<
    { month: string; income: number; expenses: number }[]
  >([]);
  const [loaded, setLoaded] = useState(false);

  useMemo(() => {
    if (!currentHouseholdId || loaded) return;

    Promise.all(
      months.map(async (m) => {
        const { data: txns } = await supabase
          .from("transactions")
          .select("amount")
          .eq("household_id", currentHouseholdId)
          .eq("is_split", false)
          .gte("date", m.start)
          .lte("date", m.end);

        const income = (txns ?? [])
          .filter((t) => t.amount < 0)
          .reduce((s, t) => s + Math.abs(t.amount), 0);
        const expenses = (txns ?? [])
          .filter((t) => t.amount > 0)
          .reduce((s, t) => s + t.amount, 0);

        return { month: m.month, income, expenses };
      })
    ).then((result) => {
      setData(result);
      setLoaded(true);
    });
  }, [currentHouseholdId, months, loaded]);

  if (!loaded) return <Skeleton className="h-[300px] w-full" />;
  if (data.every((d) => d.income === 0 && d.expenses === 0))
    return <EmptyState />;

  return <CashFlowBar data={data} onBarClick={onBarClick} />;
}

function CategoryTrendsFetcher({
  months,
}: {
  months: { month: string; start: string; end: string }[];
}) {
  const { currentHouseholdId } = useHousehold();
  const [data, setData] = useState<TrendData[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useMemo(() => {
    if (!currentHouseholdId || loaded) return;

    Promise.all(
      months.map(async (m) => {
        const result = await supabase.rpc("spending_by_category", {
          p_household_id: currentHouseholdId,
          p_start: m.start,
          p_end: m.end,
        });

        const row: TrendData = { month: m.month };
        for (const s of result.data ?? []) {
          row[s.category_name] = Math.abs(s.total);
        }
        return { row, cats: (result.data ?? []).map((s) => s.category_name) };
      })
    ).then((results) => {
      setData(results.map((r) => r.row));
      const allCats = [...new Set(results.flatMap((r) => r.cats))];
      setCategories(allCats.slice(0, 6));
      setLoaded(true);
    });
  }, [currentHouseholdId, months, loaded]);

  if (!loaded) return <Skeleton className="h-[300px] w-full" />;
  if (categories.length === 0) return <EmptyState />;

  return <CategoryTrends data={data} categories={categories} />;
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
      <p className="text-sm text-muted-foreground">
        No data available for this period.
      </p>
    </div>
  );
}
