import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  getDate,
  getDaysInMonth,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Landmark,
  PiggyBank,
  CreditCard,
  LineChart,
  ArrowRight,
  DollarSign,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { SpendingComparison } from "@/components/charts/SpendingComparison";
import {
  useRecentTransactions,
  useSpendingByCategory,
  useCashFlow,
  useDailySpending,
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

  const prevMonth = subMonths(currentDate, 1);
  const prevStart = format(startOfMonth(prevMonth), "yyyy-MM-dd");
  const prevEnd = format(endOfMonth(prevMonth), "yyyy-MM-dd");

  const { data: spending, isLoading: spendingLoading } = useSpendingByCategory(start, end);
  const { data: cashFlow, isLoading: cashFlowLoading } = useCashFlow(start, end);
  const { data: recentTxns, isLoading: txnsLoading } = useRecentTransactions(6);
  const { data: budgets, isLoading: budgetsLoading } = useBudgets();
  const { data: balances, isLoading: balancesLoading } = useAccountBalanceSummary();
  const { data: dailySpending, isLoading: dailyLoading } = useDailySpending(start, end);
  const { data: prevDailySpending, isLoading: prevDailyLoading } = useDailySpending(prevStart, prevEnd);

  const totalSpent = spending?.reduce((sum, s) => sum + Math.abs(s.total), 0) ?? 0;
  const totalBudget = budgets?.reduce((sum, b) => sum + b.amount, 0) ?? 0;

  const now = new Date();
  const isCurrentMonth =
    currentDate.getMonth() === now.getMonth() &&
    currentDate.getFullYear() === now.getFullYear();
  const currentDayOfMonth = isCurrentMonth ? getDate(now) : undefined;

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

      {/* 2x2 Widget Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Budget Summary — top left */}
        <BudgetSummaryCard
          income={cashFlow?.income ?? 0}
          expenses={totalSpent}
          totalBudget={totalBudget}
          month={format(currentDate, "MMMM")}
          loading={cashFlowLoading || spendingLoading || budgetsLoading}
        />

        {/* Spending Comparison — top right */}
        <Card className="shadow-sm">
          <CardHeader>
            <div>
              <CardTitle className="text-base">Spending</CardTitle>
              {!cashFlowLoading && (
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(totalSpent)}
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    this month
                  </span>
                </p>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {dailyLoading || prevDailyLoading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : dailySpending && prevDailySpending ? (
              <>
                <SpendingComparison
                  currentData={dailySpending}
                  previousData={prevDailySpending}
                  currentDaysInMonth={getDaysInMonth(currentDate)}
                  previousDaysInMonth={getDaysInMonth(prevMonth)}
                  currentDayOfMonth={currentDayOfMonth}
                />
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="h-0.5 w-4 bg-[#94a3b8] inline-block" style={{ borderTop: "2px dashed #94a3b8", height: 0 }} />
                    Last month
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-0.5 w-4 bg-[#0ea5e9] inline-block" />
                    This month
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No spending data yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Net Worth — bottom left */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Net Worth</CardTitle>
          </CardHeader>
          <CardContent>
            {balancesLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-48" />
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-end gap-3 mb-6">
                  <p className="text-3xl font-bold">
                    {formatCurrency(balances?.netWorth ?? 0)}
                  </p>
                  {!cashFlowLoading && cashFlow && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-md mb-0.5",
                        cashFlow.net >= 0
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      )}
                    >
                      {cashFlow.net >= 0 ? (
                        <TrendingUp className="h-3.5 w-3.5" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5" />
                      )}
                      {cashFlow.net >= 0 ? "+" : ""}
                      {formatCurrency(cashFlow.net)}
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  <AccountRow
                    icon={<Landmark className="h-4 w-4" />}
                    label="Checking"
                    amount={balances?.checking ?? 0}
                  />
                  <AccountRow
                    icon={<PiggyBank className="h-4 w-4" />}
                    label="Savings"
                    amount={balances?.savings ?? 0}
                  />
                  <AccountRow
                    icon={<CreditCard className="h-4 w-4" />}
                    label="Credit Cards"
                    amount={balances?.credit ?? 0}
                    negative
                  />
                  <AccountRow
                    icon={<LineChart className="h-4 w-4" />}
                    label="Investments"
                    amount={balances?.investment ?? 0}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions — bottom right */}
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

function BudgetSummaryCard({
  income,
  expenses,
  totalBudget,
  month,
  loading,
}: {
  income: number;
  expenses: number;
  totalBudget: number;
  month: string;
  loading: boolean;
}) {
  const expensePct = totalBudget > 0 ? Math.min((expenses / totalBudget) * 100, 100) : 0;
  const remaining = totalBudget - expenses;
  const overBudget = expenses > totalBudget && totalBudget > 0;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div>
          <CardTitle className="text-base">Budget</CardTitle>
          <p className="text-sm text-muted-foreground">{month}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-3 w-full" />
          </div>
        ) : (
          <>
            {/* Income section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Income</span>
                <span className="font-semibold text-income tabular-nums">
                  {formatCurrency(income)}
                </span>
              </div>
              <Progress
                value={100}
                className="h-2.5 [&>div]:bg-income"
              />
            </div>

            {/* Expenses section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Expenses</span>
                <span className="tabular-nums">
                  <span className={cn("font-semibold", overBudget ? "text-expense" : "text-foreground")}>
                    {formatCurrency(expenses)}
                  </span>
                  {totalBudget > 0 && (
                    <span className="text-muted-foreground">
                      {" "}/ {formatCurrency(totalBudget)}
                    </span>
                  )}
                </span>
              </div>
              <Progress
                value={expensePct}
                className={cn(
                  "h-2.5",
                  overBudget
                    ? "[&>div]:bg-expense"
                    : expensePct > 75
                      ? "[&>div]:bg-yellow-500"
                      : "[&>div]:bg-income"
                )}
              />
              {totalBudget > 0 && (
                <p className={cn("text-xs", overBudget ? "text-expense" : "text-muted-foreground")}>
                  {overBudget
                    ? `${formatCurrency(Math.abs(remaining))} over budget`
                    : `${formatCurrency(remaining)} remaining`}
                </p>
              )}
              {totalBudget === 0 && (
                <p className="text-xs text-muted-foreground">
                  No budgets set.{" "}
                  <a href="/budgets" className="text-primary hover:underline">
                    Create one
                  </a>
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AccountRow({
  icon,
  label,
  amount,
  negative,
}: {
  icon: React.ReactNode;
  label: string;
  amount: number;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-medium tabular-nums">
        {negative && amount > 0 ? "-" : ""}
        {formatCurrency(Math.abs(amount))}
      </span>
    </div>
  );
}
