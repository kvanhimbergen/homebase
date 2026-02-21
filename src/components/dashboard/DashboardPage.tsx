import { useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { SpendingDonut, SpendingLegend } from "@/components/charts/SpendingDonut";
import {
  useRecentTransactions,
  useSpendingByCategory,
  useCashFlow,
} from "@/hooks/useTransactions";
import { useBudgets } from "@/hooks/useBudgets";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export function Component() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const start = format(startOfMonth(currentDate), "yyyy-MM-dd");
  const end = format(endOfMonth(currentDate), "yyyy-MM-dd");

  const { data: spending, isLoading: spendingLoading } = useSpendingByCategory(start, end);
  const { data: cashFlow, isLoading: cashFlowLoading } = useCashFlow(start, end);
  const { data: recentTxns, isLoading: txnsLoading } = useRecentTransactions(8);
  const { data: budgets, isLoading: budgetsLoading } = useBudgets();

  const totalSpent = spending?.reduce((sum, s) => sum + Math.abs(s.total), 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Month Selector */}
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

      {/* Cash Flow Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <CashFlowCard
          title="Income"
          amount={cashFlow?.income ?? 0}
          icon={<TrendingUp className="h-4 w-4" />}
          className="text-income"
          loading={cashFlowLoading}
        />
        <CashFlowCard
          title="Expenses"
          amount={cashFlow?.expenses ?? 0}
          icon={<TrendingDown className="h-4 w-4" />}
          className="text-expense"
          loading={cashFlowLoading}
        />
        <CashFlowCard
          title="Net"
          amount={cashFlow?.net ?? 0}
          icon={<DollarSign className="h-4 w-4" />}
          className={(cashFlow?.net ?? 0) >= 0 ? "text-income" : "text-expense"}
          loading={cashFlowLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Spending by Category */}
        <Card>
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
                <SpendingDonut data={spending} total={totalSpent} />
                <div className="mt-4">
                  <SpendingLegend data={spending} />
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

        {/* Budget Progress */}
        <Card>
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
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Transactions</CardTitle>
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
                  className="flex items-center gap-4 py-2.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div
                    className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0"
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
  );
}

function CashFlowCard({
  title,
  amount,
  icon,
  className,
  loading,
}: {
  title: string;
  amount: number;
  icon: React.ReactNode;
  className?: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-2">
          <span className={className}>{icon}</span>
          <span className="text-sm text-muted-foreground">{title}</span>
        </div>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className={cn("text-2xl font-bold", className)}>
            {formatCurrency(Math.abs(amount))}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
