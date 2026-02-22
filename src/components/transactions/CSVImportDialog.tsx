import { useState, useCallback } from "react";
import Papa from "papaparse";
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
import { Upload } from "lucide-react";
import { useCreateTransaction, useClassifyTransactions } from "@/hooks/useTransactions";
import { useHousehold } from "@/hooks/useHousehold";
import { toast } from "sonner";

const PRESETS: Record<string, Record<string, string>> = {
  chase: { date: "Posting Date", name: "Description", amount: "Amount" },
  boa: { date: "Date", name: "Payee", amount: "Amount" },
  amex: { date: "Date", name: "Description", amount: "Amount" },
};

export function CSVImportDialog() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState({ date: "", name: "", amount: "" });
  const [importing, setImporting] = useState(false);

  const { currentHouseholdId, currentHousehold } = useHousehold();
  const createTxn = useCreateTransaction();
  const classifyTxns = useClassifyTransactions();

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const data = result.data as Record<string, string>[];
          setRows(data);
          const cols = result.meta.fields ?? [];
          setHeaders(cols);

          // Auto-detect preset
          const colSet = new Set(cols.map((c) => c.toLowerCase()));
          for (const [, preset] of Object.entries(PRESETS)) {
            if (
              colSet.has(preset.date.toLowerCase()) &&
              colSet.has(preset.name.toLowerCase()) &&
              colSet.has(preset.amount.toLowerCase())
            ) {
              setMapping({
                date: cols.find(
                  (c) => c.toLowerCase() === preset.date.toLowerCase()
                )!,
                name: cols.find(
                  (c) => c.toLowerCase() === preset.name.toLowerCase()
                )!,
                amount: cols.find(
                  (c) => c.toLowerCase() === preset.amount.toLowerCase()
                )!,
              });
              break;
            }
          }
        },
      });
    },
    []
  );

  async function handleImport() {
    if (!mapping.date || !mapping.name || !mapping.amount || !currentHouseholdId)
      return;

    setImporting(true);
    let imported = 0;
    let skipped = 0;

    for (const row of rows) {
      const dateStr = row[mapping.date];
      const name = row[mapping.name];
      const amountStr = row[mapping.amount];

      if (!dateStr || !name || !amountStr) {
        skipped++;
        continue;
      }

      const amount = parseFloat(amountStr.replace(/[$,]/g, ""));
      if (isNaN(amount)) {
        skipped++;
        continue;
      }

      // Parse date — handle MM/DD/YYYY or YYYY-MM-DD
      let date: string;
      if (dateStr.includes("/")) {
        const parts = dateStr.split("/");
        date = `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
      } else {
        date = dateStr;
      }

      const importHash = `csv:${date}:${name}:${amount}`;

      try {
        await createTxn.mutateAsync({
          household_id: currentHouseholdId,
          name,
          amount,
          date,
          source: "csv",
          import_hash: importHash,
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
    toast.success(`Imported ${imported} transactions${skipped > 0 ? `, ${skipped} skipped` : ""}${classifyMsg}`);
    setOpen(false);
    setRows([]);
    setHeaders([]);
    setMapping({ date: "", name: "", amount: "" });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-1" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import from CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => document.getElementById("csv-input")?.click()}
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Drop a CSV file here or click to browse
            </p>
            <Input
              id="csv-input"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFile}
            />
          </div>

          {headers.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Date column</Label>
                  <Select
                    value={mapping.date}
                    onValueChange={(v) =>
                      setMapping((m) => ({ ...m, date: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description column</Label>
                  <Select
                    value={mapping.name}
                    onValueChange={(v) =>
                      setMapping((m) => ({ ...m, name: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount column</Label>
                  <Select
                    value={mapping.amount}
                    onValueChange={(v) =>
                      setMapping((m) => ({ ...m, amount: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border rounded-md max-h-48 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.slice(0, 5).map((h) => (
                        <TableHead key={h} className="text-xs">
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 5).map((row, i) => (
                      <TableRow key={i}>
                        {headers.slice(0, 5).map((h) => (
                          <TableCell key={h} className="text-xs">
                            {row[h]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <p className="text-xs text-muted-foreground">
                {rows.length} rows found. Showing first 5 rows.
              </p>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={
                    importing || !mapping.date || !mapping.name || !mapping.amount
                  }
                >
                  {importing
                    ? `Importing...`
                    : `Import ${rows.length} Transactions`}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
