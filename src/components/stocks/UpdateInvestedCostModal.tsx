"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  DollarSign,
  Pencil,
  RotateCcw,
  Sparkles,
  Info,
  Check,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import { useStocks } from "@/context/StocksContext";
import {
  FINANCIAL_YEAR_MONTHS,
  currentFinancialYear,
  currentFinancialMonth,
  generateFinancialYears,
} from "@/context/TaxContext";
import type { StockSnapshot } from "@/actions/stocks";

interface UpdateInvestedCostModalProps {
  currentFY?: string;
  currentMonth?: string;
  trigger?: React.ReactNode;
}

export function UpdateInvestedCostModal({
  currentFY = currentFinancialYear(),
  currentMonth = currentFinancialMonth(),
  trigger,
}: UpdateInvestedCostModalProps) {
  const {
    snapshots,
    monthlyBaseCosts,
    saveMonthlyBaseCost,
    capitalTransactions,
  } = useStocks();

  const availableYears = generateFinancialYears(4);

  const [open, setOpen] = useState(false);
  const [selectedFY, setSelectedFY] = useState(currentFY);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [costInput, setCostInput] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  const currentYearMonth = getCalendarYearMonth(selectedFY, selectedMonth);
  const monthKey = `${selectedFY}-${selectedMonth}`;

  // Chronologically sorted snapshots
  const chronoSortedSnapshots = useMemo(() => {
    return [...snapshots]
      .map((s) => ({
        ...s,
        yearMonth: getCalendarYearMonth(s.financialYear, s.month),
      }))
      .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
  }, [snapshots]);

  // Helper to get total cost of holdings from snapshot
  const getSnapshotHoldingsCost = (s: StockSnapshot): number => {
    if (s.holdings && s.holdings.length > 0) {
      const sumHoldings = s.holdings.reduce((sum, h) => sum + (h.totalCost || 0), 0);
      if (sumHoldings > 0) return sumHoldings;
    }
    return s.totalCost || 0;
  };

  // Previous month snapshot
  const prevSnapshot = useMemo(() => {
    const prevs = chronoSortedSnapshots.filter((s) => s.yearMonth < currentYearMonth);
    return prevs.length > 0 ? prevs[prevs.length - 1] : null;
  }, [chronoSortedSnapshots, currentYearMonth]);

  const defaultCalculatedCost = useMemo(() => {
    if (prevSnapshot) {
      return getSnapshotHoldingsCost(prevSnapshot);
    }
    const currentSnap = chronoSortedSnapshots.find((s) => s.yearMonth === currentYearMonth);
    if (currentSnap) {
      return getSnapshotHoldingsCost(currentSnap);
    }
    return 0;
  }, [prevSnapshot, chronoSortedSnapshots, currentYearMonth]);

  // Active saved base cost (checking yearMonth or monthKey)
  const savedBaseCost = monthlyBaseCosts[currentYearMonth] ?? monthlyBaseCosts[monthKey];
  const hasCustomOverride = savedBaseCost !== undefined;

  // Active effective starting cost
  const effectiveBaseCost = hasCustomOverride ? savedBaseCost : defaultCalculatedCost;

  // Capital transactions for this month
  const intraMonthTxs = useMemo(() => {
    return capitalTransactions.filter((tx) => tx.date.startsWith(currentYearMonth));
  }, [capitalTransactions, currentYearMonth]);

  const totalAddedInMonth = useMemo(() => {
    return intraMonthTxs.filter((tx) => tx.type === "BUY").reduce((s, tx) => s + tx.amount, 0);
  }, [intraMonthTxs]);

  const totalSoldInMonth = useMemo(() => {
    return intraMonthTxs.filter((tx) => tx.type === "SELL").reduce((s, tx) => s + tx.amount, 0);
  }, [intraMonthTxs]);

  const netMonthAdjustment = totalAddedInMonth - totalSoldInMonth;
  const projectedEndingCost = Math.max(0, (Number(costInput) || effectiveBaseCost) + netMonthAdjustment);

  // Sync inputs when modal opens or month changes
  useEffect(() => {
    if (open) {
      setSelectedFY(currentFY);
      setSelectedMonth(currentMonth);
      setSuccessMsg(null);
    }
  }, [open, currentFY, currentMonth]);

  useEffect(() => {
    const existing = monthlyBaseCosts[currentYearMonth] ?? monthlyBaseCosts[monthKey];
    if (existing !== undefined) {
      setCostInput(String(existing));
    } else if (defaultCalculatedCost > 0) {
      setCostInput(String(defaultCalculatedCost));
    } else {
      setCostInput("");
    }
    setSuccessMsg(null);
  }, [selectedFY, selectedMonth, monthlyBaseCosts, currentYearMonth, monthKey, defaultCalculatedCost]);

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg(null);
    try {
      const numVal = parseFloat(costInput);
      if (isNaN(numVal) || numVal < 0) {
        // If empty or invalid, clear override
        await saveMonthlyBaseCost(currentYearMonth, null);
        await saveMonthlyBaseCost(monthKey, null);
      } else {
        await saveMonthlyBaseCost(currentYearMonth, numVal);
      }
      setSuccessMsg("Invested cost successfully updated!");
      setTimeout(() => {
        setOpen(false);
      }, 700);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    setSaving(true);
    try {
      await saveMonthlyBaseCost(currentYearMonth, null);
      await saveMonthlyBaseCost(monthKey, null);
      if (defaultCalculatedCost > 0) {
        setCostInput(String(defaultCalculatedCost));
      } else {
        setCostInput("");
      }
      setSuccessMsg("Reset to auto-calculated default!");
      setTimeout(() => {
        setSuccessMsg(null);
      }, 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* @ts-expect-error - local wrapper might not export asChild correctly */}
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs bg-card/60 border-white/10 hover:bg-white/10 text-white"
          >
            <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
            <span>Update Cost</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md bg-card/95 backdrop-blur-2xl border-white/10 text-white shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <DollarSign className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Update Invested Cost</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Set or customize the starting invested cost for the month.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Period selector */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-background/50 border border-white/5">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Financial Year</Label>
              <Select value={selectedFY} onValueChange={(v) => { if (v) setSelectedFY(v); }}>
                <SelectTrigger className="h-8 text-xs bg-background/80 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-white/10 text-white">
                  {availableYears.map((fy) => (
                    <SelectItem key={fy} value={fy} className="text-xs">
                      {fy}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Month</Label>
              <Select value={selectedMonth} onValueChange={(v) => { if (v) setSelectedMonth(v); }}>
                <SelectTrigger className="h-8 text-xs bg-background/80 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-white/10 text-white">
                  {FINANCIAL_YEAR_MONTHS.map((m) => (
                    <SelectItem key={m} value={m} className="text-xs">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Context details card */}
          <div className="p-3.5 rounded-xl bg-background/40 border border-white/5 space-y-2 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Target Month:</span>
              <span className="font-semibold text-white">
                {selectedMonth} {selectedFY} ({currentYearMonth})
              </span>
            </div>

            <div className="flex items-center justify-between text-muted-foreground">
              <span>Prior Month Snapshot:</span>
              <span className="font-medium text-white/90">
                {prevSnapshot ? (
                  `${prevSnapshot.month} ${prevSnapshot.financialYear} (Rs. ${fmt(getSnapshotHoldingsCost(prevSnapshot))})`
                ) : (
                  <span className="text-amber-400/80">No prior snapshot</span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between text-muted-foreground">
              <span>Auto-Calculated Base:</span>
              <span className="font-semibold text-emerald-400">
                Rs. {fmt(defaultCalculatedCost)}
              </span>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
              <span className="text-muted-foreground">Status:</span>
              {hasCustomOverride ? (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-semibold border border-cyan-500/20">
                  Custom Override Active
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] font-semibold">
                  Using Snapshot Holdings Default
                </span>
              )}
            </div>
          </div>

          {/* Input field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-white">
                Starting Invested Cost (Rs.)
              </Label>
              {defaultCalculatedCost > 0 && (
                <button
                  type="button"
                  onClick={() => setCostInput(String(defaultCalculatedCost))}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 underline underline-offset-2 flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  Use Auto Base (Rs. {fmt(defaultCalculatedCost)})
                </button>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-white/40">
                Rs.
              </span>
              <Input
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 225000"
                value={costInput}
                onChange={(e) => setCostInput(e.target.value)}
                className="pl-10 h-10 bg-background/80 border-white/10 text-sm font-semibold text-white placeholder:text-white/30"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              The starting cost for day 1 of {selectedMonth} {selectedFY} before intra-month capital additions and sells.
            </p>
          </div>

          {/* Month Activity & Projected ending cost */}
          {intraMonthTxs.length > 0 && (
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5 text-xs">
              <div className="text-[11px] font-medium text-white/60">
                Month Capital Flow ({intraMonthTxs.length} transaction{intraMonthTxs.length === 1 ? "" : "s"}):
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-1 text-emerald-400">
                  <TrendingUp className="h-3 w-3" />
                  <span>Buys: +Rs. {fmt(totalAddedInMonth)}</span>
                </div>
                <div className="flex items-center gap-1 text-amber-400">
                  <TrendingDown className="h-3 w-3" />
                  <span>Sells: -Rs. {fmt(totalSoldInMonth)}</span>
                </div>
              </div>
              <div className="pt-1.5 border-t border-white/5 flex items-center justify-between font-semibold">
                <span className="text-white/70">Projected Ending Cost:</span>
                <span className="text-white">Rs. {fmt(projectedEndingCost)}</span>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row pt-2">
          {hasCustomOverride && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetToDefault}
              disabled={saving}
              className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 mr-auto h-9"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Clear Override
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            className="text-xs border-white/10 hover:bg-white/10 text-white h-9"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="text-xs bg-emerald-500 hover:bg-emerald-600 text-black font-semibold h-9 px-4 shadow-lg shadow-emerald-500/20"
          >
            {saving ? "Saving..." : "Save Invested Cost"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
