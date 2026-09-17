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
} from "lucide-react";
import { useStocks } from "@/context/StocksContext";
import { FINANCIAL_YEAR_MONTHS } from "@/context/TaxContext";
import { InputDailyJsonModal } from "./InputDailyJsonModal";
import { CapitalTransactionsModal } from "./CapitalTransactionsModal";

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
  const { dailyPoints, capitalTransactions, snapshots } = useStocks();
  const [activeChart, setActiveChart] = useState<"gain_loss" | "value_cost" | "daily_change">("gain_loss");
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

  // Compute calculated timeline
  const fullTimeline = useMemo(() => {
    if (sortedPoints.length === 0) return [];

    let runningCost = 0;
    let txIdx = 0;
    const sortedTxs = [...capitalTransactions].sort((a, b) => a.date.localeCompare(b.date));

    // Fallback: if no capital transactions exist, use the first snapshot totalCost
    let baseFallbackCost = 0;
    if (sortedTxs.length === 0 && snapshots.length > 0) {
      baseFallbackCost = snapshots[0].totalCost || 0;
      runningCost = baseFallbackCost;
    }

    return sortedPoints.map((pt, idx) => {
      while (txIdx < sortedTxs.length && sortedTxs[txIdx].date <= pt.date) {
        const tx = sortedTxs[txIdx];
        if (tx.type === "BUY") {
          runningCost += tx.amount;
        } else if (tx.type === "SELL") {
          runningCost = Math.max(0, runningCost - tx.amount);
        }
        txIdx++;
      }

      const sameDayTxs = sortedTxs.filter((tx) => tx.date === pt.date);
      const sameDayInflow = sameDayTxs.reduce((sum, tx) => {
        return sum + (tx.type === "BUY" ? tx.amount : -tx.amount);
      }, 0);

      const marketValue = pt.portfolio_value;
      const costBasis = runningCost;
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
  }, [sortedPoints, capitalTransactions, snapshots]);

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
                variant={activeChart === "value_cost" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveChart("value_cost")}
                className="h-7 text-xs rounded-lg px-2.5"
              >
                Value vs Cost
              </Button>
              <Button
                variant={activeChart === "gain_loss" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveChart("gain_loss")}
                className="h-7 text-xs rounded-lg px-2.5"
              >
                Gain/Loss (Rs. & %)
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
            <CapitalTransactionsModal />
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
            <InputDailyJsonModal currentFY={selectedFY} currentMonth={selectedMonth} />
          </div>
        ) : (
          <>
            {/* KPI Highlight Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-xl bg-background/50 border border-white/5 space-y-1">
                <span className="text-[11px] text-muted-foreground uppercase font-medium">Market Value</span>
                <p className="text-xl font-black text-emerald-400 tabular-nums">
                  Rs. {fmt(stats.currentValue)}
                </p>
                <p className="text-[11px] text-white/40">{stats.count} recorded trading days</p>
              </div>

              <div className="p-3.5 rounded-xl bg-background/50 border border-white/5 space-y-1">
                <span className="text-[11px] text-muted-foreground uppercase font-medium">Invested Cost</span>
                <p className="text-xl font-black text-white/90 tabular-nums">
                  Rs. {fmt(stats.currentCost)}
                </p>
                <p className="text-[11px] text-white/40">Total capital deployed</p>
              </div>

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
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "rgba(255,255,255,0.15)",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
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

              {activeChart === "gain_loss" && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={filteredTimeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="glGrad" x1="0" y1="0" x2="0" y2="1">
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
                      yAxisId="left"
                      stroke="#888"
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
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "rgba(255,255,255,0.15)",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
                      labelFormatter={(label) => fmtDate(String(label))}
                      formatter={(val: any, name: any) => {
                        if (name === "gainLossValue") {
                          return [`Rs. ${fmtDec(Number(val))}`, "Gain / Loss (Rs.)"];
                        }
                        return [`${Number(val).toFixed(2)}%`, "Gain / Loss (%)"];
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
                      fill="url(#glGrad)"
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
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "rgba(255,255,255,0.15)",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
                      labelFormatter={(label) => fmtDate(String(label))}
                      formatter={(val: any, name: any, item: any) => {
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
