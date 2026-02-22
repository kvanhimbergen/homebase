import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Landmark,
  PiggyBank,
  CreditCard,
  LineChart,
  ArrowRight,
  Wallet,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { SpendingDonut, SpendingLegend } from "@/components/charts/SpendingDonut";
import { CashFlowBar } from "@/components/charts/CashFlowBar";
import {
  useRecentTransactions,
  useSpendingByCategory,
  useCashFlow,
  useMultiMonthCashFlow,
} from "@/hooks/useTransactions";
import { useAccountBalanceSummary } from "@/hooks/useAccounts";
import { useBudgets } from "@/hooks/useBudgets";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export function Component() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const start = format(startOfMonth(currentDate), "yyyy-MM-dd");
  const end = format(endOfMonth(currentDate), "yyyy-MM-dd");

  // Previous month for delta calculation
  const prevStart = format(startOfMonth(subMonths(currentDate, 1)), "yyyy-MM-dd");
  const prevEnd = format(endOfMonth(subMonths(currentDate, 1)), "yyyy-MM-dd");

  const { data: spending, isLoading: spendingLoading } = useSpendingByCategory(start, end);
  const { data: cashFlow, isLoading: cashFlowLoading } = useCashFlow(start, end);
  const { data: prevCashFlow } = useCashFlow(prevStart, prevEnd);
  const { data: recentTxns, isLoading: txnsLoading } = useRecentTransactions(8);
  const { data: budgets, isLoading: budgetsLoading } = useBudgets();
  const { data: balances, isLoading: balancesLoading } = useAccountBalanceSummary();
  const { data: multiMonthData, isLoading: multiMonthLoading } = useMultiMonthCashFlow(currentDate, 6);

  const totalSpent = spending?.reduce((sum, s) => sum + Math.abs(s.total), 0) ?? 0;

  // Drill-down state
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [selectedParentName, setSelectedParentName] = useState<string | null>(null);
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(null);

  // Reset drill-down when month changes
  const monthKey = format(currentDate, "yyyy-MM");
  const [prevMonth, setPrevMonth] = useState(monthKey);
  if (monthKey !== prevMonth) {
    setPrevMonth(monthKey);
    setSelectedParentId(null);
    setSelectedParentName(null);
    setHoveredCategoryId(null);
  }

  function calcDelta(current: number, previous: number): number | null {
    if (previous === 0) return null;
    return ((current - previous) / previous) * 100;
  }

  const incomeDelta = prevCashFlow ? calcDelta(cashFlow?.income ?? 0, prevCashFlow.income) : null;
  const expenseDelta = prevCashFlow ? calcDelta(cashFlow?.expenses ?? 0, prevCashFlow.expenses) : null;
  const netDelta = prevCashFlow ? calcDelta(cashFlow?.net ?? 0, prevCashFlow.net) : null;

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

  return (
    <div className="space-y-6">
      {/* Header + Month Selector */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentDate((d) => subMonths(d, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[120px] text-center">
            {format(currentDate, "MMMM yyyy")}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentDate((d) => addMonths(d, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Net Worth Banner */}
      <AccountBalanceBanner balances={balances} loading={balancesLoading} />

      {/* Cash Flow Cards with Deltas */}
      <div className="grid gap-4 md:grid-cols-3">
        <CashFlowCard
          title="Income"
          amount={cashFlow?.income ?? 0}
          icon={<TrendingUp className="h-4 w-4" />}
          className="text-income"
          loading={cashFlowLoading}
          delta={incomeDelta}
          deltaInverted={false}
          onClick={() => navigate("/transactions?amountType=income")}
        />
        <CashFlowCard
          title="Expenses"
          amount={cashFlow?.expenses ?? 0}
          icon={<TrendingDown className="h-4 w-4" />}
          className="text-expense"
          loading={cashFlowLoading}
          delta={expenseDelta}
          deltaInverted={true}
          onClick={() => navigate("/transactions?amountType=expenses")}
        />
        <CashFlowCard
          title="Net"
          amount={cashFlow?.net ?? 0}
          icon={<DollarSign className="h-4 w-4" />}
          className={(cashFlow?.net ?? 0) >= 0 ? "text-income" : "text-expense"}
          loading={cashFlowLoading}
          delta={netDelta}
          deltaInverted={false}
        />
      </div>

      {/* Cash Flow Bar Chart + Spending Donut */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Cash Flow Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {multiMonthLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : multiMonthData && multiMonthData.length > 0 ? (
              <CashFlowBar data={multiMonthData} height={300} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No cash flow data available.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add transactions to see your cash flow trend.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {spendingLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-[280px] w-full rounded-full mx-auto max-w-[280px]" />
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-5 w-full" />
                  ))}
                </div>
              </div>
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
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <DollarSign className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No spending data for this month.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add transactions or connect an account to get started.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Budget Progress + Recent Transactions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Budget Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {budgetsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
            ) : budgets && budgets.length > 0 ? (
              <div className="space-y-4">
                {budgets.map((budget) => {
                  const spent =
                    spending?.find((s) => s.category_id === budget.category_id)
                      ?.total ?? 0;
                  const spentAbs = Math.abs(spent);
                  const pct =
                    budget.amount > 0
                      ? Math.min((spentAbs / budget.amount) * 100, 100)
                      : 0;
                  const overBudget = spentAbs > budget.amount;

                  return (
                    <div key={budget.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate">
                          {budget.categories?.name ?? "Unknown"}
                        </span>
                        <span
                          className={cn(
                            "tabular-nums",
                            overBudget
                              ? "text-expense font-medium"
                              : "text-muted-foreground"
                          )}
                        >
                          {formatCurrency(spentAbs)} / {formatCurrency(budget.amount)}
                        </span>
                      </div>
                      <Progress
                        value={pct}
                        className={cn(
                          "h-2",
                          overBudget
                            ? "[&>div]:bg-expense"
                            : pct > 75
                              ? "[&>div]:bg-yellow-500"
                              : "[&>div]:bg-income"
                        )}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Wallet className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No budgets set up yet.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Go to Budgets to create your first budget.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Transactions</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" asChild>
              <Link to="/transactions">
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {txnsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : recentTxns && recentTxns.length > 0 ? (
              <div className="space-y-1">
                {recentTxns.map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-center gap-4 py-2.5 px-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() =>
                      navigate(
                        `/transactions?search=${encodeURIComponent(txn.merchant_name ?? txn.name)}`
                      )
                    }
                  >
                    <div
                      className="h-9 w-9 rounded-lg flex items-center justify-center text-xs font-medium text-white shrink-0"
                      style={{
                        backgroundColor: txn.categories?.color ?? "#64748b",
                      }}
                    >
                      {(txn.merchant_name ?? txn.name).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {txn.merchant_name ?? txn.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(txn.date)}
                        </span>
                        {txn.categories && (
                          <Badge variant="secondary" className="text-xs h-5">
                            {txn.categories.name}
                          </Badge>
                        )}
                        {txn.ai_category_confidence != null &&
                          txn.ai_category_confidence > 0 && (
                            <span className="text-xs" title="AI classified">
                              ✨
                            </span>
                          )}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "text-sm font-medium tabular-nums",
                        txn.amount < 0 ? "text-income" : "text-foreground"
                      )}
                    >
                      {txn.amount < 0 ? "+" : "-"}
                      {formatCurrency(Math.abs(txn.amount))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <DollarSign className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No transactions yet.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add transactions manually or connect a bank account.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────── */

function AccountBalanceBanner({
  balances,
  loading,
}: {
  balances:
    | { netWorth: number; checking: number; savings: number; credit: number; investment: number }
    | undefined;
  loading: boolean;
}) {
  return (
    <Card className="bg-gradient-to-r from-navy to-navy-light text-white border-0 shadow-lg">
      <CardContent className="pt-6 pb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-white/60 mb-1">Net Worth</p>
            {loading ? (
              <Skeleton className="h-9 w-40 bg-white/10" />
            ) : (
              <p className="text-3xl font-bold">
                {formatCurrency(balances?.netWorth ?? 0)}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <BalanceMiniCard
              icon={<Landmark className="h-4 w-4" />}
              label="Checking"
              amount={balances?.checking ?? 0}
              loading={loading}
            />
            <BalanceMiniCard
              icon={<PiggyBank className="h-4 w-4" />}
              label="Savings"
              amount={balances?.savings ?? 0}
              loading={loading}
            />
            <BalanceMiniCard
              icon={<CreditCard className="h-4 w-4" />}
              label="Credit"
              amount={balances?.credit ?? 0}
              loading={loading}
              negative
            />
            <BalanceMiniCard
              icon={<LineChart className="h-4 w-4" />}
              label="Investments"
              amount={balances?.investment ?? 0}
              loading={loading}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BalanceMiniCard({
  icon,
  label,
  amount,
  loading,
  negative,
}: {
  icon: React.ReactNode;
  label: string;
  amount: number;
  loading: boolean;
  negative?: boolean;
}) {
  return (
    <div className="bg-white/[0.07] backdrop-blur-sm rounded-lg px-3 py-2 min-w-[130px]">
      <div className="flex items-center gap-1.5 mb-1 text-white/50">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      {loading ? (
        <Skeleton className="h-5 w-16 bg-white/10" />
      ) : (
        <p className="text-sm font-semibold tabular-nums">
          {negative && amount > 0 ? "-" : ""}
          {formatCurrency(Math.abs(amount))}
        </p>
      )}
    </div>
  );
}

function CashFlowCard({
  title,
  amount,
  icon,
  className,
  loading,
  delta,
  deltaInverted,
  onClick,
}: {
  title: string;
  amount: number;
  icon: React.ReactNode;
  className?: string;
  loading: boolean;
  delta: number | null;
  deltaInverted: boolean;
  onClick?: () => void;
}) {
  return (
    <Card
      className={cn(
        "shadow-sm hover:shadow-md transition-shadow",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-2">
          <span className={cn("h-8 w-8 rounded-lg bg-primary/10 inline-flex items-center justify-center", className)}>{icon}</span>
          <span className="text-sm text-muted-foreground">{title}</span>
        </div>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="flex items-end gap-2">
            <p className={cn("text-2xl font-bold", className)}>
              {formatCurrency(Math.abs(amount))}
            </p>
            <DeltaBadge delta={delta} inverted={deltaInverted} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DeltaBadge({
  delta,
  inverted,
}: {
  delta: number | null;
  inverted: boolean;
}) {
  if (delta === null) return null;

  const rounded = Math.round(delta);
  if (rounded === 0) return null;

  // For expenses, going up is bad; for income/net, going up is good
  const isPositiveChange = delta > 0;
  const isGood = inverted ? !isPositiveChange : isPositiveChange;

  return (
    <span
      className={cn(
        "text-xs font-medium px-1.5 py-0.5 rounded-md mb-0.5",
        isGood
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      )}
    >
      {delta > 0 ? "+" : ""}
      {rounded}%
    </span>
  );
}
