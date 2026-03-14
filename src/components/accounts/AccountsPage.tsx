import { useState } from "react";
import {
  Landmark,
  CreditCard,
  Wallet,
  TrendingUp,
  Plus,
  Eye,
  EyeOff,
  Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAccounts,
  useAccountBalanceSummary,
  useCreateAccount,
  useUpdateAccount,
  useCreditCardPayments,
} from "@/hooks/useAccounts";
import { useHousehold } from "@/hooks/useHousehold";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ACCOUNT_TYPE_META: Record<
  string,
  { label: string; icon: typeof Landmark; color: string }
> = {
  depository: { label: "Checking", icon: Landmark, color: "text-blue-500" },
  savings: { label: "Savings", icon: Wallet, color: "text-green-500" },
  credit: { label: "Credit Card", icon: CreditCard, color: "text-orange-500" },
  investment: { label: "Investment", icon: TrendingUp, color: "text-purple-500" },
};

export function Component() {
  const { data: accounts, isLoading } = useAccounts();
  const { data: summary, isLoading: summaryLoading } = useAccountBalanceSummary();
  const updateAccount = useUpdateAccount();
  const { data: ccPayments } = useCreditCardPayments();
  const visibleAccounts = accounts?.filter((a) => !a.is_hidden) ?? [];
  const hiddenAccounts = accounts?.filter((a) => a.is_hidden) ?? [];
  const hasCreditAccounts = accounts?.some((a) => a.type === "credit") ?? false;

  async function toggleHidden(id: string, currentlyHidden: boolean) {
    try {
      await updateAccount.mutateAsync({
        id,
        data: { is_hidden: !currentlyHidden },
      });
    } catch (err) {
      toast.error(`Failed to update account: ${err instanceof Error ? err.message : err}`);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <div className="flex items-center gap-2">
          <AddManualAccountDialog />
        </div>
      </div>

      {/* Balance Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-7 w-28" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <BalanceCard
              label="Checking"
              amount={summary?.checking ?? 0}
              icon={<Landmark className="h-4 w-4" />}
            />
            <BalanceCard
              label="Savings"
              amount={summary?.savings ?? 0}
              icon={<Wallet className="h-4 w-4" />}
            />
            <BalanceCard
              label="Credit Cards"
              amount={summary?.credit ?? 0}
              icon={<CreditCard className="h-4 w-4" />}
              negative
            />
            <BalanceCard
              label="Net Worth"
              amount={summary?.netWorth ?? 0}
              icon={<TrendingUp className="h-4 w-4" />}
              highlight
            />
          </>
        )}
      </div>

      {/* Account List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Linked Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-5 w-24" />
                </div>
              ))}
            </div>
          ) : visibleAccounts.length === 0 ? (
            <div className="text-center py-12">
              <Landmark className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                No accounts yet.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Click "Add Account" to start tracking your balances.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleAccounts.map((account) => {
                const meta = ACCOUNT_TYPE_META[account.type] ?? {
                  label: account.type,
                  icon: Landmark,
                  color: "text-gray-500",
                };
                const Icon = meta.icon;

                return (
                  <div
                    key={account.id}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center bg-muted",
                        meta.color
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {account.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] h-4">
                          {meta.label}
                        </Badge>
                        {account.mask && (
                          <span className="text-xs text-muted-foreground">
                            ****{account.mask}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          account.type === "credit"
                            ? "text-expense"
                            : "text-foreground"
                        )}
                      >
                        {formatCurrency(account.balance_current ?? 0)}
                      </span>
                      <EditAccountDialog account={account} />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleHidden(account.id, false)}
                        title="Hide account"
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hidden Accounts */}
      {hiddenAccounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">
              Hidden Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {hiddenAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center gap-4 p-3 rounded-lg opacity-60"
                >
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-muted">
                    <Landmark className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{account.name}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => toggleHidden(account.id, true)}
                    title="Show account"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Credit Card Payments */}
      {hasCreditAccounts && ccPayments && ccPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Credit Card Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ccPayments.map(({ account, payments, monthTotal }) => (
                <div
                  key={account.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium">{account.name}</span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-expense">
                      {formatCurrency(account.balance_current ?? 0)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Payments this month:{" "}
                    <span className="font-medium text-foreground">
                      {formatCurrency(monthTotal)}
                    </span>
                  </div>
                  {payments.length > 0 ? (
                    <div className="space-y-1.5">
                      {payments.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-muted-foreground">{p.date}</span>
                          <span className="font-medium tabular-nums">
                            {formatCurrency(Math.abs(p.amount))}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No transfer-linked payments yet.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BalanceCard({
  label,
  amount,
  icon,
  negative,
  highlight,
}: {
  label: string;
  amount: number;
  icon: React.ReactNode;
  negative?: boolean;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary/30" : undefined}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-muted-foreground">{icon}</span>
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <p
          className={cn(
            "text-2xl font-bold tabular-nums",
            negative && amount > 0 && "text-expense",
            highlight && amount >= 0 && "text-income",
            highlight && amount < 0 && "text-expense"
          )}
        >
          {negative ? `-${formatCurrency(Math.abs(amount))}` : formatCurrency(amount)}
        </p>
      </CardContent>
    </Card>
  );
}

function EditAccountDialog({ account }: { account: { id: string; name: string; type: string; balance_current: number | null } }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(account.name);
  const [type, setType] = useState(account.type);
  const [balance, setBalance] = useState(String(account.balance_current ?? 0));
  const updateAccount = useUpdateAccount();

  function handleOpen(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) {
      setName(account.name);
      setType(account.type);
      setBalance(String(account.balance_current ?? 0));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    try {
      await updateAccount.mutateAsync({
        id: account.id,
        data: { name, type, balance_current: balance ? parseFloat(balance) : 0 },
      });
      toast.success("Account updated");
      setOpen(false);
    } catch (err) {
      toast.error(`Failed to update account: ${err instanceof Error ? err.message : err}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit account">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Account Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="depository">Checking</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="credit">Credit Card</SelectItem>
                  <SelectItem value="investment">Investment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Current Balance</Label>
              <Input
                type="number"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateAccount.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddManualAccountDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("depository");
  const [balance, setBalance] = useState("");

  const { currentHouseholdId } = useHousehold();
  const createAccount = useCreateAccount();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !currentHouseholdId) return;

    try {
      await createAccount.mutateAsync({
        household_id: currentHouseholdId,
        name,
        type,
        balance_current: balance ? parseFloat(balance) : 0,
      });
      toast.success("Account added");
      setOpen(false);
      setName("");
      setType("depository");
      setBalance("");
    } catch (err) {
      toast.error(`Failed to add account: ${err instanceof Error ? err.message : err}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Manual Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Account Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chase Checking"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="depository">Checking</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="credit">Credit Card</SelectItem>
                  <SelectItem value="investment">Investment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Current Balance</Label>
              <Input
                type="number"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createAccount.isPending}>
              Add Account
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
