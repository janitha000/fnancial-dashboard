import React, { useMemo, useState } from "react";
import { useStocks } from "@/context/StocksContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowUpDown } from "lucide-react";
import { AddRealizedGainModal } from "./AddRealizedGainModal";
import { AddDividendGainModal } from "./AddDividendGainModal";

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

const getPctColorClass = (pct: number, isSubRow = false) => {
  if (pct < 0) return isSubRow ? "text-red-500/80" : "text-red-400";
  if (pct <= 2) return isSubRow ? "text-gray-400/80" : "text-gray-400";
  if (pct <= 4) return isSubRow ? "text-yellow-500/80" : "text-yellow-400";
  if (pct <= 6) return isSubRow ? "text-orange-500/80" : "text-orange-400";
  return isSubRow ? "text-emerald-500/80" : "text-emerald-400";
};

type SortKey = "stock" | "buyDate" | "sellDate" | "absoluteGain" | "returnPct" | "annualPct";
type SortConfig = {
  key: SortKey;
  direction: "asc" | "desc";
} | null;

type DivSortKey = "stock" | "dividendReceivedDate" | "dividendAmount" | "yieldPct" | "annualYieldPct";
type DivSortConfig = {
  key: DivSortKey;
  direction: "asc" | "desc";
} | null;

export function RealizedGainsDashboard() {
  const { realizedGains, deleteRealizedGain, dividendGains, deleteDividendGain } = useStocks();
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [divSortConfig, setDivSortConfig] = useState<DivSortConfig>(null);

  const mappedGains = useMemo(() => {
    return realizedGains.map(gain => {
      // Calculate prorated buy cost if quantity sold != quantity bought
      const buyPricePerShare = gain.buyAmount / gain.buyQuantity;
      const proratedBuyCost = buyPricePerShare * gain.sellQuantity;
      
      const absoluteGain = gain.sellAmount - proratedBuyCost;
      const returnPct = proratedBuyCost > 0 ? (absoluteGain / proratedBuyCost) * 100 : 0;
      
      const bDate = new Date(gain.buyDate).getTime();
      const sDate = new Date(gain.sellDate).getTime();
      const rawDays = (sDate - bDate) / (1000 * 60 * 60 * 24);
      const daysHeld = Math.max(1, rawDays); // Treat same-day as 1 day minimum
      const yearsHeld = daysHeld / 365.25;
      
      const annualPct = yearsHeld > 0 ? returnPct / yearsHeld : 0;

      return {
        ...gain,
        proratedBuyCost,
        absoluteGain,
        returnPct,
        annualPct,
        daysHeld,
      };
    });
  }, [realizedGains]);

  const sortedGains = useMemo(() => {
    let sortable = [...mappedGains];
    if (sortConfig !== null) {
      sortable.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    } else {
      // Default sort by sell date desc
      sortable.sort((a, b) => new Date(b.sellDate).getTime() - new Date(a.sellDate).getTime());
    }
    return sortable;
  }, [mappedGains, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: "asc" | "desc" = "desc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "desc") {
      direction = "asc";
    }
    setSortConfig({ key, direction });
  };

  const totals = useMemo(() => {
    let totalGain = 0;
    let totalProratedCost = 0;
    let totalDollarYears = 0;

    mappedGains.forEach(g => {
      totalGain += g.absoluteGain;
      totalProratedCost += g.proratedBuyCost;
      totalDollarYears += g.proratedBuyCost * (g.daysHeld / 365.25);
    });

    const avgReturn = totalProratedCost > 0 ? (totalGain / totalProratedCost) * 100 : 0;
    const avgAnnualReturn = totalDollarYears > 0 ? (totalGain / totalDollarYears) * 100 : 0;

    return { totalGain, avgReturn, totalProratedCost, avgAnnualReturn };
  }, [mappedGains]);

  const mappedDivGains = useMemo(() => {
    return dividendGains.map(gain => {
      const yieldPct = gain.totalAmount > 0 ? (gain.dividendAmount / gain.totalAmount) * 100 : 0;
      return {
        ...gain,
        yieldPct,
      };
    });
  }, [dividendGains]);

  const groupedDivGains = useMemo(() => {
    const groups: Record<string, { stock: string; gains: typeof mappedDivGains; totalDividend: number; latestInvested: number; aggregatedYield: number; aggregatedAnnualYield: number }> = {};
    
    mappedDivGains.forEach(g => {
      const stockKey = g.stock.toUpperCase();
      if (!groups[stockKey]) {
        groups[stockKey] = {
          stock: stockKey,
          gains: [],
          totalDividend: 0,
          latestInvested: 0,
          aggregatedYield: 0,
          aggregatedAnnualYield: 0,
        };
      }
      groups[stockKey].gains.push(g);
    });

    Object.values(groups).forEach(group => {
      // Sort individual gains by date desc
      group.gains.sort((a, b) => new Date(b.dividendReceivedDate).getTime() - new Date(a.dividendReceivedDate).getTime());
      
      group.latestInvested = Math.max(...group.gains.map(g => g.totalAmount));
      group.totalDividend = group.gains.reduce((sum, g) => sum + g.dividendAmount, 0);
      group.aggregatedYield = group.latestInvested > 0 ? (group.totalDividend / group.latestInvested) * 100 : 0;
      
      const yearMap: Record<number, { maxInvested: number }> = {};
      group.gains.forEach(g => {
        const year = new Date(g.dividendReceivedDate).getFullYear();
        if (!yearMap[year]) {
          yearMap[year] = { maxInvested: 0 };
        }
        yearMap[year].maxInvested = Math.max(yearMap[year].maxInvested, g.totalAmount);
      });

      let totalDollarYears = 0;
      Object.values(yearMap).forEach(y => {
        totalDollarYears += y.maxInvested;
      });
      group.aggregatedAnnualYield = totalDollarYears > 0 ? (group.totalDividend / totalDollarYears) * 100 : 0;
    });

    let sortable = Object.values(groups);
    if (divSortConfig !== null) {
      sortable.sort((a, b) => {
        let valA: any = (a as any)[divSortConfig.key];
        let valB: any = (b as any)[divSortConfig.key];
        
        if (divSortConfig.key === "dividendAmount") { valA = a.totalDividend; valB = b.totalDividend; }
        if (divSortConfig.key === "yieldPct") { valA = a.aggregatedYield; valB = b.aggregatedYield; }
        if (divSortConfig.key === "annualYieldPct") { valA = a.aggregatedAnnualYield; valB = b.aggregatedAnnualYield; }
        if (divSortConfig.key === "dividendReceivedDate") {
          valA = new Date(a.gains[0].dividendReceivedDate).getTime();
          valB = new Date(b.gains[0].dividendReceivedDate).getTime();
        }

        if (valA < valB) return divSortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return divSortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    } else {
      sortable.sort((a, b) => new Date(b.gains[0].dividendReceivedDate).getTime() - new Date(a.gains[0].dividendReceivedDate).getTime());
    }

    return sortable;
  }, [mappedDivGains, divSortConfig]);

  const requestDivSort = (key: DivSortKey) => {
    let direction: "asc" | "desc" = "desc";
    if (divSortConfig && divSortConfig.key === key && divSortConfig.direction === "desc") {
      direction = "asc";
    }
    setDivSortConfig({ key, direction });
  };

  const divTotals = useMemo(() => {
    let totalDividend = 0;
    let totalInvested = 0;
    let totalDollarYears = 0;

    const stockMaxInvested: Record<string, number> = {};
    const stockYearMap: Record<string, Record<number, { maxInvested: number }>> = {};

    mappedDivGains.forEach(g => {
      totalDividend += g.dividendAmount;
      
      const stock = g.stock.toUpperCase();
      if (!stockMaxInvested[stock]) stockMaxInvested[stock] = 0;
      stockMaxInvested[stock] = Math.max(stockMaxInvested[stock], g.totalAmount);
      
      const year = new Date(g.dividendReceivedDate).getFullYear();
      if (!stockYearMap[stock]) stockYearMap[stock] = {};
      if (!stockYearMap[stock][year]) stockYearMap[stock][year] = { maxInvested: 0 };
      stockYearMap[stock][year].maxInvested = Math.max(stockYearMap[stock][year].maxInvested, g.totalAmount);
    });

    totalInvested = Object.values(stockMaxInvested).reduce((sum, val) => sum + val, 0);
    
    Object.values(stockYearMap).forEach(years => {
      Object.values(years).forEach(y => {
        totalDollarYears += y.maxInvested;
      });
    });

    const avgYieldPct = totalInvested > 0 ? (totalDividend / totalInvested) * 100 : 0;
    const avgAnnualYieldPct = totalDollarYears > 0 ? (totalDividend / totalDollarYears) * 100 : 0;

    return { avgYieldPct, avgAnnualYieldPct, totalDividend, totalInvested };
  }, [mappedDivGains]);

  return (
    <div className="space-y-6 mt-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black">Realized Gains Ledger</h2>
        <AddRealizedGainModal />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-white/10">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-1">Total Cost (Invested)</p>
            <p className="text-3xl font-black text-white">
              {fmt(totals.totalProratedCost)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-white/10">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-1">Total Realized Gain</p>
            <p className={`text-3xl font-black ${totals.totalGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {fmt(totals.totalGain)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-white/10">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-1">Average Return</p>
            <p className={`text-3xl font-black ${getPctColorClass(totals.avgReturn)}`}>
              {fmtPct(totals.avgReturn)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-white/10">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-1">Avg Annual Return</p>
            <p className={`text-3xl font-black ${getPctColorClass(totals.avgAnnualReturn)}`}>
              {fmtPct(totals.avgAnnualReturn)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/10 bg-black/20">
        <CardHeader>
          <CardTitle>Closed Trades History</CardTitle>
          <CardDescription>A chronological record of your realized profits and losses.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-auto max-h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer hover:text-white" onClick={() => requestSort("stock")}>
                  Stock <ArrowUpDown className="inline w-3 h-3 ml-1 opacity-50" />
                </TableHead>
                <TableHead className="cursor-pointer hover:text-white" onClick={() => requestSort("buyDate")}>
                  Buy Date <ArrowUpDown className="inline w-3 h-3 ml-1 opacity-50" />
                </TableHead>
                <TableHead className="text-right">Buy Qty / Val</TableHead>
                <TableHead className="cursor-pointer hover:text-white" onClick={() => requestSort("sellDate")}>
                  Sell Date <ArrowUpDown className="inline w-3 h-3 ml-1 opacity-50" />
                </TableHead>
                <TableHead className="text-right">Sell Qty / Val</TableHead>
                <TableHead className="text-right cursor-pointer hover:text-white" onClick={() => requestSort("absoluteGain")}>
                  Gain/Loss <ArrowUpDown className="inline w-3 h-3 ml-1 opacity-50" />
                </TableHead>
                <TableHead className="text-right cursor-pointer hover:text-white" onClick={() => requestSort("returnPct")}>
                  Return % <ArrowUpDown className="inline w-3 h-3 ml-1 opacity-50" />
                </TableHead>
                <TableHead className="text-right cursor-pointer hover:text-white" onClick={() => requestSort("annualPct")}>
                  Annual % <ArrowUpDown className="inline w-3 h-3 ml-1 opacity-50" />
                </TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedGains.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-bold">{g.stock}</TableCell>
                  <TableCell>{g.buyDate}</TableCell>
                  <TableCell className="text-right">
                    <p className="font-mono text-xs">{g.buyQuantity} sh</p>
                    <p className="font-mono text-muted-foreground">{fmt(g.buyAmount)}</p>
                  </TableCell>
                  <TableCell>{g.sellDate}</TableCell>
                  <TableCell className="text-right">
                    <p className="font-mono text-xs">{g.sellQuantity} sh</p>
                    <p className="font-mono text-muted-foreground">{fmt(g.sellAmount)}</p>
                  </TableCell>
                  <TableCell className={`text-right font-mono font-bold ${g.absoluteGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {fmt(g.absoluteGain)}
                  </TableCell>
                  <TableCell className={`text-right font-mono font-bold ${getPctColorClass(g.returnPct)}`}>
                    {fmtPct(g.returnPct)}
                  </TableCell>
                  <TableCell className={`text-right font-mono font-bold ${getPctColorClass(g.annualPct)}`}>
                    {fmtPct(g.annualPct)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (confirm("Delete this realized gain record?")) {
                          deleteRealizedGain(g.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {sortedGains.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8 italic">
                    No realized gains recorded yet.
                  </TableCell>
                </TableRow>
              )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* DIVIDEND GAINS SECTION */}
        <div className="pt-8 border-t border-white/10 mt-8 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black">Dividend Gains Ledger</h2>
            <AddDividendGainModal />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-white/10">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-1">Total Cost (Invested)</p>
                <p className="text-3xl font-black text-white">
                  {fmt(divTotals.totalInvested)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-white/10">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-1">Total Dividend</p>
                <p className={`text-3xl font-black ${divTotals.totalDividend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {fmt(divTotals.totalDividend)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-white/10">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-1">Average Yield</p>
                <p className={`text-3xl font-black ${getPctColorClass(divTotals.avgYieldPct)}`}>
                  {fmtPct(divTotals.avgYieldPct)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-white/10">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-1">Avg Annual Yield</p>
                <p className={`text-3xl font-black ${getPctColorClass(divTotals.avgAnnualYieldPct)}`}>
                  {fmtPct(divTotals.avgAnnualYieldPct)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-white/10 bg-black/20">
            <CardHeader>
              <CardTitle>Dividend History</CardTitle>
              <CardDescription>A record of dividends received and their yields.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer hover:text-white" onClick={() => requestDivSort("stock")}>
                      Stock <ArrowUpDown className="inline w-3 h-3 ml-1 opacity-50" />
                    </TableHead>
                    <TableHead className="cursor-pointer hover:text-white" onClick={() => requestDivSort("dividendReceivedDate")}>
                      Received Date <ArrowUpDown className="inline w-3 h-3 ml-1 opacity-50" />
                    </TableHead>
                    <TableHead className="text-right">Total Invested</TableHead>
                    <TableHead className="text-right cursor-pointer hover:text-white" onClick={() => requestDivSort("dividendAmount")}>
                      Dividend <ArrowUpDown className="inline w-3 h-3 ml-1 opacity-50" />
                    </TableHead>
                    <TableHead className="text-right cursor-pointer hover:text-white" onClick={() => requestDivSort("yieldPct")}>
                      Yield % <ArrowUpDown className="inline w-3 h-3 ml-1 opacity-50" />
                    </TableHead>
                    <TableHead className="text-right cursor-pointer hover:text-white" onClick={() => requestDivSort("annualYieldPct")}>
                      Annual Yield % <ArrowUpDown className="inline w-3 h-3 ml-1 opacity-50" />
                    </TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedDivGains.map((group) => (
                    <React.Fragment key={group.stock}>
                      {group.gains.length === 1 ? (
                        <TableRow className="opacity-100 hover:bg-white/10 border-b border-white/5">
                          <TableCell className="font-bold text-lg">{group.stock}</TableCell>
                          <TableCell>{group.gains[0].dividendReceivedDate}</TableCell>
                          <TableCell className="text-right font-mono text-white">{fmt(group.gains[0].totalAmount)}</TableCell>
                          <TableCell className="text-right font-mono font-black text-indigo-400">{fmt(group.gains[0].dividendAmount)}</TableCell>
                          <TableCell className={`text-right font-mono ${getPctColorClass(group.gains[0].yieldPct)}`}>{fmtPct(group.gains[0].yieldPct)}</TableCell>
                          <TableCell className={`text-right font-mono ${getPctColorClass(group.aggregatedAnnualYield)}`}>{fmtPct(group.aggregatedAnnualYield)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                if (confirm("Delete this dividend gain record?")) {
                                  deleteDividendGain(group.gains[0].id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          <TableRow className="bg-white/10 font-bold hover:bg-white/20 border-b-2 border-black/50">
                            <TableCell className="text-lg">{group.stock}</TableCell>
                            <TableCell className="text-muted-foreground text-xs">{group.gains.length} payout(s)</TableCell>
                            <TableCell className="text-right font-mono text-white">{fmt(group.latestInvested)}</TableCell>
                            <TableCell className="text-right font-mono font-black text-indigo-400">{fmt(group.totalDividend)}</TableCell>
                            <TableCell className={`text-right font-mono ${getPctColorClass(group.aggregatedYield)}`}>
                              {fmtPct(group.aggregatedYield)}
                            </TableCell>
                            <TableCell className={`text-right font-mono ${getPctColorClass(group.aggregatedAnnualYield)}`}>
                              {fmtPct(group.aggregatedAnnualYield)}
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                          
                          {group.gains.map(g => (
                            <TableRow key={g.id} className="opacity-75 hover:opacity-100 border-b border-white/5">
                              <TableCell className="pl-6 text-muted-foreground">↳</TableCell>
                              <TableCell>{g.dividendReceivedDate}</TableCell>
                              <TableCell className="text-right font-mono text-muted-foreground">{fmt(g.totalAmount)}</TableCell>
                              <TableCell className="text-right font-mono">{fmt(g.dividendAmount)}</TableCell>
                              <TableCell className={`text-right font-mono ${getPctColorClass(g.yieldPct, true)}`}>{fmtPct(g.yieldPct)}</TableCell>
                              <TableCell></TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                  onClick={() => {
                                    if (confirm("Delete this dividend gain record?")) {
                                      deleteDividendGain(g.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      )}
                    </React.Fragment>
                  ))}
                  {groupedDivGains.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8 italic">
                        No dividend gains recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
  );
}
