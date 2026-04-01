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
import { PlusCircle, Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { useStocks } from "@/context/StocksContext";
import {
  FINANCIAL_YEAR_MONTHS,
  currentFinancialYear,
  currentFinancialMonth,
  generateFinancialYears,
} from "@/context/TaxContext";
import type { StockHolding } from "@/actions/stocks";

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

// ─── Component ──────────────────────────────────────────────────────────────

export function AddStockModal() {
  const { upsertSnapshot, addDividend } = useStocks();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("manual");

  const availableYears = generateFinancialYears(4);

  // Shared state
  const [fy, setFy] = useState(currentFinancialYear());
  const [month, setMonth] = useState<string>(currentFinancialMonth());

  // Dividend state
  const [dividendSecurity, setDividendSecurity] = useState("");
  const [dividendAmount, setDividendAmount] = useState("");

  // Manual form state
  const [totalCost, setTotalCost] = useState("");
  const [portfolioValue, setPortfolioValue] = useState("");
  const [moneyOut, setMoneyOut] = useState("");

  // XLSX state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [xlsxFile, setXlsxFile] = useState<File | null>(null);
  const [xlsxHoldings, setXlsxHoldings] = useState<StockHolding[]>([]);
  const [xlsxTotalCost, setXlsxTotalCost] = useState("");
  const [xlsxMoneyOut, setXlsxMoneyOut] = useState("");
  const [xlsxStatus, setXlsxStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [xlsxError, setXlsxError] = useState("");

  const reset = () => {
    setActiveTab("manual");
    setFy(currentFinancialYear());
    setMonth(currentFinancialMonth());
    setTotalCost("");
    setPortfolioValue("");
    setMoneyOut("");
    setXlsxFile(null);
    setXlsxHoldings([]);
    setXlsxTotalCost("");
    setXlsxMoneyOut("");
    setXlsxStatus("idle");
    setXlsxError("");
    setDividendSecurity("");
    setDividendAmount("");
    if (fileInputRef.current) fileInputRef.current.value = "";
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
      totalCost: Number(totalCost),
      portfolioValue: Number(portfolioValue),
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
      totalCost: Number(xlsxTotalCost),
      portfolioValue: derivedPortfolioValue,
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
      <DialogTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 gap-2">
        <PlusCircle className="h-4 w-4" />
        Add / Import
      </DialogTrigger>

      <DialogContent className="sm:max-w-[520px] bg-card border-white/10 text-card-foreground">
        <DialogHeader>
          <DialogTitle>Add Month-End Portfolio</DialogTitle>
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
            <Select value={fy} onValueChange={(v) => { if (v) setFy(v); }}>
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
            <Select value={month} onValueChange={(v) => { if (v) setMonth(v); }}>
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
