"use client";

import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  BarChart2,
  Sparkles,
  Layers,
  Percent,
} from "lucide-react";
import { useStocks } from "@/context/StocksContext";
import { FINANCIAL_YEAR_MONTHS } from "@/context/TaxContext";
import type { StockSnapshot } from "@/actions/stocks";

interface MonthlyPortfolioGrowthChartProps {
  mode: "fy" | "full";
  selectedFY?: string;
}

export function MonthlyPortfolioGrowthChart({
  mode,
  selectedFY = "2026/2027",
}: MonthlyPortfolioGrowthChartProps) {
  const { snapshots, dailyPoints, capitalTransactions, monthlyBaseCosts } = useStocks();
  const [activeView, setActiveView] = useState<
    "growth_rs" | "growth_pct" | "dual" | "growth_vs_flow" | "cumulative"
  >("dual");

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

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtDec = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

  // Sorted snapshots
  const chronoSortedSnapshots = useMemo(() => {
    return [...snapshots]
      .map((s) => ({
        ...s,
        yearMonth: getCalendarYearMonth(s.financialYear, s.month),
      }))
      .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
  }, [snapshots]);

  // Sorted daily points
  const sortedPoints = useMemo(() => {
    return [...dailyPoints].sort((a, b) => a.date.localeCompare(b.date));
  }, [dailyPoints]);

  // Helper to get total cost of holdings from snapshot
  const getSnapshotHoldingsCost = (s: StockSnapshot): number => {
    if (s.holdings && s.holdings.length > 0) {
      const sumHoldings = s.holdings.reduce((sum, h) => sum + (h.totalCost || 0), 0);
      if (sumHoldings > 0) return sumHoldings;
    }
    return s.totalCost || 0;
  };

  // Build monthly growth timeline data
  const growthData = useMemo(() => {
    // 1. Determine list of months to include based on mode
    let targetMonths: { month: string; financialYear: string; yearMonth: string; label: string }[] = [];

    if (mode === "fy") {
      targetMonths = FINANCIAL_YEAR_MONTHS.map((m) => {
        const ym = getCalendarYearMonth(selectedFY, m);
        return {
          month: m,
          financialYear: selectedFY,
          yearMonth: ym,
          label: m,
        };
      });
    } else {
      // Full view: gather all months from snapshots, daily points, and capital transactions
      const yearMonthSet = new Set<string>();

      chronoSortedSnapshots.forEach((s) => yearMonthSet.add(s.yearMonth));
      sortedPoints.forEach((p) => yearMonthSet.add(p.date.slice(0, 7)));
      capitalTransactions.forEach((tx) => yearMonthSet.add(tx.date.slice(0, 7)));

      const sortedYMs = Array.from(yearMonthSet).sort();

      targetMonths = sortedYMs.map((ym) => {
        const [y, mNum] = ym.split("-");
        const monthNumToName: Record<string, string> = {
          "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun",
          "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
        };
        const mName = monthNumToName[mNum] || mNum;
        const yearInt = parseInt(y, 10);
        const fy = ["Jan", "Feb", "Mar"].includes(mName)
          ? `${yearInt - 1}/${yearInt}`
          : `${yearInt}/${yearInt + 1}`;

        return {
          month: mName,
          financialYear: fy,
          yearMonth: ym,
          label: `${mName} ${y.slice(2)}`,
        };
      });
    }

    // Only take data available after 2026/08 month
    const CUTOFF_YEAR_MONTH = "2026-08";
    targetMonths = targetMonths.filter((m) => m.yearMonth > CUTOFF_YEAR_MONTH);

    let runningCumulativeGrowth = 0;

    const results = targetMonths.map((item, idx) => {
      const { month, financialYear, yearMonth, label } = item;

      // Find snapshot for this month
      const snap = chronoSortedSnapshots.find((s) => s.yearMonth === yearMonth);

      // Find daily points in this month
      const pointsInMonth = sortedPoints.filter((p) => p.date.startsWith(yearMonth));

      // End Market Value for this month
      let endMarketValue: number | null = null;
      if (pointsInMonth.length > 0) {
        endMarketValue = pointsInMonth[pointsInMonth.length - 1].portfolio_value;
      } else if (snap && snap.portfolioValue > 0) {
        endMarketValue = snap.portfolioValue;
      }

      // If no data exists for this month in FY mode, return empty placeholder
      if (endMarketValue === null) {
        return {
          month,
          financialYear,
          yearMonth,
          label,
          hasData: false,
          startMarketValue: 0,
          endMarketValue: 0,
          totalAdded: 0,
          totalSold: 0,
          netInvested: 0,
          growthValue: null,
          growthPercent: null,
          cumulativeGrowth: runningCumulativeGrowth,
        };
      }

      // Determine Starting Market Value (identical to DailyPortfolioChart logic)
      let startMarketValue = 0;
      const prevSnapshots = chronoSortedSnapshots.filter((s) => s.yearMonth < yearMonth);
      const prevSnap = prevSnapshots.length > 0 ? prevSnapshots[prevSnapshots.length - 1] : null;

      if (prevSnap && prevSnap.portfolioValue > 0) {
        startMarketValue = prevSnap.portfolioValue;
      } else {
        const priorPoints = sortedPoints.filter((p) => p.date < `${yearMonth}-01`);
        if (priorPoints.length > 0) {
          startMarketValue = priorPoints[priorPoints.length - 1].portfolio_value;
        } else if (pointsInMonth.length > 0) {
          startMarketValue = pointsInMonth[0].portfolio_value;
        } else if (snap) {
          startMarketValue = snap.totalCost;
        }
      }

      // Capital flows in this month
      const txsInMonth = capitalTransactions.filter((tx) => tx.date.startsWith(yearMonth));
      const totalAdded = txsInMonth.filter((tx) => tx.type === "BUY").reduce((s, tx) => s + tx.amount, 0);
      const totalSold = txsInMonth.filter((tx) => tx.type === "SELL").reduce((s, tx) => s + tx.amount, 0);
      const netInvested = totalAdded - totalSold;

      // Formula: Portfolio Growth = (Current MV - Previous MV) - Net Invested (Added - Sold)
      const marketValueDiff = endMarketValue - startMarketValue;
      const growthValue = marketValueDiff - netInvested;
      const growthPercent = startMarketValue > 0 ? (growthValue / startMarketValue) * 100 : 0;

      runningCumulativeGrowth += growthValue;

      return {
        month,
        financialYear,
        yearMonth,
        label,
        hasData: true,
        startMarketValue,
        endMarketValue,
        totalAdded,
        totalSold,
        netInvested,
        growthValue,
        growthPercent,
        cumulativeGrowth: runningCumulativeGrowth,
      };
    });

    return results;
  }, [mode, selectedFY, chronoSortedSnapshots, sortedPoints, capitalTransactions, monthlyBaseCosts]);

  // Filtered dataset containing valid data points for statistics
  const validGrowthData = useMemo(() => {
    return growthData.filter((d) => d.hasData && d.growthValue !== null);
  }, [growthData]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    if (validGrowthData.length === 0) {
      return {
        totalGrowthValue: 0,
        totalGrowthPercent: 0,
        totalAdded: 0,
        totalSold: 0,
        netInvested: 0,
        bestMonth: null as any,
        worstMonth: null as any,
        positiveMonthsCount: 0,
        totalRecordedMonths: 0,
        avgMonthlyGrowth: 0,
      };
    }

    let totalGrowthValue = 0;
    let totalAdded = 0;
    let totalSold = 0;
    let positiveMonthsCount = 0;

    let bestMonth = validGrowthData[0];
    let worstMonth = validGrowthData[0];

    validGrowthData.forEach((d) => {
      const gVal = d.growthValue ?? 0;
      totalGrowthValue += gVal;
      totalAdded += d.totalAdded;
      totalSold += d.totalSold;

      if (gVal >= 0) positiveMonthsCount++;

      if (gVal > (bestMonth.growthValue ?? -Infinity)) {
        bestMonth = d;
      }
      if (gVal < (worstMonth.growthValue ?? Infinity)) {
        worstMonth = d;
      }
    });

    const netInvested = totalAdded - totalSold;
    const initialBase = validGrowthData[0].startMarketValue || validGrowthData[0].endMarketValue || 1;
    const totalGrowthPercent = initialBase > 0 ? (totalGrowthValue / initialBase) * 100 : 0;
    const avgMonthlyGrowth = totalGrowthValue / validGrowthData.length;

    return {
      totalGrowthValue,
      totalGrowthPercent,
      totalAdded,
      totalSold,
      netInvested,
      bestMonth,
      worstMonth,
      positiveMonthsCount,
      totalRecordedMonths: validGrowthData.length,
      avgMonthlyGrowth,
    };
  }, [validGrowthData]);

  return (
    <Card className="border-white/10 bg-card/60 backdrop-blur-xl shadow-2xl overflow-hidden mt-6">
      <CardHeader className="border-b border-white/5 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <Sparkles className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">
                  Monthly Portfolio Growth
                </CardTitle>
                <CardDescription className="text-xs text-white/50">
                  {mode === "fy"
                    ? `True monthly organic market gain across Financial Year ${selectedFY} (excluding capital additions & withdrawals)`
                    : "Complete historical monthly organic market gain across all financial years"}
                </CardDescription>
              </div>
            </div>
          </div>

          {/* Chart View Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-background/60 p-1 rounded-xl border border-white/10 text-xs">
              <Button
                variant={activeView === "dual" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveView("dual")}
                className="h-7 text-xs rounded-lg px-2.5"
              >
                Dual (Rs. & %)
              </Button>
              <Button
                variant={activeView === "growth_rs" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveView("growth_rs")}
                className="h-7 text-xs rounded-lg px-2.5"
              >
                Growth (Rs.)
              </Button>
              <Button
                variant={activeView === "growth_pct" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveView("growth_pct")}
                className="h-7 text-xs rounded-lg px-2.5"
              >
                Growth (%)
              </Button>
              <Button
                variant={activeView === "growth_vs_flow" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveView("growth_vs_flow")}
                className="h-7 text-xs rounded-lg px-2.5"
              >
                Growth vs Flow
              </Button>
              <Button
                variant={activeView === "cumulative" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveView("cumulative")}
                className="h-7 text-xs rounded-lg px-2.5"
              >
                Cumulative
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {validGrowthData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground space-y-3">
            <Calendar className="h-12 w-12 text-white/20" />
            <div className="space-y-1">
              <p className="font-semibold text-white">No monthly portfolio growth data recorded</p>
              <p className="text-xs text-white/50 max-w-md">
                Upload monthly daily JSON or month-end snapshots to calculate and visualize true portfolio growth.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* KPI Highlight Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
              {/* Card 1: Total Portfolio Growth */}
              <div className="p-3.5 rounded-xl bg-background/50 border border-white/5 space-y-1">
                <span className="text-[11px] text-muted-foreground uppercase font-medium">
                  {mode === "fy" ? "FY Total Growth" : "All-Time Growth"}
                </span>
                <p
                  className={`text-xl font-black tabular-nums flex items-center gap-1 ${
                    summaryStats.totalGrowthValue >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {summaryStats.totalGrowthValue >= 0 ? "+" : ""}
                  Rs. {fmt(summaryStats.totalGrowthValue)}
                </p>
                <p
                  className={`text-[11px] font-semibold ${
                    summaryStats.totalGrowthPercent >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {summaryStats.totalGrowthPercent >= 0 ? "+" : ""}
                  {summaryStats.totalGrowthPercent.toFixed(2)}% net market return
                </p>
              </div>

              {/* Card 2: Average Monthly Growth */}
              <div className="p-3.5 rounded-xl bg-background/50 border border-white/5 space-y-1">
                <span className="text-[11px] text-muted-foreground uppercase font-medium">Avg Monthly Growth</span>
                <p
                  className={`text-xl font-black tabular-nums ${
                    summaryStats.avgMonthlyGrowth >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {summaryStats.avgMonthlyGrowth >= 0 ? "+" : ""}
                  Rs. {fmt(summaryStats.avgMonthlyGrowth)}
                </p>
                <p className="text-[11px] text-white/40">
                  {summaryStats.positiveMonthsCount} of {summaryStats.totalRecordedMonths} months positive (
                  {((summaryStats.positiveMonthsCount / summaryStats.totalRecordedMonths) * 100).toFixed(0)}%)
                </p>
              </div>

              {/* Card 3: Best Month */}
              <div className="p-3.5 rounded-xl bg-background/50 border border-white/5 space-y-1">
                <span className="text-[11px] text-muted-foreground uppercase font-medium">Best Month</span>
                {summaryStats.bestMonth ? (
                  <>
                    <p className="text-xl font-black text-emerald-400 tabular-nums">
                      +Rs. {fmt(summaryStats.bestMonth.growthValue || 0)}
                    </p>
                    <p className="text-[11px] text-white/60">
                      {summaryStats.bestMonth.label} • {fmtPct(summaryStats.bestMonth.growthPercent || 0)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-white/40">—</p>
                )}
              </div>

              {/* Card 4: Net Capital Inflow */}
              <div className="p-3.5 rounded-xl bg-background/50 border border-white/5 space-y-1">
                <span className="text-[11px] text-muted-foreground uppercase font-medium">Net Capital Invested</span>
                <p
                  className={`text-xl font-black tabular-nums ${
                    summaryStats.netInvested >= 0 ? "text-cyan-400" : "text-amber-400"
                  }`}
                >
                  {summaryStats.netInvested >= 0 ? "+" : ""}
                  Rs. {fmt(summaryStats.netInvested)}
                </p>
                <p className="text-[11px] text-white/40">
                  Buys: Rs. {fmt(summaryStats.totalAdded)} • Sells: Rs. {fmt(summaryStats.totalSold)}
                </p>
              </div>
            </div>

            {/* Main Chart Area */}
            <div className="h-[360px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {/* 1. DUAL VIEW: Growth in Rs. (Bars) + Growth in % (Line) */}
                {activeView === "dual" && (
                  <ComposedChart data={growthData} margin={{ top: 15, right: 25, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="growthGreen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0.4} />
                      </linearGradient>
                      <linearGradient id="growthRed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#F43F5E" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                      yAxisId="left"
                      stroke="#888888"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#06B6D4"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v.toFixed(1)}%`}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null;
                        const data = payload[0]?.payload;
                        if (!data || !data.hasData) {
                          return (
                            <div className="bg-[#0f172a] border border-white/10 p-3 rounded-xl shadow-2xl text-xs text-white">
                              <p className="font-bold text-white/70">{label}</p>
                              <p className="text-white/40 italic mt-1">No data recorded</p>
                            </div>
                          );
                        }
                        const gVal = data.growthValue ?? 0;
                        const gPct = data.growthPercent ?? 0;
                        return (
                          <div className="bg-[#0f172a] border border-white/10 p-3.5 rounded-xl shadow-2xl text-xs text-white space-y-2 min-w-[220px]">
                            <div className="flex items-center justify-between border-b border-white/10 pb-1.5 font-bold">
                              <span>{data.month} {data.financialYear}</span>
                              <span className={gVal >= 0 ? "text-emerald-400" : "text-rose-400"}>
                                {fmtPct(gPct)}
                              </span>
                            </div>
                            <div className="space-y-1 text-white/70">
                              <div className="flex justify-between">
                                <span>Organic Growth:</span>
                                <span className={`font-bold ${gVal >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                  {gVal >= 0 ? "+" : ""}Rs. {fmt(gVal)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>End Market Value:</span>
                                <span className="font-medium text-white">Rs. {fmt(data.endMarketValue)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Start Market Value:</span>
                                <span className="font-medium text-white/80">Rs. {fmt(data.startMarketValue)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Net Invested:</span>
                                <span className={data.netInvested >= 0 ? "text-cyan-400" : "text-amber-400"}>
                                  {data.netInvested >= 0 ? "+" : ""}Rs. {fmt(data.netInvested)}
                                </span>
                              </div>
                              <div className="flex justify-between pt-1 border-t border-white/5 text-[11px] text-white/50">
                                <span>Cumulative to date:</span>
                                <span className="font-semibold text-white/90">Rs. {fmt(data.cumulativeGrowth)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      formatter={(val) => <span className="text-xs text-white/70">{val}</span>}
                    />
                    <ReferenceLine yAxisId="left" y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                    <Bar yAxisId="left" dataKey="growthValue" name="Portfolio Growth (Rs.)" radius={[6, 6, 0, 0]}>
                      {growthData.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={(entry.growthValue ?? 0) >= 0 ? "url(#growthGreen)" : "url(#growthRed)"}
                        />
                      ))}
                    </Bar>
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="growthPercent"
                      name="Growth (%)"
                      stroke="#06B6D4"
                      strokeWidth={2.5}
                      dot={{ r: 3.5, fill: "#06B6D4" }}
                      activeDot={{ r: 6, fill: "#06B6D4" }}
                    />
                  </ComposedChart>
                )}

                {/* 2. GROWTH (RS.) VIEW: Pure Bar Chart */}
                {activeView === "growth_rs" && (
                  <BarChart data={growthData} margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#888888"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
                      formatter={(val: any) => [`Rs. ${fmt(Number(val))}`, "Portfolio Growth"]}
                    />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                    <Bar dataKey="growthValue" name="Growth (Rs.)" radius={[6, 6, 0, 0]}>
                      {growthData.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={(entry.growthValue ?? 0) >= 0 ? "#10B981" : "#F43F5E"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                )}

                {/* 3. GROWTH (%) VIEW */}
                {activeView === "growth_pct" && (
                  <BarChart data={growthData} margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#888888"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v.toFixed(1)}%`}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
                      formatter={(val: any) => [`${fmtPct(Number(val))}`, "Growth (%)"]}
                    />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                    <Bar dataKey="growthPercent" name="Growth (%)" radius={[6, 6, 0, 0]}>
                      {growthData.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={(entry.growthPercent ?? 0) >= 0 ? "#10B981" : "#F43F5E"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                )}

                {/* 4. GROWTH VS CAPITAL FLOW */}
                {activeView === "growth_vs_flow" && (
                  <BarChart data={growthData} margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#888888"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
                      formatter={(val: any, name: any) => [`Rs. ${fmt(Number(val))}`, name]}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      formatter={(val) => <span className="text-xs text-white/70">{val}</span>}
                    />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                    <Bar dataKey="growthValue" name="Organic Growth (Rs.)" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="netInvested" name="Net Capital Inflow (Rs.)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}

                {/* 5. CUMULATIVE GROWTH VIEW */}
                {activeView === "cumulative" && (
                  <AreaChart data={growthData} margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="cumulGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#888888"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
                      formatter={(val: any) => [`Rs. ${fmt(Number(val))}`, "Cumulative Market Gain"]}
                    />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                    <Area
                      type="monotone"
                      dataKey="cumulativeGrowth"
                      name="Cumulative Growth"
                      stroke="#10B981"
                      strokeWidth={3}
                      fill="url(#cumulGrad)"
                      dot={{ r: 4, fill: "#10B981" }}
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
