"use client";

import React, { useState, useRef, useCallback } from "react";
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
import { PlusCircle, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Pencil } from "lucide-react";
import { useStocks } from "@/context/StocksContext";
import {
  FINANCIAL_YEAR_MONTHS,
  currentFinancialYear,
  currentFinancialMonth,
  generateFinancialYears,
} from "@/context/TaxContext";
import type { StockHolding, StockSnapshot } from "@/actions/stocks";

type Tab = "manual" | "xlsx" | "dividend";

// ─── XLSX Column Mapping ────────────────────────────────────────────────────
const COLUMN_MAP: Record<string, keyof StockHolding> = {
  "Security": "security",
  "Quantity": "quantity",
  "Cleared Balance": "clearedBalance",
  "Available Balance": "availableBalance",
  "Unsettled Buy": "unsettledBuy",
  "Unsettled Sell": "unsettledSell",
  "Holding % (Quantity)": "holdingPctQty",
  "Avg Price": "avgPrice",
  "B.E.S Price": "besPrice",
  "Total Cost": "totalCost",
  "Traded Price": "tradedPrice",
  "Market Value": "marketValue",
  "Holding % (Market Value)": "holdingPctValue",
  "Sales Commission": "salesCommission",
  "Sales Proceeds": "salesProceeds",
  "Unrealized Gain / (Loss)": "unrealizedGainLoss",
  "Unrealized Gain/Loss %": "unrealizedGainLossPct",
  "Unr Today Gain/(Loss)": "unrealizedTodayGainLoss",
};

function parseNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  let str = String(v).trim().replace(/,/g, "");
  if (str.startsWith("(") && str.endsWith(")")) {
    str = "-" + str.slice(1, -1);
  }
  const n = Number(str);
  return isNaN(n) ? 0 : n;
}

async function parseXlsx(file: File): Promise<StockHolding[]> {
  const { read, utils } = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const wb = read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  
  // Render sheet as 2D array to bypass header row issues (like titles before headers)
  const rawRows: any[][] = utils.sheet_to_json(ws, { header: 1 });

  let headerIndex = -1;
  let headerMap: Record<string, number> = {};

  // 1. Find the header row (look for "security", "instrument", or "symbol")
  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!Array.isArray(row)) continue;

    const secFoundIdx = row.findIndex((cell) => {
      if (!cell) return false;
      const str = String(cell).trim().toLowerCase();
      return str === "security" || str === "instrument" || str === "symbol";
    });

    if (secFoundIdx !== -1) {
      headerIndex = i;
      // Build normalized key to index array
      row.forEach((cell, idx) => {
        if (cell) {
          let str = String(cell).toLowerCase();
          if (str.includes("%")) str += "pct";
          const key = str.replace(/[^a-z0-9]/g, "");
          headerMap[key] = idx;
        }
      });
      break;
    }
  }

  if (headerIndex === -1) {
    throw new Error("Could not find a 'Security' or 'Instrument' column header in the file. Ensure the Excel file contains portfolio holdings.");
  }

  // 2. Map requested predefined columns to column indices
  const mappedIndices: Record<keyof StockHolding, number | undefined> = {} as any;
  for (const [colName, propName] of Object.entries(COLUMN_MAP)) {
    let str = colName.toLowerCase();
    if (str.includes("%")) str += "pct";
    const normalizedCol = str.replace(/[^a-z0-9]/g, "");
    
    if (headerMap[normalizedCol] !== undefined) {
      mappedIndices[propName] = headerMap[normalizedCol];
    } else if (propName === "security") {
      mappedIndices.security = headerMap["instrument"] ?? headerMap["symbol"];
    } else if (propName === "unrealizedGainLoss") {
      mappedIndices.unrealizedGainLoss = headerMap["unrealizedgainloss"] ?? headerMap["gainloss"];
    } else if (propName === "unrealizedGainLossPct") {
      mappedIndices.unrealizedGainLossPct = headerMap["unrealizedgainlosspct"] ?? headerMap["gainlosspct"];
    }
  }

  if (mappedIndices.security === undefined) {
    throw new Error("Could not resolve specific security column index.");
  }

  const secColIdx = mappedIndices.security;
  const holdings: StockHolding[] = [];

  // 3. Extract items
  for (let i = headerIndex + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!Array.isArray(row) || row.length === 0) continue;

    const secValue = String(row[secColIdx] ?? "").trim();
    if (secValue === "" || secValue.toLowerCase() === "total" || secValue.toLowerCase() === "grandtotal") {
      continue;
    }

    const holding: Partial<StockHolding> = {};
    for (const propName of Object.values(COLUMN_MAP)) {
      const idx = mappedIndices[propName];
      const cellValue = idx !== undefined ? row[idx] : undefined;
      
      if (propName === "security") {
        holding.security = secValue;
      } else {
        holding[propName] = parseNum(cellValue);
      }
    }
    
    holdings.push(holding as StockHolding);
  }

  return holdings;
}

function getDefaultSnapshotDates(financialYear: string, month: string): { startDate: string; endDate: string } {
  const [sYearStr, eYearStr] = financialYear.split("/");
  const startYear = parseInt(sYearStr, 10) || new Date().getFullYear();
  const endYear = parseInt(eYearStr, 10) || startYear + 1;
  const monthMap: Record<string, number> = {
    Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
    Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
  };
  const mNum = monthMap[month] || 4;
  const year = ["Jan", "Feb", "Mar"].includes(month) ? endYear : startYear;
  const mStr = String(mNum).padStart(2, "0");
  const lastDay = new Date(year, mNum, 0).getDate();
  const lastDayStr = String(lastDay).padStart(2, "0");
  return {
    startDate: `${year}-${mStr}-01`,
    endDate: `${year}-${mStr}-${lastDayStr}`,
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AddStockModal({ initialData, trigger }: { initialData?: StockSnapshot, trigger?: React.ReactNode }) {
  const { upsertSnapshot, addDividend } = useStocks();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>(initialData && initialData.holdings.length > 0 ? "xlsx" : "manual");

  const availableYears = generateFinancialYears(4);

  // Shared state
  const [fy, setFy] = useState(initialData?.financialYear || currentFinancialYear());
  const [month, setMonth] = useState<string>(initialData?.month || currentFinancialMonth());

  const initialDates = getDefaultSnapshotDates(
    initialData?.financialYear || currentFinancialYear(),
    initialData?.month || currentFinancialMonth()
  );
  const [startDate, setStartDate] = useState<string>(initialData?.startDate || initialDates.startDate);
  const [endDate, setEndDate] = useState<string>(initialData?.endDate || initialDates.endDate);

  // Dividend state
  const [dividendSecurity, setDividendSecurity] = useState("");
  const [dividendAmount, setDividendAmount] = useState("");

  // Manual form state
  const [totalCost, setTotalCost] = useState(initialData?.totalCost ? String(initialData.totalCost) : "");
  const [portfolioValue, setPortfolioValue] = useState(initialData?.portfolioValue ? String(initialData.portfolioValue) : "");
  const [cashAvailable, setCashAvailable] = useState(initialData?.cashAvailable ? String(initialData.cashAvailable) : "");
  const [moneyOut, setMoneyOut] = useState(initialData?.moneyOut ? String(initialData.moneyOut) : "");

  // XLSX state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [xlsxFile, setXlsxFile] = useState<File | null>(null);
  const [xlsxHoldings, setXlsxHoldings] = useState<StockHolding[]>(initialData?.holdings || []);
  const [xlsxTotalCost, setXlsxTotalCost] = useState(initialData?.totalCost ? String(initialData.totalCost) : "");
  const [xlsxCashAvailable, setXlsxCashAvailable] = useState(initialData?.cashAvailable ? String(initialData.cashAvailable) : "");
  const [xlsxMoneyOut, setXlsxMoneyOut] = useState(initialData?.moneyOut ? String(initialData.moneyOut) : "");
  const [xlsxStatus, setXlsxStatus] = useState<"idle" | "loading" | "success" | "error">(initialData && initialData.holdings.length > 0 ? "success" : "idle");
  const [xlsxError, setXlsxError] = useState("");

  React.useEffect(() => {
    if (isOpen && initialData) {
      setFy(initialData.financialYear);
      setMonth(initialData.month);
      const def = getDefaultSnapshotDates(initialData.financialYear, initialData.month);
      setStartDate(initialData.startDate || def.startDate);
      setEndDate(initialData.endDate || def.endDate);
      setTotalCost(String(initialData.totalCost));
      setPortfolioValue(String(initialData.portfolioValue));
      setCashAvailable(initialData.cashAvailable ? String(initialData.cashAvailable) : "");
      setMoneyOut(String(initialData.moneyOut));
      if (initialData.holdings.length > 0) {
        setXlsxHoldings(initialData.holdings);
        setXlsxTotalCost(String(initialData.totalCost));
        setXlsxCashAvailable(initialData.cashAvailable ? String(initialData.cashAvailable) : "");
        setXlsxMoneyOut(String(initialData.moneyOut));
        setXlsxStatus("success");
        setActiveTab("xlsx");
      } else {
        setActiveTab("manual");
      }
    }
  }, [isOpen, initialData]);

  const reset = () => {
    setActiveTab("manual");
    const currentFY = currentFinancialYear();
    const currentM = currentFinancialMonth();
    setFy(currentFY);
    setMonth(currentM);
    const def = getDefaultSnapshotDates(currentFY, currentM);
    setStartDate(def.startDate);
    setEndDate(def.endDate);
    setTotalCost("");
    setPortfolioValue("");
    setCashAvailable("");
    setMoneyOut("");
    setXlsxFile(null);
    setXlsxHoldings([]);
    setXlsxTotalCost("");
    setXlsxCashAvailable("");
    setXlsxMoneyOut("");
    setXlsxStatus("idle");
    setXlsxError("");
    setDividendSecurity("");
    setDividendAmount("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFyChange = (newFy: string) => {
    setFy(newFy);
    const def = getDefaultSnapshotDates(newFy, month);
    setStartDate(def.startDate);
    setEndDate(def.endDate);
  };

  const handleMonthChange = (newMonth: string) => {
    setMonth(newMonth);
    const def = getDefaultSnapshotDates(fy, newMonth);
    setStartDate(def.startDate);
    setEndDate(def.endDate);
  };

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setXlsxFile(file);
    setXlsxStatus("loading");
    setXlsxError("");
    try {
      const holdings = await parseXlsx(file);
      if (holdings.length === 0) throw new Error("No valid security rows found in file.");
      setXlsxHoldings(holdings);
      setXlsxStatus("success");
    } catch (err: any) {
      setXlsxStatus("error");
      setXlsxError(err?.message || "Failed to parse file.");
      setXlsxHoldings([]);
    }
  }, []);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totalCost || !portfolioValue) return;
    await upsertSnapshot({
      financialYear: fy,
      month,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      totalCost: Number(totalCost),
      portfolioValue: Number(portfolioValue),
      cashAvailable: cashAvailable ? Number(cashAvailable) : 0,
      moneyOut: Number(moneyOut) || 0,
      holdings: [],
    });
    reset();
    setIsOpen(false);
  };

  const handleXlsxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (xlsxHoldings.length === 0 || !xlsxTotalCost) return;
    const derivedPortfolioValue = xlsxHoldings.reduce((s, h) => s + h.marketValue, 0);
    await upsertSnapshot({
      financialYear: fy,
      month,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      totalCost: Number(xlsxTotalCost),
      portfolioValue: derivedPortfolioValue,
      cashAvailable: xlsxCashAvailable ? Number(xlsxCashAvailable) : 0,
      moneyOut: Number(xlsxMoneyOut) || 0,
      holdings: xlsxHoldings,
    });
    reset();
    setIsOpen(false);
  };

  const handleDividendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dividendSecurity || !dividendAmount) return;
    await addDividend({
      financialYear: fy,
      month,
      security: dividendSecurity,
      amount: Number(dividendAmount),
    });
    reset();
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) reset(); }}>
      {/* @ts-expect-error - local wrapper might not export asChild correctly */}
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Add / Import
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[520px] bg-card border-white/10 text-card-foreground">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Month-End Snapshot" : "Add Month-End Portfolio"}</DialogTitle>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex bg-background/50 p-1 rounded-xl border border-white/10 mt-1">
          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${
              activeTab === "manual"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            Manual Entry
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("xlsx")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${
              activeTab === "xlsx"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Upload XLSX
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("dividend")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${
              activeTab === "dividend"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            Dividend
          </button>
        </div>

        {/* ── Shared Month/FY selectors ── */}
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="stock-fy">Financial Year</Label>
            <Select value={fy} onValueChange={(v) => { if (v) handleFyChange(v); }}>
              <SelectTrigger id="stock-fy" className="bg-background/50 border-white/10">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock-month">Month</Label>
            <Select value={month} onValueChange={(v) => { if (v) handleMonthChange(v); }}>
              <SelectTrigger id="stock-month" className="bg-background/50 border-white/10">
                <SelectValue placeholder="Select Month" />
              </SelectTrigger>
              <SelectContent>
                {FINANCIAL_YEAR_MONTHS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Snapshot Period Date Range (Start Date - End Date) ── */}
        {activeTab !== "dividend" && (
          <div className="grid grid-cols-2 gap-4 mt-1 p-3 rounded-xl bg-background/40 border border-white/5">
            <div className="space-y-1.5">
              <Label htmlFor="stock-start-date" className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                <span>Start Date</span>
              </Label>
              <Input
                id="stock-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-background/80 border-white/10 text-white text-xs h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stock-end-date" className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                <span>End Date (As of)</span>
              </Label>
              <Input
                id="stock-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-background/80 border-white/10 text-white text-xs h-9"
              />
            </div>
          </div>
        )}

        {/* ── Manual Entry Form ── */}
        {activeTab === "manual" && (
          <form onSubmit={handleManualSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="stock-total-cost">Total Cost (LKR)</Label>
              <Input
                id="stock-total-cost"
                type="number"
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
                placeholder="Total amount invested"
                className="bg-background/50 border-white/10"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock-portfolio-value">Portfolio Value (LKR)</Label>
              <Input
                id="stock-portfolio-value"
                type="number"
                value={portfolioValue}
                onChange={(e) => setPortfolioValue(e.target.value)}
                placeholder="Current market value"
                className="bg-background/50 border-white/10"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock-cash-available">Cash Available (LKR)</Label>
              <Input
                id="stock-cash-available"
                type="number"
                value={cashAvailable}
                onChange={(e) => setCashAvailable(e.target.value)}
                placeholder="Cash in account"
                className="bg-background/50 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock-money-out">Money Out / Income (LKR)</Label>
              <Input
                id="stock-money-out"
                type="number"
                value={moneyOut}
                onChange={(e) => setMoneyOut(e.target.value)}
                placeholder="Cash withdrawn as income"
                className="bg-background/50 border-white/10"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="submit" className="w-full">Save Snapshot</Button>
            </DialogFooter>
          </form>
        )}

        {/* ── XLSX Upload Form ── */}
        {activeTab === "xlsx" && (
          <form onSubmit={handleXlsxSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Broker Export File (.xlsx)</Label>
              <div
                className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  xlsxStatus === "success"
                    ? "border-emerald-500/50 bg-emerald-500/5"
                    : xlsxStatus === "error"
                    ? "border-red-500/50 bg-red-500/5"
                    : "border-white/10 bg-background/30 hover:border-primary/50 hover:bg-primary/5"
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {xlsxStatus === "idle" && (
                  <>
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload broker XLSX export
                    </p>
                  </>
                )}
                {xlsxStatus === "loading" && (
                  <p className="text-sm text-muted-foreground animate-pulse">Parsing file…</p>
                )}
                {xlsxStatus === "success" && (
                  <>
                    <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-400 mb-2" />
                    <p className="text-sm font-semibold text-emerald-400">{xlsxFile?.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {xlsxHoldings.length} securities parsed
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Market Value: {xlsxHoldings.reduce((s, h) => s + h.marketValue, 0).toLocaleString()} LKR
                    </p>
                  </>
                )}
                {xlsxStatus === "error" && (
                  <>
                    <AlertCircle className="h-8 w-8 mx-auto text-red-400 mb-2" />
                    <p className="text-sm text-red-400">{xlsxError}</p>
                    <p className="text-xs text-muted-foreground mt-1">Click to try a different file</p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="xlsx-total-cost">Total Cost (LKR)</Label>
              <Input
                id="xlsx-total-cost"
                type="number"
                value={xlsxTotalCost}
                onChange={(e) => setXlsxTotalCost(e.target.value)}
                placeholder="Manually enter total amount invested"
                className="bg-background/50 border-white/10"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="xlsx-cash-available">Cash Available (LKR)</Label>
              <Input
                id="xlsx-cash-available"
                type="number"
                value={xlsxCashAvailable}
                onChange={(e) => setXlsxCashAvailable(e.target.value)}
                placeholder="Cash in account"
                className="bg-background/50 border-white/10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="xlsx-money-out">Money Out / Income (LKR)</Label>
              <Input
                id="xlsx-money-out"
                type="number"
                value={xlsxMoneyOut}
                onChange={(e) => setXlsxMoneyOut(e.target.value)}
                placeholder="Cash withdrawn as income (optional)"
                className="bg-background/50 border-white/10"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="submit" className="w-full" disabled={xlsxHoldings.length === 0}>
                Save Portfolio Snapshot
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* ── Dividend Entry Form ── */}
        {activeTab === "dividend" && (
          <form onSubmit={handleDividendSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="dividend-security">Security / Ticker</Label>
              <Input
                id="dividend-security"
                value={dividendSecurity}
                onChange={(e) => setDividendSecurity(e.target.value)}
                placeholder="e.g. SAMP, COMB"
                className="bg-background/50 border-white/10"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dividend-amount">Dividend Amount (LKR)</Label>
              <Input
                id="dividend-amount"
                type="number"
                value={dividendAmount}
                onChange={(e) => setDividendAmount(e.target.value)}
                placeholder="Total dividend received"
                className="bg-background/50 border-white/10"
                required
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="submit" className="w-full">Save Dividend</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
