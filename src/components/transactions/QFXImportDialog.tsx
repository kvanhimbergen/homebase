import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload } from "lucide-react";
import { useCreateTransaction, useClassifyTransactions } from "@/hooks/useTransactions";
import { useHousehold } from "@/hooks/useHousehold";
import { toast } from "sonner";
import { parseOFX, type OFXTransaction } from "@/lib/ofx-parser";
import { formatCurrency } from "@/lib/formatters";

export function QFXImportDialog() {
  const [open, setOpen] = useState(false);
  const [transactions, setTransactions] = useState<OFXTransaction[]>([]);
  const [importing, setImporting] = useState(false);

  const { currentHouseholdId, currentHousehold } = useHousehold();
  const createTxn = useCreateTransaction();
  const classifyTxns = useClassifyTransactions();

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const parsed = parseOFX(text);
        setTransactions(parsed);

        if (parsed.length === 0) {
          toast.error("No transactions found in file");
        }
      };
      reader.readAsText(file);
    },
    []
  );

  async function handleImport() {
    if (!currentHouseholdId || transactions.length === 0) return;

    setImporting(true);
    let imported = 0;
    let skipped = 0;

    for (const txn of transactions) {
      try {
        await createTxn.mutateAsync({
          household_id: currentHouseholdId,
          name: txn.name,
          amount: txn.amount,
          date: txn.date,
          source: "ofx",
          import_hash: `ofx:${txn.fitId}`,
        });
        imported++;
      } catch {
        skipped++;
      }
    }

    let classifyMsg = "";
    if (imported > 0 && currentHousehold?.auto_classify_imports) {
      try {
        const result = await classifyTxns.mutateAsync();
        classifyMsg = `, ${result.classified} classified`;
      } catch {
        classifyMsg = ", auto-classify failed";
      }
    }

    setImporting(false);
    toast.success(
      `Imported ${imported} transactions${skipped > 0 ? `, ${skipped} skipped` : ""}${classifyMsg}`
    );
    setOpen(false);
    setTransactions([]);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-1" />
          Import QFX
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import from QFX/OFX</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => document.getElementById("qfx-input")?.click()}
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Drop a QFX or OFX file here or click to browse
            </p>
            <Input
              id="qfx-input"
              type="file"
              accept=".qfx,.ofx"
              className="hidden"
              onChange={handleFile}
            />
          </div>

          {transactions.length > 0 && (
            <>
              <div className="border rounded-md max-h-48 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Name</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs text-right">
                        Amount
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.slice(0, 5).map((txn) => (
                      <TableRow key={txn.fitId}>
                        <TableCell className="text-xs">{txn.date}</TableCell>
                        <TableCell className="text-xs truncate max-w-[200px]">
                          {txn.name}
                        </TableCell>
                        <TableCell className="text-xs">{txn.type}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">
                          {txn.amount < 0 ? "+" : "-"}
                          {formatCurrency(Math.abs(txn.amount))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <p className="text-xs text-muted-foreground">
                {transactions.length} transactions found. Showing first{" "}
                {Math.min(5, transactions.length)} rows.
              </p>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={importing}>
                  {importing
                    ? "Importing..."
                    : `Import ${transactions.length} Transactions`}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
