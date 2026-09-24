"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { DollarSign, Plus, Trash2, ArrowUpRight, ArrowDownRight, Sparkles } from "lucide-react";
import { useStocks } from "@/context/StocksContext";

import {
  FINANCIAL_YEAR_MONTHS,
  currentFinancialYear,
  currentFinancialMonth,
  generateFinancialYears,
} from "@/context/TaxContext";

interface CapitalTransactionsModalProps {
  currentFY?: string;
  currentMonth?: string;
  trigger?: React.ReactNode;
}

export function CapitalTransactionsModal({
  currentFY = currentFinancialYear(),
  currentMonth = currentFinancialMonth(),
  trigger,
}: CapitalTransactionsModalProps) {
  const { capitalTransactions, addCapitalTransaction, deleteCapitalTransaction, snapshots } = useStocks();
  const availableYears = generateFinancialYears(4);

  const [open, setOpen] = useState(false);
  const [selectedFY, setSelectedFY] = useState(currentFY);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [showAllMonths, setShowAllMonths] = useState(false);

  // Month number mapping from Financial Month name
  const monthNameToNumber = (m: string): string => {
    const map: Record<string, string> = {
      Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
      Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
    };
    return map[m] || "01";
  };

  // Convert FY & Month to calendar YYYY-MM
  const getCalendarYearMonth = (fy: string, m: string): string => {
    const [startYearStr, endYearStr] = fy.split("/");
    const startYear = parseInt(startYearStr, 10);
    const endYear = parseInt(endYearStr, 10);
    const mNum = monthNameToNumber(m);
    const isNextYear = ["Jan", "Feb", "Mar"].includes(m);
    const year = isNextYear ? endYear : startYear;
    return `${year}-${mNum}`;
  };

  const getInitialDateForMonth = (fy: string, m: string): string => {
    const ym = getCalendarYearMonth(fy, m);
    const today = new Date().toISOString().slice(0, 10);
    if (today.startsWith(ym)) return today;
    return `${ym}-01`;
  };

  const [date, setDate] = useState<string>(getInitialDateForMonth(currentFY, currentMonth));
  const [type, setType] = useState<"BUY" | "SELL">("BUY");
  const [amount, setAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const handleMonthChange = (fy: string, m: string) => {
    setSelectedFY(fy);
    setSelectedMonth(m);
    setDate(getInitialDateForMonth(fy, m));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(amount);
    if (!date || isNaN(numAmt) || numAmt <= 0) return;

    setSaving(true);
    try {
      await addCapitalTransaction({
        date,
        type,
        amount: numAmt,
        notes: notes.trim() || undefined,
      });
      setAmount("");
      setNotes("");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Quick sync: if no capital transactions exist, offer to import initial cost basis from snapshots
  const handleSyncFromSnapshots = async () => {
    if (snapshots.length === 0) return;
    setSaving(true);
    try {
      // Find snapshots and sort
      const sorted = [...snapshots].sort((a, b) => {
        return a.financialYear.localeCompare(b.financialYear);
      });
      if (sorted.length > 0) {
        const first = sorted[0];
        const holdingCost =
          first.holdings && first.holdings.length > 0
            ? first.holdings.reduce((sum, h) => sum + (h.totalCost || 0), 0)
            : first.totalCost;
        // Approximate date from financial year / month
        const yearPart = first.financialYear.split("/")[0];
        const approxDate = `${yearPart}-04-01`;
        await addCapitalTransaction({
          date: approxDate,
          type: "BUY",
          amount: holdingCost,
          notes: `Initial Base Cost (${first.month} ${first.financialYear})`,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const currentYearMonth = getCalendarYearMonth(selectedFY, selectedMonth);

  // Filter transactions for the selected month (or all if toggled)
  const displayedTransactions = React.useMemo(() => {
    if (showAllMonths) {
      return [...capitalTransactions].sort((a, b) => b.date.localeCompare(a.date));
    }
    return capitalTransactions
      .filter((tx) => tx.date.startsWith(currentYearMonth))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [capitalTransactions, currentYearMonth, showAllMonths]);

  const summary = React.useMemo(() => {
    const targetTxs = showAllMonths
      ? capitalTransactions
      : capitalTransactions.filter((tx) => tx.date.startsWith(currentYearMonth));

    let totalAdded = 0;
    let totalSold = 0;
    targetTxs.forEach((tx) => {
      if (tx.type === "BUY") totalAdded += tx.amount;
      if (tx.type === "SELL") totalSold += tx.amount;
    });
    return {
      totalAdded,
      totalSold,
      netInvested: Math.max(0, totalAdded - totalSold),
    };
  }, [capitalTransactions, currentYearMonth, showAllMonths]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          handleMonthChange(currentFY, currentMonth);
        }
      }}
    >
      {/* @ts-expect-error - local wrapper might not export asChild correctly */}
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            className="border-white/10 bg-white/5 hover:bg-white/10 text-white font-medium h-10 px-3"
          >
            <DollarSign className="w-4 h-4 mr-2 text-emerald-400" />
            Added / Sold Tracker
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-card border-white/10 text-white max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            Stocks Added & Sold (Capital Cost Tracker)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Month selector */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Financial Year</Label>
              <Select
                value={selectedFY}
                onValueChange={(v) => { if (v) handleMonthChange(v, selectedMonth); }}
              >
                <SelectTrigger className="border-white/10 bg-background/50 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((fy) => (
                    <SelectItem key={fy} value={fy}>{fy}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Month</Label>
              <Select
                value={selectedMonth}
                onValueChange={(v) => { if (v) handleMonthChange(selectedFY, v); }}
              >
                <SelectTrigger className="border-white/10 bg-background/50 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FINANCIAL_YEAR_MONTHS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Summary Strip */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-background/50 border border-white/10 space-y-0.5">
              <span className="text-[10px] text-muted-foreground uppercase font-medium">Total Added (Buy)</span>
              <p className="text-sm font-bold text-emerald-400 tabular-nums">
                Rs. {fmt(summary.totalAdded)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-background/50 border border-white/10 space-y-0.5">
              <span className="text-[10px] text-muted-foreground uppercase font-medium">Total Sold (Exit)</span>
              <p className="text-sm font-bold text-amber-400 tabular-nums">
                Rs. {fmt(summary.totalSold)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-background/50 border border-white/10 space-y-0.5">
              <span className="text-[10px] text-muted-foreground uppercase font-medium">Net Cost Basis</span>
              <p className="text-sm font-bold text-white tabular-nums">
                Rs. {fmt(summary.netInvested)}
              </p>
            </div>
          </div>

          {capitalTransactions.length === 0 && snapshots.length > 0 && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs">
              <div>
                <p className="font-semibold text-white">Import initial cost from snapshots?</p>
                <p className="text-white/60">Initialize your baseline invested cost from your recorded stock snapshots.</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleSyncFromSnapshots}
                disabled={saving}
                className="border-indigo-400/30 text-indigo-200 bg-indigo-500/20 hover:bg-indigo-500/30"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" /> Import Initial Cost
              </Button>
            </div>
          )}

          {/* Add form */}
          <form onSubmit={handleAdd} className="p-4 rounded-xl bg-background/50 border border-white/10 space-y-4">
            <h4 className="text-sm font-semibold text-white/90">Record Capital Addition or Exit</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-background/80 border-white/10 text-white text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select value={type} onValueChange={(v) => { if (v) setType(v as "BUY" | "SELL"); }}>
                  <SelectTrigger className="bg-background/80 border-white/10 text-white text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUY">+ Added (Buy / Capital In)</SelectItem>
                    <SelectItem value="SELL">- Sold (Exit / Capital Out)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Total Cost / Amount (LKR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-background/80 border-white/10 text-white text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Notes / Symbol (Optional)</Label>
                <Input
                  type="text"
                  placeholder="e.g. Bought JKH, Sold COMB"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-background/80 border-white/10 text-white text-xs h-9"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                disabled={saving || !date || !amount || parseFloat(amount) <= 0}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold h-8 text-xs px-3"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Transaction
              </Button>
            </div>
          </form>

          {/* Transactions List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white/90">
                {showAllMonths
                  ? `All Recorded Capital Transactions (${displayedTransactions.length})`
                  : `Recorded Transactions for ${selectedMonth} ${selectedFY} (${displayedTransactions.length})`}
              </h4>
              {capitalTransactions.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllMonths(!showAllMonths)}
                  className="h-6 text-[11px] text-primary/90 hover:text-primary hover:bg-primary/10 px-2"
                >
                  {showAllMonths ? `Show ${selectedMonth} only` : `Show All Months (${capitalTransactions.length})`}
                </Button>
              )}
            </div>
            {displayedTransactions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-3 text-center bg-background/30 rounded-lg border border-white/5">
                {showAllMonths
                  ? "No capital transactions recorded yet."
                  : `No capital transactions recorded for ${selectedMonth} ${selectedFY}. Add transactions for this month above.`}
              </p>
            ) : (
              <div className="border border-white/10 rounded-xl overflow-hidden max-h-[240px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-background/80">
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-[11px] text-muted-foreground py-2">Date</TableHead>
                      <TableHead className="text-[11px] text-muted-foreground py-2">Type</TableHead>
                      <TableHead className="text-[11px] text-muted-foreground py-2">Amount</TableHead>
                      <TableHead className="text-[11px] text-muted-foreground py-2">Notes</TableHead>
                      <TableHead className="text-[11px] text-muted-foreground py-2 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedTransactions.map((tx) => (
                      <TableRow key={tx.id} className="border-white/5 hover:bg-white/5">
                        <TableCell className="text-xs font-medium py-2">{tx.date}</TableCell>
                        <TableCell className="py-2">
                          <span
                            className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded ${
                              tx.type === "BUY"
                                ? "bg-emerald-500/15 text-emerald-400"
                                : "bg-amber-500/15 text-amber-400"
                            }`}
                          >
                            {tx.type === "BUY" ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                            {tx.type === "BUY" ? "Added" : "Sold"}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-semibold py-2">
                          Rs. {fmt(tx.amount)}
                        </TableCell>
                        <TableCell className="text-xs text-white/60 py-2">
                          {tx.notes || "—"}
                        </TableCell>
                        <TableCell className="text-right py-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                            onClick={() => deleteCapitalTransaction(tx.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => setOpen(false)} className="bg-white/10 hover:bg-white/20 text-white">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
