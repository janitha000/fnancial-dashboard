"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { WealthMonth, WealthRecord } from "@/context/WealthContext";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  Target,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Percent,
} from "lucide-react";

interface TargetVsActualChartProps {
  sortedMonths: WealthMonth[];
  getMonthTotal: (monthRecord: WealthMonth | undefined) => number;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Map year & month (calendar or FY) to calendar YYYY-MM and formatted label
export function parseToCalendarYearMonth(yearStr: string, monthStr: string): {
  year: number;
  month: number;
  key: string;
  label: string;
} {
  const mIndex = MONTH_NAMES.indexOf(monthStr);
  const mNum = mIndex >= 0 ? mIndex + 1 : 1;
  let calYear: number;

  if (yearStr.includes("/")) {
    const [startYearStr, endYearStr] = yearStr.split("/");
    const startYear = parseInt(startYearStr, 10);
    const endYear = parseInt(endYearStr, 10);
    // Jan, Feb, Mar are part of the next calendar year in a standard FY
    calYear = mNum <= 3 ? endYear : startYear;
  } else {
    calYear = parseInt(yearStr, 10) || 2026;
  }

  const key = `${calYear}-${String(mNum).padStart(2, "0")}`;
  const label = `${monthStr} ${calYear}`;
  return { year: calYear, month: mNum, key, label };
}

export function TargetVsActualChart({ sortedMonths, getMonthTotal }: TargetVsActualChartProps) {
  // Configuration: Base 59Mn on 10/2026 -> Target 100Mn on 12/2029
  const BASE_YEAR = 2026;
  const BASE_MONTH = 10; // Oct 2026
  const BASE_TARGET_AMOUNT = 59_000_000; // 59 Mn

  const TARGET_YEAR = 2029;
  const TARGET_MONTH = 12; // Dec 2029
  const TARGET_AMOUNT = 100_000_000; // 100 Mn

  // Total interval months from 10/2026 to 12/2029:
  // (2029 - 2026) * 12 + (12 - 10) = 36 + 2 = 38 intervals
  const TOTAL_INTERVALS = (TARGET_YEAR - BASE_YEAR) * 12 + (TARGET_MONTH - BASE_MONTH);

  // States
  const [model, setModel] = useState<"linear" | "compound">("linear");
  const [scope, setScope] = useState<"target_only" | "all_time">("target_only");
  const [showTable, setShowTable] = useState<boolean>(true);

  // Map actual data by YYYY-MM key
  const actualDataMap = useMemo(() => {
    const map = new Map<string, { total: number; record: WealthMonth }>();
    sortedMonths.forEach((m) => {
      const { key } = parseToCalendarYearMonth(m.year, m.month);
      const total = getMonthTotal(m);
      map.set(key, { total, record: m });
    });
    return map;
  }, [sortedMonths, getMonthTotal]);

  // Actual total at base month (10/2026) if available, otherwise fallback to 59Mn
  const baseActualRecord = actualDataMap.get(`${BASE_YEAR}-${String(BASE_MONTH).padStart(2, "0")}`);
  const baseActualAmount = baseActualRecord ? baseActualRecord.total : BASE_TARGET_AMOUNT;

  // Latest recorded actual overall
  const latestRecordedMonth = sortedMonths.length > 0 ? sortedMonths[sortedMonths.length - 1] : undefined;
  const latestRecordedTotal = latestRecordedMonth ? getMonthTotal(latestRecordedMonth) : baseActualAmount;
  const latestRecordedParsed = latestRecordedMonth
    ? parseToCalendarYearMonth(latestRecordedMonth.year, latestRecordedMonth.month)
    : { year: BASE_YEAR, month: BASE_MONTH, key: `${BASE_YEAR}-${String(BASE_MONTH).padStart(2, "0")}`, label: "Oct 2026" };

  // Calculate monthly compound rate (CAGR) for 38 months from 59M to 100M
  const monthlyCompoundRate = useMemo(() => {
    return Math.pow(TARGET_AMOUNT / BASE_TARGET_AMOUNT, 1 / TOTAL_INTERVALS) - 1;
  }, [BASE_TARGET_AMOUNT, TARGET_AMOUNT, TOTAL_INTERVALS]);

  const annualizedCAGR = useMemo(() => {
    return (Math.pow(1 + monthlyCompoundRate, 12) - 1) * 100;
  }, [monthlyCompoundRate]);

  // Generate timeline data
  const chartData = useMemo(() => {
    const points: any[] = [];

    // If "all_time" scope, include historical months before 10/2026
    if (scope === "all_time") {
      const historicalList: { key: string; label: string; year: number; month: number; total: number }[] = [];
      actualDataMap.forEach((val, key) => {
        const [yStr, mStr] = key.split("-");
        const y = parseInt(yStr, 10);
        const m = parseInt(mStr, 10);
        if (y < BASE_YEAR || (y === BASE_YEAR && m < BASE_MONTH)) {
          historicalList.push({
            key,
            label: `${MONTH_NAMES[m - 1]} ${y}`,
            year: y,
            month: m,
            total: val.total,
          });
        }
      });

      // Sort chronological
      historicalList.sort((a, b) => a.key.localeCompare(b.key));

      historicalList.forEach((h) => {
        points.push({
          key: h.key,
          month: h.label,
          target: null, // Target was not active prior to base
          actual: h.total,
          actualMn: Number((h.total / 1_000_000).toFixed(2)),
          targetMn: null,
          variance: null,
          variancePct: null,
          isProjected: false,
          isBase: false,
          isTarget: false,
        });
      });
    }

    // Generate from base (10/2026) to target (12/2029)
    let curY = BASE_YEAR;
    let curM = BASE_MONTH;
    let step = 0;

    while (curY < TARGET_YEAR || (curY === TARGET_YEAR && curM <= TARGET_MONTH)) {
      const key = `${curY}-${String(curM).padStart(2, "0")}`;
      const label = `${MONTH_NAMES[curM - 1]} ${curY}`;

      // Calculate predicted target
      let targetVal: number;
      if (model === "linear") {
        targetVal = BASE_TARGET_AMOUNT + ((TARGET_AMOUNT - BASE_TARGET_AMOUNT) * step) / TOTAL_INTERVALS;
      } else {
        targetVal = BASE_TARGET_AMOUNT * Math.pow(1 + monthlyCompoundRate, step);
      }

      // Check if actual exists
      const actualEntry = actualDataMap.get(key);
      const actualVal = actualEntry ? actualEntry.total : null;
      const variance = actualVal !== null ? actualVal - targetVal : null;
      const variancePct = actualVal !== null ? (variance! / targetVal) * 100 : null;

      points.push({
        key,
        month: label,
        step,
        target: Math.round(targetVal),
        actual: actualVal,
        targetMn: Number((targetVal / 1_000_000).toFixed(2)),
        actualMn: actualVal !== null ? Number((actualVal / 1_000_000).toFixed(2)) : null,
        variance: variance !== null ? Math.round(variance) : null,
        variancePct: variancePct !== null ? Number(variancePct.toFixed(2)) : null,
        isProjected: actualVal === null,
        isBase: step === 0,
        isTarget: step === TOTAL_INTERVALS,
      });

      step++;
      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
    }

    return points;
  }, [scope, model, actualDataMap, monthlyCompoundRate, BASE_TARGET_AMOUNT, TARGET_AMOUNT, TOTAL_INTERVALS]);

  // Statistics
  const latestTargetPoint = chartData.find((p) => p.key === latestRecordedParsed.key) || chartData[0];
  const currentVariance = latestTargetPoint && latestTargetPoint.actual !== null
    ? latestTargetPoint.actual - (latestTargetPoint.target || BASE_TARGET_AMOUNT)
    : 0;
  const currentVariancePct = latestTargetPoint && latestTargetPoint.actual !== null && latestTargetPoint.target
    ? ((latestTargetPoint.actual - latestTargetPoint.target) / latestTargetPoint.target) * 100
    : 0;

  const progressTowardsTargetPct = Math.min(
    100,
    Math.max(0, ((latestRecordedTotal) / TARGET_AMOUNT) * 100)
  );

  const remainingToTarget = Math.max(0, TARGET_AMOUNT - latestRecordedTotal);
  const remainingGrowthPct = ((TARGET_AMOUNT - latestRecordedTotal) / latestRecordedTotal) * 100;
  const monthlyLinearRunRate = (TARGET_AMOUNT - BASE_TARGET_AMOUNT) / TOTAL_INTERVALS;

  return (
    <div className="space-y-6">
      {/* Top Banner & Scope / Model Controls */}
      <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-background to-background shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-amber-400">
                    Target vs Actual Wealth Trajectory
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground mt-0.5">
                    Goal: Reach <span className="font-semibold text-amber-300">100 Mn LKR</span> by{" "}
                    <span className="font-semibold text-white">Dec 2029 (12/2029)</span> from{" "}
                    <span className="font-semibold text-blue-300">59 Mn LKR</span> base on{" "}
                    <span className="font-semibold text-white">Oct 2026 (10/2026)</span>
                  </CardDescription>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-background/60 border border-white/10 rounded-xl p-1 flex items-center gap-1 shadow-inner">
                <Button
                  size="sm"
                  variant={scope === "target_only" ? "default" : "ghost"}
                  onClick={() => setScope("target_only")}
                  className={`text-xs h-8 rounded-lg font-medium ${
                    scope === "target_only" ? "bg-amber-500 hover:bg-amber-600 text-black font-bold" : "text-muted-foreground"
                  }`}
                >
                  Target Period (2026–2029)
                </Button>
                <Button
                  size="sm"
                  variant={scope === "all_time" ? "default" : "ghost"}
                  onClick={() => setScope("all_time")}
                  className={`text-xs h-8 rounded-lg font-medium ${
                    scope === "all_time" ? "bg-amber-500 hover:bg-amber-600 text-black font-bold" : "text-muted-foreground"
                  }`}
                >
                  All History + Target
                </Button>
              </div>

              <div className="bg-background/60 border border-white/10 rounded-xl p-1 flex items-center gap-1 shadow-inner">
                <Button
                  size="sm"
                  variant={model === "linear" ? "default" : "ghost"}
                  onClick={() => setModel("linear")}
                  className={`text-xs h-8 rounded-lg font-medium ${
                    model === "linear" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"
                  }`}
                >
                  Linear
                </Button>
                <Button
                  size="sm"
                  variant={model === "compound" ? "default" : "ghost"}
                  onClick={() => setModel("compound")}
                  className={`text-xs h-8 rounded-lg font-medium ${
                    model === "compound" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"
                  }`}
                >
                  Compound (CAGR)
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {/* Card 1: Base */}
            <div className="bg-background/40 border border-white/10 rounded-xl p-3.5 space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" /> Base (10/2026)
              </span>
              <div className="text-xl font-black text-white">59.00 <span className="text-xs font-normal text-muted-foreground">Mn</span></div>
              <p className="text-[11px] text-muted-foreground">
                Actual: <span className="text-white font-medium">{(baseActualAmount / 1_000_000).toFixed(2)} Mn</span>
              </p>
            </div>

            {/* Card 2: Target */}
            <div className="bg-background/40 border border-amber-500/20 rounded-xl p-3.5 space-y-1 bg-gradient-to-b from-amber-500/5 to-transparent">
              <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-amber-400" /> Target (12/2029)
              </span>
              <div className="text-xl font-black text-amber-300">100.00 <span className="text-xs font-normal text-amber-400/80">Mn</span></div>
              <p className="text-[11px] text-amber-200/70">{TOTAL_INTERVALS} months trajectory</p>
            </div>

            {/* Card 3: Remaining Needed */}
            <div className="bg-background/40 border border-white/10 rounded-xl p-3.5 space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Remaining Growth
              </span>
              <div className="text-xl font-black text-white">+{(remainingToTarget / 1_000_000).toFixed(2)} <span className="text-xs font-normal text-muted-foreground">Mn</span></div>
              <p className="text-[11px] text-emerald-400 font-medium">+{remainingGrowthPct.toFixed(1)}% total expansion</p>
            </div>

            {/* Card 4: Required Run-Rate */}
            <div className="bg-background/40 border border-white/10 rounded-xl p-3.5 space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-400" /> Required Run-Rate
              </span>
              <div className="text-xl font-black text-white">
                {model === "linear" ? (
                  <>+{(monthlyLinearRunRate / 1_000_000).toFixed(2)} <span className="text-xs font-normal text-muted-foreground">Mn/mo</span></>
                ) : (
                  <>+{(monthlyCompoundRate * 100).toFixed(2)}% <span className="text-xs font-normal text-muted-foreground">/mo</span></>
                )}
              </div>
              <p className="text-[11px] text-purple-300">
                {model === "linear" ? `≈ ${(monthlyLinearRunRate).toLocaleString()} LKR` : `CAGR: ~${annualizedCAGR.toFixed(1)}% p.a.`}
              </p>
            </div>

            {/* Card 5: Current Status */}
            <div className="col-span-2 md:col-span-4 lg:col-span-1 bg-background/40 border border-white/10 rounded-xl p-3.5 space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Trajectory Status
              </span>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`${
                    currentVariance >= 0
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-bold"
                      : "bg-red-500/20 text-red-300 border-red-500/30 font-bold"
                  }`}
                >
                  {currentVariance >= 0 ? "ON TRACK" : "BEHIND TARGET"}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {currentVariance >= 0 ? "+" : ""}
                {(currentVariance / 1_000_000).toFixed(2)} Mn ({currentVariance >= 0 ? "+" : ""}
                {currentVariancePct.toFixed(1)}%) vs base
              </p>
            </div>
          </div>

          {/* Milestone Progress Bar */}
          <div className="space-y-2 bg-background/30 p-3.5 rounded-xl border border-white/5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> 100Mn Milestone Progress
              </span>
              <span className="font-bold text-white">
                {(latestRecordedTotal / 1_000_000).toFixed(2)} Mn / 100.00 Mn (
                {progressTowardsTargetPct.toFixed(1)}%)
              </span>
            </div>
            <Progress value={progressTowardsTargetPct} className="h-2.5 bg-white/10" />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Base: 59.00 Mn (Oct 2026)</span>
              <span>Halfway: 79.50 Mn</span>
              <span className="text-amber-400 font-medium">Target: 100.00 Mn (Dec 2029)</span>
            </div>
          </div>

          {/* Interactive Chart */}
          <div className="h-[420px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 15, bottom: 25 }}
              >
                <defs>
                  <linearGradient id="actualAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="targetAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />

                <XAxis
                  dataKey="month"
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  angle={-35}
                  textAnchor="end"
                  height={50}
                  interval={chartData.length > 25 ? 2 : 1}
                />

                <YAxis
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={[40, 110]}
                  tickFormatter={(val) => `${val}M`}
                />

                <Tooltip content={<CustomTargetTooltip />} />

                <Legend
                  verticalAlign="top"
                  align="right"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: "10px" }}
                />

                {/* Reference line at 100Mn */}
                <ReferenceLine
                  y={100}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: "100 Mn Goal (Dec 2029)",
                    fill: "#f59e0b",
                    fontSize: 11,
                    position: "insideTopRight",
                    offset: 10,
                  }}
                />

                {/* Reference line at 59Mn Base */}
                <ReferenceLine
                  y={59}
                  stroke="#3b82f6"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: "59 Mn Base (Oct 2026)",
                    fill: "#60a5fa",
                    fontSize: 11,
                    position: "insideBottomLeft",
                    offset: 10,
                  }}
                />

                {/* Actual Area fill up to recorded point */}
                <Area
                  type="monotone"
                  dataKey="actualMn"
                  name="Actual Wealth"
                  fill="url(#actualAreaGrad)"
                  stroke="none"
                />

                {/* Actual Wealth Solid Line */}
                <Line
                  type="monotone"
                  dataKey="actualMn"
                  name="Actual Wealth"
                  stroke="#10b981"
                  strokeWidth={3.5}
                  dot={{ r: 4, fill: "#10b981", strokeWidth: 1.5, stroke: "#0f172a" }}
                  activeDot={{ r: 7, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
                  connectNulls={false}
                />

                {/* Predicted Target Dashed Line */}
                <Line
                  type="monotone"
                  dataKey="targetMn"
                  name={`Predicted Target (${model === "linear" ? "Linear" : "CAGR"})`}
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  dot={{ r: 3, fill: "#f59e0b", strokeWidth: 1, stroke: "#0f172a" }}
                  activeDot={{ r: 6, fill: "#f59e0b", strokeWidth: 2, stroke: "#fff" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Toggle Table Section */}
          <div className="border-t border-white/10 pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTable(!showTable)}
              className="w-full flex items-center justify-between text-muted-foreground hover:text-white px-2 py-1"
            >
              <span className="flex items-center gap-2 font-semibold text-sm">
                <Layers className="w-4 h-4 text-amber-400" />
                Monthly Milestone & Target Breakdown ({chartData.filter((p) => p.target !== null).length} Months)
              </span>
              {showTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>

            {showTable && (
              <div className="mt-4 rounded-xl border border-white/10 overflow-hidden bg-background/40">
                <div className="max-h-[380px] overflow-y-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-white/5 sticky top-0 z-10 backdrop-blur-md">
                      <tr className="border-b border-white/10 text-muted-foreground">
                        <th className="py-2.5 px-3 font-semibold">Month</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Target (Mn)</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Target (LKR)</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Actual Wealth</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Variance / Gap</th>
                        <th className="py-2.5 px-3 font-semibold text-right">% of 100M</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartData
                        .filter((p) => p.target !== null)
                        .map((row) => {
                          const isRecorded = row.actual !== null;
                          const isAhead = row.variance !== null && row.variance >= 0;
                          const progressPct = ((row.actual !== null ? row.actual : row.target) / TARGET_AMOUNT) * 100;

                          return (
                            <tr
                              key={row.key}
                              className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                                row.isBase ? "bg-blue-500/10 font-medium" : row.isTarget ? "bg-amber-500/10 font-medium" : ""
                              }`}
                            >
                              <td className="py-2.5 px-3 font-medium flex items-center gap-2">
                                {row.isBase && <Badge className="bg-blue-500 text-[10px] h-4 px-1 py-0">Base</Badge>}
                                {row.isTarget && <Badge className="bg-amber-500 text-black text-[10px] h-4 px-1 py-0 font-bold">Goal</Badge>}
                                <span>{row.month}</span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-medium text-amber-300">
                                {row.targetMn.toFixed(2)} M
                              </td>
                              <td className="py-2.5 px-3 text-right text-muted-foreground">
                                {row.target.toLocaleString()} LKR
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold">
                                {isRecorded ? (
                                  <span className="text-emerald-400">
                                    {(row.actual / 1_000_000).toFixed(2)} M{" "}
                                    <span className="text-[10px] font-normal text-muted-foreground">
                                      ({row.actual.toLocaleString()} LKR)
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/60 italic">—</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-medium">
                                {isRecorded ? (
                                  <span className={isAhead ? "text-emerald-400" : "text-red-400"}>
                                    {isAhead ? "+" : ""}
                                    {(row.variance / 1_000_000).toFixed(2)} M ({isAhead ? "+" : ""}
                                    {row.variancePct.toFixed(1)}%)
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/40 italic">Projected</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right text-muted-foreground font-mono">
                                {progressPct.toFixed(1)}%
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {isRecorded ? (
                                  <Badge
                                    className={`text-[10px] h-5 px-1.5 font-bold ${
                                      isAhead
                                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                        : "bg-red-500/20 text-red-300 border-red-500/30"
                                    }`}
                                  >
                                    {isAhead ? "AHEAD" : "BEHIND"}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-muted-foreground border-white/10">
                                    UPCOMING
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Custom Tooltip component for rich presentation
function CustomTargetTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  const hasActual = data.actual !== null && data.actual !== undefined;
  const hasTarget = data.target !== null && data.target !== undefined;
  const isAhead = data.variance !== null && data.variance >= 0;

  return (
    <div className="bg-slate-900/95 border border-white/20 p-3 rounded-xl shadow-2xl backdrop-blur-md min-w-[220px] text-xs space-y-2">
      <div className="font-bold text-sm text-white border-b border-white/10 pb-1 flex items-center justify-between">
        <span>{label}</span>
        {data.isBase && <span className="text-[10px] text-blue-400 font-normal">Base Month</span>}
        {data.isTarget && <span className="text-[10px] text-amber-400 font-normal">Target Milestone</span>}
      </div>

      {hasActual && (
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Actual Wealth:
          </span>
          <span className="font-bold text-white text-right">
            {(data.actual / 1_000_000).toFixed(2)} Mn LKR
            <div className="text-[10px] font-normal text-muted-foreground">
              {data.actual.toLocaleString()} LKR
            </div>
          </span>
        </div>
      )}

      {hasTarget && (
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-amber-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Target Goal:
          </span>
          <span className="font-bold text-amber-300 text-right">
            {(data.target / 1_000_000).toFixed(2)} Mn LKR
            <div className="text-[10px] font-normal text-muted-foreground">
              {data.target.toLocaleString()} LKR
            </div>
          </span>
        </div>
      )}

      {hasActual && hasTarget && data.variance !== null && (
        <div className="border-t border-white/10 pt-1.5 flex items-center justify-between gap-4">
          <span className="text-muted-foreground font-medium">Variance (vs Target):</span>
          <span className={`font-bold ${isAhead ? "text-emerald-400" : "text-red-400"}`}>
            {isAhead ? "+" : ""}
            {(data.variance / 1_000_000).toFixed(2)} Mn ({isAhead ? "+" : ""}
            {data.variancePct.toFixed(1)}%)
          </span>
        </div>
      )}

      {!hasActual && hasTarget && (
        <div className="border-t border-white/10 pt-1 text-[11px] text-muted-foreground italic">
          Future Projected Milestone
        </div>
      )}
    </div>
  );
}
