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
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
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
  FileJson,
  Pencil,
} from "lucide-react";
import { useStocks } from "@/context/StocksContext";
import { FINANCIAL_YEAR_MONTHS } from "@/context/TaxContext";
import { InputDailyJsonModal } from "./InputDailyJsonModal";
import { CapitalTransactionsModal } from "./CapitalTransactionsModal";
import { UpdateInvestedCostModal } from "./UpdateInvestedCostModal";
import type { StockSnapshot } from "@/actions/stocks";

interface DailyPortfolioChartProps {
  mode: "monthly" | "fy" | "full";
  selectedFY?: string;
  selectedMonth?: string;
}

export function DailyPortfolioChart({
  mode,
  selectedFY = "2026/2027",
  selectedMonth = "Aug",
}: DailyPortfolioChartProps) {
  const { dailyPoints, capitalTransactions, snapshots, monthlyBaseCosts } = useStocks();
  const [activeChart, setActiveChart] = useState<
    "gain_loss_rs" | "gain_loss_pct" | "gain_loss_combined" | "value_cost" | "daily_change"
  >("gain_loss_rs");
  const [showTable, setShowTable] = useState(false);

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

  // Sort daily points
  const sortedPoints = useMemo(() => {
    return [...dailyPoints].sort((a, b) => a.date.localeCompare(b.date));
  }, [dailyPoints]);

  // Chronologically sorted snapshots mapped to calendar YYYY-MM
  const chronoSortedSnapshots = useMemo(() => {
    return [...snapshots]
      .map((s) => ({
        ...s,
        yearMonth: getCalendarYearMonth(s.financialYear, s.month),
      }))
      .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
  }, [snapshots]);

  // Helper to get total cost of holdings from a snapshot (matching Holdings Detail table TOTAL)
  const getSnapshotHoldingsCost = (s: StockSnapshot): number => {
    if (s.holdings && s.holdings.length > 0) {
      const sumHoldings = s.holdings.reduce((sum, h) => sum + (h.totalCost || 0), 0);
      if (sumHoldings > 0) return sumHoldings;
    }
    return s.totalCost || 0;
  };

  // Compute calculated timeline
  const fullTimeline = useMemo(() => {
    if (sortedPoints.length === 0) return [];

    const sortedTxs = [...capitalTransactions].sort((a, b) => a.date.localeCompare(b.date));

    return sortedPoints.map((pt, idx) => {
      const ptMonth = pt.date.slice(0, 7); // "YYYY-MM"

      // Check for user-defined custom base cost override for this month
      const customBase = monthlyBaseCosts?.[ptMonth];

      let costBasis = 0;

      if (customBase !== undefined && customBase !== null) {
        // Base cost is explicitly set by user for this month
        const baseCost = customBase;
        const intraMonthTxs = sortedTxs.filter((tx) => tx.date.startsWith(ptMonth) && tx.date <= pt.date);
        const netAdjustment = intraMonthTxs.reduce((sum, tx) => {
          return sum + (tx.type === "BUY" ? tx.amount : -tx.amount);
        }, 0);
        costBasis = Math.max(0, baseCost + netAdjustment);
      } else {
        // 1. Initial cost is the total cost under Holdings Detail table of the previous month's snapshot
        const prevSnapshots = chronoSortedSnapshots.filter((s) => s.yearMonth < ptMonth);
        const prevSnapshot = prevSnapshots.length > 0 ? prevSnapshots[prevSnapshots.length - 1] : null;

        if (prevSnapshot) {
          const baseCost = getSnapshotHoldingsCost(prevSnapshot);
          // Transactions that occurred after the previous month's end up to pt.date
          const sinceDate = `${prevSnapshot.yearMonth}-31`;
          const subsequentTxs = sortedTxs.filter((tx) => tx.date > sinceDate && tx.date <= pt.date);
          const netAdjustment = subsequentTxs.reduce((sum, tx) => {
            return sum + (tx.type === "BUY" ? tx.amount : -tx.amount);
          }, 0);
          costBasis = Math.max(0, baseCost + netAdjustment);
        } else {
          // Fallback if no prior month snapshot exists:
          const currentMonthSnap = chronoSortedSnapshots.find((s) => s.yearMonth === ptMonth);
          if (currentMonthSnap) {
            const baseCost = getSnapshotHoldingsCost(currentMonthSnap);
            const intraMonthTxs = sortedTxs.filter((tx) => tx.date.startsWith(ptMonth) && tx.date <= pt.date);
            const netAdjustment = intraMonthTxs.reduce((sum, tx) => {
              return sum + (tx.type === "BUY" ? tx.amount : -tx.amount);
            }, 0);
            costBasis = Math.max(0, baseCost + netAdjustment);
          } else {
            // If no snapshots at all, compute running cost from all capital transactions up to date
            const txsUpToDate = sortedTxs.filter((tx) => tx.date <= pt.date);
            costBasis = Math.max(
              0,
              txsUpToDate.reduce((sum, tx) => sum + (tx.type === "BUY" ? tx.amount : -tx.amount), 0)
            );
          }
        }
      }

      const sameDayTxs = sortedTxs.filter((tx) => tx.date === pt.date);
      const sameDayInflow = sameDayTxs.reduce((sum, tx) => {
        return sum + (tx.type === "BUY" ? tx.amount : -tx.amount);
      }, 0);

      const marketValue = pt.portfolio_value;
      const gainLossValue = marketValue - costBasis;
      const gainLossPercent = costBasis > 0 ? (gainLossValue / costBasis) * 100 : 0;

      let dailyValueChange = 0;
      let dailyPercentChange = 0;
      if (idx > 0) {
        const prevVal = sortedPoints[idx - 1].portfolio_value;
        dailyValueChange = marketValue - prevVal - sameDayInflow;
        dailyPercentChange = prevVal > 0 ? (dailyValueChange / prevVal) * 100 : 0;
      }

      return {
        date: pt.date,
        marketValue,
        costBasis,
        gainLossValue,
        gainLossPercent,
        dailyValueChange,
        dailyPercentChange,
      };
    });
  }, [sortedPoints, capitalTransactions, chronoSortedSnapshots, monthlyBaseCosts]);

  // Filter for active view
  const filteredTimeline = useMemo(() => {
    if (fullTimeline.length === 0) return [];

    if (mode === "monthly") {
      const targetPrefix = getCalendarYearMonth(selectedFY, selectedMonth);
      return fullTimeline.filter((pt) => pt.date.startsWith(targetPrefix));
    }

    if (mode === "fy") {
      const [sYear, eYear] = selectedFY.split("/");
      const start = `${sYear}-04-01`;
      const end = `${eYear}-03-31`;
      return fullTimeline.filter((pt) => pt.date >= start && pt.date <= end);
    }

    // Full view
    return fullTimeline;
  }, [fullTimeline, mode, selectedFY, selectedMonth]);

  // Summary stats
  const stats = useMemo(() => {
    if (filteredTimeline.length === 0) {
      return {
        currentValue: 0,
        currentCost: 0,
        gainLossValue: 0,
        gainLossPercent: 0,
        periodHigh: 0,
        periodHighDate: "",
        periodLow: 0,
        periodLowDate: "",
        bestDay: 0,
        bestDayDate: "",
        worstDay: 0,
        worstDayDate: "",
        periodChange: 0,
        periodChangePercent: 0,
        count: 0,
      };
    }

    const latest = filteredTimeline[filteredTimeline.length - 1];
    const earliest = filteredTimeline[0];

    let maxVal = -Infinity;
    let maxDate = "";
    let minVal = Infinity;
    let minDate = "";
    let bestDay = -Infinity;
    let bestDayDate = "";
    let worstDay = Infinity;
    let worstDayDate = "";

    filteredTimeline.forEach((pt, i) => {
      if (pt.marketValue > maxVal) {
        maxVal = pt.marketValue;
        maxDate = pt.date;
      }
      if (pt.marketValue < minVal) {
        minVal = pt.marketValue;
        minDate = pt.date;
      }
      if (i > 0) {
        if (pt.dailyValueChange > bestDay) {
          bestDay = pt.dailyValueChange;
          bestDayDate = pt.date;
        }
        if (pt.dailyValueChange < worstDay) {
          worstDay = pt.dailyValueChange;
          worstDayDate = pt.date;
        }
      }
    });

    const periodChange = latest.marketValue - earliest.marketValue;
    const periodChangePercent = earliest.marketValue > 0 ? (periodChange / earliest.marketValue) * 100 : 0;

    return {
      currentValue: latest.marketValue,
      currentCost: latest.costBasis,
      gainLossValue: latest.gainLossValue,
      gainLossPercent: latest.gainLossPercent,
      periodHigh: maxVal,
      periodHighDate: maxDate,
      periodLow: minVal,
      periodLowDate: minDate,
      bestDay: bestDay === -Infinity ? 0 : bestDay,
      bestDayDate,
      worstDay: worstDay === Infinity ? 0 : worstDay,
      worstDayDate,
      periodChange,
      periodChangePercent,
      count: filteredTimeline.length,
    };
  }, [filteredTimeline]);

  // Capital flows (Added / Sold) for the active period
  // Capital flows (Added / Sold / Net Invested) for the active period
  const periodCapitalFlow = useMemo(() => {
    let txs = capitalTransactions;
    if (mode === "monthly") {
      const targetPrefix = getCalendarYearMonth(selectedFY, selectedMonth);
      txs = capitalTransactions.filter((tx) => tx.date.startsWith(targetPrefix));
    } else if (mode === "fy") {
      const [sYear, eYear] = selectedFY.split("/");
      const start = `${sYear}-04-01`;
      const end = `${eYear}-03-31`;
      txs = capitalTransactions.filter((tx) => tx.date >= start && tx.date <= end);
    }

    const totalAdded = txs
      .filter((tx) => tx.type === "BUY")
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const buyCount = txs.filter((tx) => tx.type === "BUY").length;

    const totalSold = txs
      .filter((tx) => tx.type === "SELL")
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const sellCount = txs.filter((tx) => tx.type === "SELL").length;

    const netInvested = totalAdded - totalSold;

    return { totalAdded, buyCount, totalSold, sellCount, netInvested };
  }, [capitalTransactions, mode, selectedFY, selectedMonth]);

  // Growth calculations: True Market Appreciation excluding Capital Inflows/Outflows
  const growthStats = useMemo(() => {
    if (filteredTimeline.length === 0) {
      return {
        prevMarketValue: 0,
        netInvested: 0,
        portfolioGrowthValue: 0,
        portfolioGrowthPercent: 0,
      };
    }

    const currentMarketValue = stats.currentValue;
    const netInvested = periodCapitalFlow.netInvested;

    let prevMarketValue = 0;
    if (mode === "monthly") {
      const currentYearMonth = getCalendarYearMonth(selectedFY, selectedMonth);
      const prevSnapshots = chronoSortedSnapshots.filter((s) => s.yearMonth < currentYearMonth);
      const prevSnapshot = prevSnapshots.length > 0 ? prevSnapshots[prevSnapshots.length - 1] : null;

      if (prevSnapshot && prevSnapshot.portfolioValue > 0) {
        prevMarketValue = prevSnapshot.portfolioValue;
      } else {
        // Find last daily point before this month
        const priorPoints = sortedPoints.filter((p) => p.date < `${currentYearMonth}-01`);
        if (priorPoints.length > 0) {
          prevMarketValue = priorPoints[priorPoints.length - 1].portfolio_value;
        } else {
          prevMarketValue = filteredTimeline[0]?.marketValue || 0;
        }
      }
    } else if (mode === "fy") {
      const [sYear] = selectedFY.split("/");
      const priorPoints = sortedPoints.filter((p) => p.date < `${sYear}-04-01`);
      if (priorPoints.length > 0) {
        prevMarketValue = priorPoints[priorPoints.length - 1].portfolio_value;
      } else {
        prevMarketValue = filteredTimeline[0]?.marketValue || 0;
      }
    } else {
      // Full view
      prevMarketValue = filteredTimeline[0]?.marketValue || 0;
    }

    // Portfolio Growth = (Current MV - Previous MV) - Net Invested (Total Added - Total Sold)
    const marketValueDiff = currentMarketValue - prevMarketValue;
    const portfolioGrowthValue = marketValueDiff - netInvested;
    const portfolioGrowthPercent = prevMarketValue > 0
      ? (portfolioGrowthValue / prevMarketValue) * 100
      : 0;

    return {
      prevMarketValue,
      netInvested,
      portfolioGrowthValue,
      portfolioGrowthPercent,
    };
  }, [filteredTimeline, stats.currentValue, periodCapitalFlow.netInvested, mode, selectedFY, selectedMonth, chronoSortedSnapshots, sortedPoints]);

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtDec = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (dStr: string) => {
    if (!dStr) return "";
    const p = dStr.split("-");
    if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
    return dStr;
  };

  return (
    <Card className="border-white/10 bg-card/60 backdrop-blur-xl shadow-2xl overflow-hidden mt-6">
      <CardHeader className="border-b border-white/5 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">
                  Daily Portfolio Performance & Gain/Loss
                </CardTitle>
                <CardDescription className="text-xs text-white/50">
                  {mode === "monthly" && `Daily movements and actual valuation for ${selectedMonth} ${selectedFY}`}
                  {mode === "fy" && `Daily movements for Financial Year ${selectedFY}`}
                  {mode === "full" && "Complete historical daily portfolio valuation"}
                </CardDescription>
              </div>
            </div>
          </div>

          {/* Action buttons & chart switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-background/60 p-1 rounded-xl border border-white/10 text-xs">
              <Button
                variant={activeChart === "gain_loss_rs" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveChart("gain_loss_rs")}
                className="h-7 text-xs rounded-lg px-2.5"
              >
                G/L (Rs.)
              </Button>
              <Button
                variant={activeChart === "gain_loss_pct" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveChart("gain_loss_pct")}
                className="h-7 text-xs rounded-lg px-2.5"
              >
                G/L (%)
              </Button>
              <Button
                variant={activeChart === "gain_loss_combined" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveChart("gain_loss_combined")}
                className="h-7 text-xs rounded-lg px-2.5"
              >
                Dual (Rs. & %)
              </Button>
              <Button
                variant={activeChart === "value_cost" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveChart("value_cost")}
                className="h-7 text-xs rounded-lg px-2.5"
              >
                Value vs Cost
              </Button>
              <Button
                variant={activeChart === "daily_change" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveChart("daily_change")}
                className="h-7 text-xs rounded-lg px-2.5"
              >
                Day-over-Day
              </Button>
            </div>

            <InputDailyJsonModal currentFY={selectedFY} currentMonth={selectedMonth} />
            <CapitalTransactionsModal currentFY={selectedFY} currentMonth={selectedMonth} />
            <UpdateInvestedCostModal currentFY={selectedFY} currentMonth={selectedMonth} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {filteredTimeline.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground space-y-3">
            <Calendar className="h-12 w-12 text-white/20" />
            <div className="space-y-1">
              <p className="font-semibold text-white">No daily points recorded for this period</p>
              <p className="text-xs text-white/50 max-w-md">
                Click <strong>Input Daily JSON</strong> above to paste your monthly daily portfolio values for {selectedMonth} {selectedFY}.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <InputDailyJsonModal currentFY={selectedFY} currentMonth={selectedMonth} />
              <UpdateInvestedCostModal currentFY={selectedFY} currentMonth={selectedMonth} />
            </div>
          </div>
        ) : (
          <>
            {/* KPI Highlight Strip: 2 rows of 4 cards on desktop / tablet */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
              {/* Card 1: Market Value */}
              <div className="p-3.5 rounded-xl bg-background/50 border border-white/5 space-y-1">
                <span className="text-[11px] text-muted-foreground uppercase font-medium">Market Value</span>
                <p className="text-xl font-black text-emerald-400 tabular-nums">
                  Rs. {fmt(stats.currentValue)}
                </p>
                <p className="text-[11px] text-white/40">{stats.count} recorded trading days</p>
              </div>

              {/* Card 2: Invested Cost */}
              <UpdateInvestedCostModal
                currentFY={selectedFY}
                currentMonth={selectedMonth}
                trigger={
                  <div className="group p-3.5 rounded-xl bg-background/50 border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/[0.03] transition-all cursor-pointer space-y-1 relative text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground uppercase font-medium">Invested Cost</span>
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400/70 group-hover:text-emerald-400 font-medium transition-colors">
                        <Pencil className="h-3 w-3" />
                        Edit
                      </span>
                    </div>
                    <p className="text-xl font-black text-white/90 group-hover:text-white tabular-nums">
                      Rs. {fmt(stats.currentCost)}
                    </p>
                    <p className="text-[11px] text-white/40 group-hover:text-white/60">
                      {monthlyBaseCosts?.[getCalendarYearMonth(selectedFY, selectedMonth)] !== undefined
                        ? "Custom base cost • Click to edit"
                        : "Total capital deployed • Click to edit"}
                    </p>
                  </div>
                }
              />

              {/* Card 3: Unrealized Gain / Loss */}
              <div className="p-3.5 rounded-xl bg-background/50 border border-white/5 space-y-1">
                <span className="text-[11px] text-muted-foreground uppercase font-medium">Gain / Loss</span>
                <p
                  className={`text-xl font-black tabular-nums flex items-center gap-1 ${
                    stats.gainLossValue >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {stats.gainLossValue >= 0 ? "+" : ""}
                  Rs. {fmt(stats.gainLossValue)}
                </p>
                <p
                  className={`text-[11px] font-semibold ${
                    stats.gainLossPercent >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {stats.gainLossPercent >= 0 ? "+" : ""}
                  {stats.gainLossPercent.toFixed(2)}% ROI
                </p>
              </div>

              {/* Card 4: Portfolio Growth (True Market Appreciation excluding capital additions/withdrawals) */}
              <div className="p-3.5 rounded-xl bg-background/50 border border-white/5 space-y-1">
                <span className="text-[11px] text-muted-foreground uppercase font-medium">Portfolio Growth</span>
                <p
                  className={`text-xl font-black tabular-nums flex items-center gap-1 ${
                    growthStats.portfolioGrowthValue >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {growthStats.portfolioGrowthValue >= 0 ? "+" : ""}
                  Rs. {fmt(growthStats.portfolioGrowthValue)}
                </p>
                <p
                  className={`text-[11px] font-semibold ${
                    growthStats.portfolioGrowthPercent >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {growthStats.portfolioGrowthPercent >= 0 ? "+" : ""}
                  {growthStats.portfolioGrowthPercent.toFixed(2)}% net market growth
                </p>
              </div>

              {/* Card 5: Period Change (Raw point-to-point) */}
              <div className="p-3.5 rounded-xl bg-background/50 border border-white/5 space-y-1">
                <span className="text-[11px] text-muted-foreground uppercase font-medium">Period Change</span>
                <p
                  className={`text-xl font-black tabular-nums ${
                    stats.periodChange >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {stats.periodChange >= 0 ? "+" : ""}
                  Rs. {fmt(stats.periodChange)}
                </p>
                <p
                  className={`text-[11px] ${
                    stats.periodChangePercent >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {stats.periodChangePercent >= 0 ? "+" : ""}
                  {stats.periodChangePercent.toFixed(2)}% in period
                </p>
              </div>

              {/* Card 6: Total Added (Buy) */}
              <div className="p-3.5 rounded-xl bg-background/50 border border-white/5 space-y-1">
                <span className="text-[11px] text-muted-foreground uppercase font-medium">Total Added (Buy)</span>
                <p className="text-xl font-black text-cyan-400 tabular-nums">
                  Rs. {fmt(periodCapitalFlow.totalAdded)}
                </p>
                <p className="text-[11px] text-white/40">
                  {periodCapitalFlow.buyCount} buy {periodCapitalFlow.buyCount === 1 ? "order" : "orders"} in period
                </p>
              </div>

              {/* Card 7: Total Sold (Exit) */}
              <div className="p-3.5 rounded-xl bg-background/50 border border-white/5 space-y-1">
                <span className="text-[11px] text-muted-foreground uppercase font-medium">Total Sold (Exit)</span>
                <p className="text-xl font-black text-amber-400 tabular-nums">
                  Rs. {fmt(periodCapitalFlow.totalSold)}
                </p>
                <p className="text-[11px] text-white/40">
                  {periodCapitalFlow.sellCount} sell {periodCapitalFlow.sellCount === 1 ? "order" : "orders"} in period
                </p>
              </div>

              {/* Card 8: Total Invested (Net: Added - Sold) */}
              <div className="p-3.5 rounded-xl bg-background/50 border border-white/5 space-y-1">
                <span className="text-[11px] text-muted-foreground uppercase font-medium">Total Invested</span>
                <p
                  className={`text-xl font-black tabular-nums ${
                    periodCapitalFlow.netInvested >= 0 ? "text-blue-400" : "text-purple-400"
                  }`}
                >
                  {periodCapitalFlow.netInvested >= 0 ? "+" : ""}
                  Rs. {fmt(periodCapitalFlow.netInvested)}
                </p>
                <p className="text-[11px] text-white/40">
                  Net flow (Added - Sold)
                </p>
              </div>
            </div>

            {/* High/Low strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <ArrowUpRight className="h-4 w-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-white/50 block">High</span>
                  <span className="font-bold text-white">Rs. {fmt(stats.periodHigh)}</span>
                  <span className="text-[10px] text-white/40 block">{fmtDate(stats.periodHighDate)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/10">
                <ArrowDownRight className="h-4 w-4 text-rose-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-white/50 block">Low</span>
                  <span className="font-bold text-white">Rs. {fmt(stats.periodLow)}</span>
                  <span className="text-[10px] text-white/40 block">{fmtDate(stats.periodLowDate)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-sky-500/5 border border-sky-500/10">
                <TrendingUp className="h-4 w-4 text-sky-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-white/50 block">Best Day</span>
                  <span className="font-bold text-sky-400">
                    {stats.bestDay > 0 ? `+Rs. ${fmt(stats.bestDay)}` : "—"}
                  </span>
                  <span className="text-[10px] text-white/40 block">{fmtDate(stats.bestDayDate)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <TrendingDown className="h-4 w-4 text-amber-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-white/50 block">Worst Day</span>
                  <span className="font-bold text-rose-400">
                    {stats.worstDay < 0 ? `Rs. ${fmt(stats.worstDay)}` : "—"}
                  </span>
                  <span className="text-[10px] text-white/40 block">{fmtDate(stats.worstDayDate)}</span>
                </div>
              </div>
            </div>

            {/* Recharts Canvas */}
            <div className="h-[340px] w-full pt-2">
              {/* 1. Dedicated Gain/Loss in Rupees (Rs.) */}
              {activeChart === "gain_loss_rs" && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={filteredTimeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="glRsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => {
                        const p = d.split("-");
                        return p.length === 3 ? `${p[2]}/${p[1]}` : d;
                      }}
                      stroke="#888"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#10B981"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.25)" strokeDasharray="3 3" label={{ value: "Rs. 0", fill: "#888", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "rgba(255,255,255,0.15)",
                        borderRadius: "12px",
                        color: "#ffffff",
                      }}
                      itemStyle={{ color: "#ffffff", fontSize: "12px" }}
                      labelStyle={{ color: "#94a3b8", fontWeight: 600, marginBottom: "4px" }}
                      labelFormatter={(label) => fmtDate(String(label))}
                      formatter={(val: any) => [
                        `${Number(val) >= 0 ? "+" : ""}Rs. ${fmtDec(Number(val))}`,
                        "Gain / Loss (Rs.)",
                      ]}
                    />
                    <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }} />
                    <Area
                      type="monotone"
                      dataKey="gainLossValue"
                      name="Gain / Loss (Rupees)"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#glRsGrad)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {/* 2. Dedicated Gain/Loss in Percentage (%) */}
              {activeChart === "gain_loss_pct" && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={filteredTimeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="glPctGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => {
                        const p = d.split("-");
                        return p.length === 3 ? `${p[2]}/${p[1]}` : d;
                      }}
                      stroke="#888"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#38BDF8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v.toFixed(1)}%`}
                    />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.25)" strokeDasharray="3 3" label={{ value: "0%", fill: "#888", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "rgba(255,255,255,0.15)",
                        borderRadius: "12px",
                        color: "#ffffff",
                      }}
                      itemStyle={{ color: "#ffffff", fontSize: "12px" }}
                      labelStyle={{ color: "#94a3b8", fontWeight: 600, marginBottom: "4px" }}
                      labelFormatter={(label) => fmtDate(String(label))}
                      formatter={(val: any) => [
                        `${Number(val) >= 0 ? "+" : ""}${Number(val).toFixed(2)}%`,
                        "Portfolio Return (%)",
                      ]}
                    />
                    <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }} />
                    <Area
                      type="monotone"
                      dataKey="gainLossPercent"
                      name="Gain / Loss (Percentage ROI)"
                      stroke="#38BDF8"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#glPctGrad)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {/* 3. Combined Dual-Axis (Rs. & %) */}
              {activeChart === "gain_loss_combined" && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={filteredTimeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="glCombGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => {
                        const p = d.split("-");
                        return p.length === 3 ? `${p[2]}/${p[1]}` : d;
                      }}
                      stroke="#888"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#10B981"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#38BDF8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v.toFixed(1)}%`}
                    />
                    <ReferenceLine yAxisId="left" y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "rgba(255,255,255,0.15)",
                        borderRadius: "12px",
                        color: "#ffffff",
                      }}
                      itemStyle={{ color: "#ffffff", fontSize: "12px" }}
                      labelStyle={{ color: "#94a3b8", fontWeight: 600, marginBottom: "4px" }}
                      labelFormatter={(label) => fmtDate(String(label))}
                      formatter={(val: any, name: any) => {
                        if (name === "Gain / Loss (Rs.)") {
                          return [`${Number(val) >= 0 ? "+" : ""}Rs. ${fmtDec(Number(val))}`, "Gain / Loss (Rs.)"];
                        }
                        return [`${Number(val) >= 0 ? "+" : ""}${Number(val).toFixed(2)}%`, "Gain / Loss (%)"];
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }} />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="gainLossValue"
                      name="Gain / Loss (Rs.)"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#glCombGrad)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="gainLossPercent"
                      name="Gain / Loss (%)"
                      stroke="#38BDF8"
                      strokeWidth={2}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {/* 4. Value vs Cost */}
              {activeChart === "value_cost" && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={filteredTimeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => {
                        const p = d.split("-");
                        return p.length === 3 ? `${p[2]}/${p[1]}` : d;
                      }}
                      stroke="#888"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      domain={["auto", "auto"]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "rgba(255,255,255,0.15)",
                        borderRadius: "12px",
                        color: "#ffffff",
                      }}
                      itemStyle={{ color: "#ffffff", fontSize: "12px" }}
                      labelStyle={{ color: "#94a3b8", fontWeight: 600, marginBottom: "4px" }}
                      labelFormatter={(label) => fmtDate(String(label))}
                      formatter={(val: any, name: any) => [
                        `Rs. ${fmtDec(Number(val))}`,
                        name === "marketValue" ? "Actual Market Value" : "Invested Cost",
                      ]}
                    />
                    <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }} />
                    <Area
                      type="monotone"
                      dataKey="marketValue"
                      name="Actual Market Value"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#valGrad)"
                    />
                    <Area
                      type="stepAfter"
                      dataKey="costBasis"
                      name="Invested Cost"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      fillOpacity={1}
                      fill="url(#costGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {/* 5. Day-over-Day Fluctuations */}
              {activeChart === "daily_change" && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredTimeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => {
                        const p = d.split("-");
                        return p.length === 3 ? `${p[2]}/${p[1]}` : d;
                      }}
                      stroke="#888"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="2 2" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "rgba(255,255,255,0.15)",
                        borderRadius: "12px",
                        color: "#ffffff",
                      }}
                      itemStyle={{ color: "#ffffff", fontSize: "12px" }}
                      labelStyle={{ color: "#94a3b8", fontWeight: 600, marginBottom: "4px" }}
                      labelFormatter={(label) => fmtDate(String(label))}
                      formatter={(val: any, _name: any, item: any) => {
                        const pct = item.payload.dailyPercentChange;
                        const sign = Number(val) >= 0 ? "+" : "";
                        return [
                          `${sign}Rs. ${fmtDec(Number(val))} (${sign}${pct.toFixed(2)}%)`,
                          "Daily Fluctuations",
                        ];
                      }}
                    />
                    <Bar dataKey="dailyValueChange" name="Daily Change (Rs.)" radius={[4, 4, 0, 0]}>
                      {filteredTimeline.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.dailyValueChange >= 0 ? "#10B981" : "#EF4444"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Toggle Daily Ledger Table */}
            <div className="pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTable(!showTable)}
                className="text-xs text-muted-foreground hover:text-white"
              >
                {showTable ? "Hide Daily Ledger Table" : "Show Daily Ledger Table"} ({filteredTimeline.length} days)
              </Button>

              {showTable && (
                <div className="border border-white/10 rounded-xl overflow-hidden mt-3 max-h-[250px] overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-background/80 text-muted-foreground uppercase text-[10px] border-b border-white/10">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Market Value</th>
                        <th className="p-2.5">Cost Basis</th>
                        <th className="p-2.5">Cumulative Gain/Loss</th>
                        <th className="p-2.5">ROI (%)</th>
                        <th className="p-2.5">Daily Movement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {[...filteredTimeline].reverse().map((row) => (
                        <tr key={row.date} className="hover:bg-white/5">
                          <td className="p-2.5 font-medium">{fmtDate(row.date)}</td>
                          <td className="p-2.5 font-semibold">Rs. {fmt(row.marketValue)}</td>
                          <td className="p-2.5 text-white/60">Rs. {fmt(row.costBasis)}</td>
                          <td
                            className={`p-2.5 font-semibold ${
                              row.gainLossValue >= 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {row.gainLossValue >= 0 ? "+" : ""}Rs. {fmt(row.gainLossValue)}
                          </td>
                          <td
                            className={`p-2.5 font-semibold ${
                              row.gainLossPercent >= 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {row.gainLossPercent >= 0 ? "+" : ""}
                            {row.gainLossPercent.toFixed(2)}%
                          </td>
                          <td className="p-2.5">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-medium ${
                                row.dailyValueChange >= 0
                                  ? "bg-emerald-500/15 text-emerald-400"
                                  : "bg-rose-500/15 text-rose-400"
                              }`}
                            >
                              {row.dailyValueChange >= 0 ? "+" : ""}Rs. {fmt(row.dailyValueChange)} (
                              {row.dailyValueChange >= 0 ? "+" : ""}
                              {row.dailyPercentChange.toFixed(2)}%)
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
