"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useStocks } from "@/context/StocksContext";
import { AddTransactionModal } from "./AddTransactionModal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, TrendingUp, TrendingDown, DollarSign, Activity } from "lucide-react";
import { currentFinancialYear } from "@/context/TaxContext";

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

export function StockwiseDashboard() {
  const { transactions, deleteTransaction } = useStocks();
  
  const codeStats = useMemo(() => {
    const codesMap = new Map<string, { qty: number, cost: number }>();
    
    // Sort chronologically for accurate avg cost
    const sortedTx = [...transactions].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    sortedTx.forEach(t => {
      if (!codesMap.has(t.code)) {
        codesMap.set(t.code, { qty: 0, cost: 0 });
      }
      const state = codesMap.get(t.code)!;
      if (t.type === "BUY") {
        state.qty += t.quantity;
        state.cost += t.totalCost;
      } else if (t.type === "SELL") {
        const avg = state.qty > 0 ? state.cost / state.qty : 0;
        state.cost -= avg * t.quantity;
        state.qty -= t.quantity;
      }
    });
    return codesMap;
  }, [transactions]);

  const allCodes = useMemo(() => {
    return Array.from(codeStats.entries())
      .sort((a, b) => b[1].cost - a[1].cost)
      .map(entry => entry[0]);
  }, [codeStats]);

  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  // Remove auto-select to default to Overview

  const selectedTransactions = useMemo(() => {
    if (!selectedCode) return [];
    return transactions
      .filter((t) => t.code === selectedCode)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions, selectedCode]);

  // Derived metrics
  const metrics = useMemo(() => {
    let holdingQty = 0;
    let totalBuy = 0;
    let totalSell = 0;
    let yearlyRealizedPnL = 0;

    const currentYear = new Date().getFullYear();
    let firstBuyDate: string | null = null;

    selectedTransactions.forEach((t) => {
      if (t.type === "BUY") {
        holdingQty += t.quantity;
        totalBuy += t.totalCost;
        if (!firstBuyDate || new Date(t.date) < new Date(firstBuyDate)) {
          firstBuyDate = t.date;
        }
      } else if (t.type === "SELL") {
        totalSell += t.totalCost;
        holdingQty -= t.quantity;
      }
      
      // Basic year check, though logic is simple cashflow difference.
      if (new Date(t.date).getFullYear() === currentYear) {
        if (t.type === "BUY") yearlyRealizedPnL -= t.totalCost;
        if (t.type === "SELL") yearlyRealizedPnL += t.totalCost;
      }
    });

    let yearsHeld = 0;
    if (firstBuyDate) {
      const ms = Date.now() - new Date(firstBuyDate).getTime();
      yearsHeld = ms / (1000 * 60 * 60 * 24 * 365.25);
    }

    const realizedPnL = totalSell === 0 ? 0 : totalSell - totalBuy;
    const avgCost = holdingQty > 0 ? totalBuy / (selectedTransactions.filter(t => t.type === "BUY").reduce((s,t) => s+t.quantity, 0)) : 0; // fallback avg cost for display, although we will only show total cashflow

    return { holdingQty, totalBuy, totalSell, realizedPnL, yearlyRealizedPnL, avgCost, yearsHeld };
  }, [selectedTransactions]);

  const [allPrices, setAllPrices] = useState<Record<string, { price: number | null, changePercent: number | null }>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);

  const allCodesStr = allCodes.join(',');

  useEffect(() => {
    if (allCodes.length === 0) return;
    let isMounted = true;
    
    async function fetchAllPrices() {
      setLoadingPrices(true);
      try {
        const res = await fetch("/api/stocks/price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbols: allCodes }),
        });
        const data = await res.json();
        if (isMounted && data.prices) {
          setAllPrices(data.prices);
        }
      } catch (err) {
        console.error("Failed to fetch prices", err);
      } finally {
        if (isMounted) setLoadingPrices(false);
      }
    }
    fetchAllPrices();
    return () => { isMounted = false; };
  }, [allCodesStr]); // using stringified to avoid infinite re-renders

  const currentPrice = selectedCode ? allPrices[selectedCode]?.price ?? null : null;
  const loadingPrice = loadingPrices;

  // Overview metrics
  const topStocks = useMemo(() => {
    const list: { code: string, returnPct: number, cost: number, value: number }[] = [];
    codeStats.forEach((stat, code) => {
      const price = allPrices[code]?.price;
      if (price !== undefined && price !== null && stat.qty > 0 && stat.cost > 0) {
        const value = price * stat.qty;
        const returnPct = ((value - stat.cost) / stat.cost) * 100;
        if (returnPct > 10) {
          list.push({ code, returnPct, cost: stat.cost, value });
        }
      }
    });
    return list.sort((a,b) => b.returnPct - a.returnPct);
  }, [codeStats, allPrices]);

  const topTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (t.type !== 'BUY') return false;
      const stat = codeStats.get(t.code);
      if (!stat || stat.qty <= 0) return false;
      return true;
    }).map(t => {
      const price = allPrices[t.code]?.price;
      const returnPct = price !== undefined && price !== null && t.price > 0 
        ? ((price - t.price) / t.price) * 100 
        : 0;
      return { ...t, returnPct, currentPrice: price };
    }).filter(t => t.returnPct > 20).sort((a,b) => b.returnPct - a.returnPct);
  }, [transactions, allPrices, codeStats]);

  const unrealizedPnL = metrics.holdingQty <= 0 
    ? 0 
    : currentPrice !== null 
      ? (currentPrice * metrics.holdingQty) - (metrics.avgCost * metrics.holdingQty)
      : 0;

  const netPnL = metrics.realizedPnL + unrealizedPnL;
  const totalCostAvailable = metrics.avgCost * metrics.holdingQty;
  const totalValue = currentPrice !== null ? currentPrice * metrics.holdingQty : 0;
  
  const returnPctVsCost = totalCostAvailable > 0 ? (unrealizedPnL / totalCostAvailable) * 100 : 0;
  const annualizedReturnPct = metrics.yearsHeld > 0 ? returnPctVsCost / metrics.yearsHeld : 0;

  const showCmpCol = metrics.holdingQty > 0 && currentPrice !== null;

  return (
    <div className="flex flex-col lg:flex-row gap-6 mt-6">
      {/* LEFT: Pills */}
      <div className="w-full lg:w-64 flex-shrink-0 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Invested Stocks</h3>
        </div>
        <div className="flex flex-row lg:flex-col gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCode(null)}
            className={`px-4 py-3 rounded-xl text-sm font-bold transition-all text-left border ${
              selectedCode === null
                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105"
                : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
            }`}
          >
            Overview
          </button>
          {allCodes.length === 0 && (
            <p className="text-muted-foreground text-sm italic">No stocks added yet.</p>
          )}
          {allCodes.map((code) => (
            <button
              key={code}
              onClick={() => setSelectedCode(code)}
              className={`px-4 py-3 rounded-xl text-sm font-bold transition-all text-left border ${
                selectedCode === code
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105"
                  : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
              }`}
            >
              {code}
            </button>
          ))}
        </div>
        <div className="pt-4">
          <AddTransactionModal />
        </div>
      </div>

      {/* RIGHT: Dashboard */}
      <div className="flex-1 space-y-6">
        {!selectedCode ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-black">Portfolio Overview</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-white/10 bg-black/20">
                <CardHeader>
                  <CardTitle className="text-emerald-400">Top Performing Stocks (&gt;10% Return)</CardTitle>
                  <CardDescription>Currently held stocks exceeding 10% unrealized gain</CardDescription>
                </CardHeader>
                <CardContent>
                  {topStocks.length > 0 ? (
                    <div className="space-y-4">
                      {topStocks.map(s => (
                        <div key={s.code} className="flex justify-between items-center border-b border-white/5 pb-2">
                          <div>
                            <p className="font-bold">{s.code}</p>
                            <p className="text-xs text-muted-foreground">Cost: {fmt(s.cost)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-emerald-400">{fmtPct(s.returnPct)}</p>
                            <p className="text-xs text-muted-foreground">Val: {fmt(s.value)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm italic">No stocks currently exceeding 10% return.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-black/20">
                <CardHeader>
                  <CardTitle className="text-emerald-400">Top Transactions (&gt;20% Return)</CardTitle>
                  <CardDescription>Individual BUY transactions exceeding 20% gain vs CMP</CardDescription>
                </CardHeader>
                <CardContent>
                  {topTransactions.length > 0 ? (
                    <div className="space-y-4">
                      {topTransactions.map(t => (
                        <div key={t.id} className="flex justify-between items-center border-b border-white/5 pb-2">
                          <div>
                            <p className="font-bold">{t.code}</p>
                            <p className="text-xs text-muted-foreground">{t.date} &bull; Qty: {t.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-emerald-400">{fmtPct(t.returnPct)}</p>
                            <p className="text-xs text-muted-foreground">Bought at {fmt(t.price)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm italic">No individual transactions exceeding 20% return.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border-white/10">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground mb-1">Current Holding</p>
                  <p className="text-2xl font-black">{metrics.holdingQty} <span className="text-sm font-normal text-muted-foreground">shares</span></p>
                  <p className="text-xs text-muted-foreground mt-2">Avg Cost: {fmt(metrics.avgCost)}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-slate-500/10 to-gray-500/10 border-white/10">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground mb-1">Total Cost (Available)</p>
                  <p className="text-2xl font-black">{fmt(totalCostAvailable)}</p>
                  <p className="text-xs text-muted-foreground mt-2">Invested in current holding</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-cyan-500/10 to-sky-500/10 border-white/10">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground mb-1">Total Value (CMP)</p>
                  <p className="text-2xl font-black">{fmt(totalValue)}</p>
                  <p className="text-xs text-muted-foreground mt-2">Market value of holding</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-white/10">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground mb-1">Current Profit (Unrealized)</p>
                  {loadingPrice ? (
                    <p className="text-2xl font-black text-muted-foreground animate-pulse">Loading...</p>
                  ) : currentPrice !== null ? (
                    <>
                      <p className={`text-2xl font-black ${unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {fmt(unrealizedPnL)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">CMP: {fmt(currentPrice)}</p>
                    </>
                  ) : (
                    <p className="text-2xl font-black text-muted-foreground">N/A</p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-white/10">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground mb-1">Profit Taken (Realized)</p>
                  <p className={`text-2xl font-black ${metrics.realizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {fmt(metrics.realizedPnL)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">Yearly Realized: {fmt(metrics.yearlyRealizedPnL)}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border-white/10">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground mb-1">Net P&L</p>
                  <p className={`text-2xl font-black ${netPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {fmt(netPnL)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">Realized + Unrealized</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 border-white/10">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground mb-1">Return % (vs Cost)</p>
                  <p className={`text-2xl font-black ${returnPctVsCost >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {fmtPct(returnPctVsCost)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {metrics.yearsHeld > 0 ? `${fmtPct(annualizedReturnPct)} / yr` : 'Overall & Annualized'}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-white/10 bg-black/20">
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>All BUY and SELL records for {selectedCode}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total Cost / Proceeds</TableHead>
                      {showCmpCol && (
                        <>
                          <TableHead className="text-right">vs CMP (Val)</TableHead>
                          <TableHead className="text-right">vs CMP %</TableHead>
                        </>
                      )}
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...selectedTransactions].reverse().map((t) => {
                      const vsCmpPct = currentPrice !== null && t.price > 0 
                        ? ((currentPrice - t.price) / t.price) * 100 
                        : null;
                      const vsCmpVal = currentPrice !== null
                        ? t.type === 'BUY'
                          ? (currentPrice * t.quantity) - t.totalCost
                          : t.totalCost - (currentPrice * t.quantity)
                        : null;
                      
                      return (
                        <TableRow key={t.id}>
                          <TableCell>{t.date}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${t.type === 'BUY' ? 'bg-blue-500/20 text-blue-400' : 'bg-rose-500/20 text-rose-400'}`}>
                              {t.type}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono">{t.quantity}</TableCell>
                          <TableCell className="text-right font-mono">{fmt(t.price)}</TableCell>
                          <TableCell className="text-right font-mono font-bold">
                            {fmt(t.totalCost)}
                          </TableCell>
                          {showCmpCol && (
                            <>
                              <TableCell className={`text-right font-mono font-bold ${vsCmpVal !== null && vsCmpVal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {vsCmpVal !== null ? fmt(vsCmpVal) : "—"}
                              </TableCell>
                              <TableCell className={`text-right font-mono font-bold ${vsCmpPct !== null && vsCmpPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {vsCmpPct !== null ? fmtPct(vsCmpPct) : "—"}
                              </TableCell>
                            </>
                          )}
                          <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              if (confirm("Delete this transaction?")) {
                                deleteTransaction(t.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );})}
                    {selectedTransactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={showCmpCol ? 8 : 6} className="text-center text-muted-foreground py-8">
                          No transactions recorded.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
