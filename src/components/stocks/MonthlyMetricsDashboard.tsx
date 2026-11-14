"use client";

import React, { useMemo, useState } from "react";
import { useStocks } from "@/context/StocksContext";
import { StockMonthlyMetric } from "@/actions/stocks";
import { DEFAULT_MONTHLY_METRICS } from "@/lib/stockMetricsDefaults";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Coins,
  Pencil,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

const fmt = (n: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const fmtRealizedPct = (n: number) => {
  // Match compact display like 0.65% or 1.6%
  const rounded = Number(n.toFixed(2));
  return `${rounded}%`;
};

function parseOptionalNumber(raw: string): number | null {
  const trimmed = raw.trim().replace(/,/g, "");
  if (trimmed === "") return null;
  const val = Number(trimmed);
  return isNaN(val) ? null : val;
}

type MergedMetricRow = {
  id?: string;
  period: string;
  invested: number | null;
  totalValue: number | null;
  gain: number | null;
  realizedGain: number | null;
  realizedGainPct: number | null;
  payOut: number | null;
  dividend: number | null;
  total: number | null;
  isSaved: boolean;
};

type FormState = {
  period: string;
  invested: string;
  totalValue: string;
  realizedGain: string;
  realizedGainPct: string;
  payOut: string;
  dividend: string;
};

const EMPTY_FORM: FormState = {
  period: "",
  invested: "",
  totalValue: "",
  realizedGain: "",
  realizedGainPct: "",
  payOut: "",
  dividend: "",
};

export function MonthlyMetricsDashboard() {
  const {
    monthlyMetrics,
    upsertMonthlyMetric,
    deleteMonthlyMetric,
  } = useStocks();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Use ONLY the provided baseline defaults + saved monthlyMetrics overrides/additions
  const rows: MergedMetricRow[] = useMemo(() => {
    const defaultByPeriod = new Map<string, StockMonthlyMetric>();
    DEFAULT_MONTHLY_METRICS.forEach((m) => defaultByPeriod.set(m.period, m));

    const savedByPeriod = new Map<string, StockMonthlyMetric>();
    monthlyMetrics.forEach((m) => savedByPeriod.set(m.period, m));

    const allPeriods = new Set([
      ...defaultByPeriod.keys(),
      ...savedByPeriod.keys(),
    ]);

    const merged: MergedMetricRow[] = Array.from(allPeriods).map((period) => {
      const saved = savedByPeriod.get(period);
      const source = saved ?? defaultByPeriod.get(period)!;

      const invested = source.invested ?? null;
      const totalValue = source.totalValue ?? null;
      const realizedGain = source.realizedGain ?? null;
      const realizedGainPct = source.realizedGainPct ?? null;
      const payOut = source.payOut ?? null;
      const dividend = source.dividend ?? null;

      const gain =
        invested !== null && totalValue !== null ? totalValue - invested : null;
      const total =
        payOut !== null || dividend !== null
          ? (payOut ?? 0) + (dividend ?? 0)
          : null;

      return {
        id: saved?.id,
        period,
        invested,
        totalValue,
        gain,
        realizedGain,
        realizedGainPct,
        payOut,
        dividend,
        total,
        isSaved: Boolean(saved && !saved.id.startsWith("default-")),
      };
    });

    // Sort: "Before" first, then chronological YYYY/MM
    merged.sort((a, b) => {
      if (a.period === "Before") return -1;
      if (b.period === "Before") return 1;
      return a.period.localeCompare(b.period);
    });

    return merged;
  }, [monthlyMetrics]);

  // Summary / KPI calculations
  const summary = useMemo(() => {
    const withValuation = rows.filter(
      (r) => r.invested !== null && r.totalValue !== null
    );
    const latestValuation =
      withValuation.length > 0
        ? withValuation[withValuation.length - 1]
        : null;

    let totalRealizedGains = 0;
    let totalRealizedLosses = 0;
    let totalRealizedGainCol = 0;
    let totalPayOut = 0;
    let totalDividend = 0;

    rows.forEach((r) => {
      if (r.realizedGain !== null) {
        totalRealizedGainCol += r.realizedGain;
        if (r.realizedGain >= 0) totalRealizedGains += r.realizedGain;
        else totalRealizedLosses += r.realizedGain;
      }
      if (r.payOut !== null) {
        totalPayOut += r.payOut;
        if (r.payOut >= 0) totalRealizedGains += r.payOut;
        else totalRealizedLosses += r.payOut;
      }
      if (r.dividend !== null) {
        totalDividend += r.dividend;
      }
    });

    const grandTotal = totalPayOut + totalDividend;
    const net = totalRealizedGains + totalRealizedLosses + totalDividend;

    return {
      latestValuation,
      totalRealizedGains,
      totalRealizedLosses,
      totalRealizedGainCol,
      totalPayOut,
      totalDividend,
      grandTotal,
      net,
    };
  }, [rows]);

  // Chart datasets
  const valuationChartData = useMemo(() => {
    return rows
      .filter(
        (r) =>
          r.period !== "Before" &&
          (r.invested !== null || r.totalValue !== null)
      )
      .map((r) => ({
        period: r.period,
        Invested: r.invested,
        "Total Value": r.totalValue,
        Gain: r.gain,
      }));
  }, [rows]);

  const growthChartData = useMemo(() => {
    return rows
      .filter((r) => r.period !== "Before" && r.gain !== null)
      .map((r) => ({
        period: r.period,
        Gain: r.gain as number,
        "Gain %":
          r.invested && r.invested > 0 && r.gain !== null
            ? Number(((r.gain / r.invested) * 100).toFixed(2))
            : null,
      }));
  }, [rows]);

  const realizedGainChartData = useMemo(() => {
    return rows
      .filter((r) => r.realizedGain !== null)
      .map((r) => ({
        period: r.period,
        "Realized Gain": r.realizedGain as number,
        "Realized Gain %": r.realizedGainPct,
      }));
  }, [rows]);

  // Modal handlers
  const openAddDialog = () => {
    setEditingPeriod(null);
    const now = new Date();
    const defaultPeriod = `${now.getFullYear()}/${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;
    setForm({
      ...EMPTY_FORM,
      period: defaultPeriod,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (row: MergedMetricRow) => {
    setEditingPeriod(row.period);
    setForm({
      period: row.period,
      invested: row.invested !== null ? String(row.invested) : "",
      totalValue: row.totalValue !== null ? String(row.totalValue) : "",
      realizedGain: row.realizedGain !== null ? String(row.realizedGain) : "",
      realizedGainPct:
        row.realizedGainPct !== null ? String(row.realizedGainPct) : "",
      payOut: row.payOut !== null ? String(row.payOut) : "",
      dividend: row.dividend !== null ? String(row.dividend) : "",
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedPeriod = form.period.trim();
    if (!trimmedPeriod) return;

    setSaving(true);
    try {
      await upsertMonthlyMetric({
        period: trimmedPeriod,
        invested: parseOptionalNumber(form.invested),
        totalValue: parseOptionalNumber(form.totalValue),
        realizedGain: parseOptionalNumber(form.realizedGain),
        realizedGainPct: parseOptionalNumber(form.realizedGainPct),
        payOut: parseOptionalNumber(form.payOut),
        dividend: parseOptionalNumber(form.dividend),
      });
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const previewInvested = parseOptionalNumber(form.invested);
  const previewTotalValue = parseOptionalNumber(form.totalValue);
  const previewGain =
    previewInvested !== null && previewTotalValue !== null
      ? previewTotalValue - previewInvested
      : null;

  const previewPayOut = parseOptionalNumber(form.payOut);
  const previewDividend = parseOptionalNumber(form.dividend);
  const previewTotal =
    previewPayOut !== null || previewDividend !== null
      ? (previewPayOut ?? 0) + (previewDividend ?? 0)
      : null;

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#f1f5f9]">
            Monthly Performance Metrics
          </h2>
          <p className="text-sm text-[#94a3b8]">
            Track invested capital, portfolio value, unrealized & realized gains, pay outs, and dividends by period.
          </p>
        </div>
        <Button onClick={openAddDialog} className="gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Add / Update Period
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <Card className="bg-[#1c2026] border-[rgba(255,255,255,0.07)] rounded-[10px] relative overflow-hidden group shadow-none">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform text-[#94a3b8]">
            <TrendingUp className="h-20 w-20" />
          </div>
          <CardHeader className="pb-1">
            <CardDescription className="text-[#94a3b8] text-xs uppercase tracking-wider font-medium">
              Total Realized Gains
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-[#22c55e] font-mono [font-feature-settings:'tnum']">
              {fmt(summary.totalRealizedGains)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#64748b] italic">
              Positive pay outs & realized gains
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#1c2026] border-[rgba(255,255,255,0.07)] rounded-[10px] relative overflow-hidden group shadow-none">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform text-[#94a3b8]">
            <TrendingDown className="h-20 w-20" />
          </div>
          <CardHeader className="pb-1">
            <CardDescription className="text-[#94a3b8] text-xs uppercase tracking-wider font-medium">
              Total Realized Losses
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-[#ef4444] font-mono [font-feature-settings:'tnum']">
              {fmt(summary.totalRealizedLosses)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#64748b] italic">
              Negative pay outs & realized losses
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#1c2026] border-[rgba(255,255,255,0.07)] rounded-[10px] relative overflow-hidden group shadow-none">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform text-[#94a3b8]">
            <Coins className="h-20 w-20" />
          </div>
          <CardHeader className="pb-1">
            <CardDescription className="text-[#94a3b8] text-xs uppercase tracking-wider font-medium">
              Dividends
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-[#f1f5f9] font-mono [font-feature-settings:'tnum']">
              {fmt(summary.totalDividend)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#64748b] italic">
              Total dividends received
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#1c2026] border-[rgba(255,255,255,0.07)] rounded-[10px] relative overflow-hidden group shadow-none">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform text-[#94a3b8]">
            <Wallet className="h-20 w-20" />
          </div>
          <CardHeader className="pb-1">
            <CardDescription className="text-[#94a3b8] text-xs uppercase tracking-wider font-medium">
              Net
            </CardDescription>
            <CardTitle
              className={`text-3xl font-bold font-mono [font-feature-settings:'tnum'] ${
                summary.net >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"
              }`}
            >
              {fmt(summary.net)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#64748b] italic">
              Realized gains + losses + dividends
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {rows.length > 0 && (
        <div className="space-y-6">
          <Card className="bg-[#1c2026] border-[rgba(255,255,255,0.07)] rounded-[10px] shadow-none">
            <CardHeader>
              <CardTitle>Invested vs Total Value</CardTitle>
              <CardDescription>
                Monthly capital invested compared against portfolio market value
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={valuationChartData}>
                  <defs>
                    <linearGradient id="gradMetricsValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradMetricsInvested" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#eab308" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="period" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} className="font-mono" />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    className="font-mono"
                    tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`}
                  />
                  <Tooltip
                    itemStyle={{ color: "#f1f5f9", fontFamily: "var(--font-ibm-plex-mono)" }}
                    labelStyle={{ color: "#94a3b8", fontFamily: "var(--font-ibm-plex-mono)" }}
                    contentStyle={{
                      backgroundColor: "#242932",
                      borderColor: "rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                    }}
                    formatter={(val: any) => (val != null ? fmt(Number(val)) : "—")}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="Total Value"
                    stroke="#38bdf8"
                    strokeWidth={2.5}
                    fill="url(#gradMetricsValue)"
                    connectNulls
                  />
                  <Area
                    type="monotone"
                    dataKey="Invested"
                    stroke="#eab308"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    fill="url(#gradMetricsInvested)"
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-[#1c2026] border-[rgba(255,255,255,0.07)] rounded-[10px] shadow-none">
              <CardHeader>
                <CardTitle>Portfolio Growth (Value)</CardTitle>
                <CardDescription>
                  Monthly unrealized gain/loss (Total Value − Invested)
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={growthChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="period" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} className="font-mono" />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      className="font-mono"
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      itemStyle={{ color: "#f1f5f9", fontFamily: "var(--font-ibm-plex-mono)" }}
                      labelStyle={{ color: "#94a3b8", fontFamily: "var(--font-ibm-plex-mono)" }}
                      contentStyle={{
                        backgroundColor: "#242932",
                        borderColor: "rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                      }}
                      formatter={(val: any) => [fmt(Number(val)), "Gain"]}
                    />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
                    <Bar dataKey="Gain" radius={[3, 3, 0, 0]}>
                      {growthChartData.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={entry.Gain >= 0 ? "#22c55e" : "#ef4444"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-[#1c2026] border-[rgba(255,255,255,0.07)] rounded-[10px] shadow-none">
              <CardHeader>
                <CardTitle>Portfolio Growth (%)</CardTitle>
                <CardDescription>
                  Monthly gain/loss percentage against Invested capital
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="period" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} className="font-mono" />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      className="font-mono"
                      tickFormatter={(v) => `${Number(v).toFixed(1)}%`}
                    />
                    <Tooltip
                      itemStyle={{ color: "#f1f5f9", fontFamily: "var(--font-ibm-plex-mono)" }}
                      labelStyle={{ color: "#94a3b8", fontFamily: "var(--font-ibm-plex-mono)" }}
                      contentStyle={{
                        backgroundColor: "#242932",
                        borderColor: "rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                      }}
                      formatter={(val: any) => [`${Number(val).toFixed(2)}%`, "Gain %"]}
                    />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
                    <Line
                      type="monotone"
                      dataKey="Gain %"
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "#38bdf8" }}
                      activeDot={{ r: 6 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {realizedGainChartData.length > 0 && (
            <Card className="bg-[#1c2026] border-[rgba(255,255,255,0.07)] rounded-[10px] shadow-none">
              <CardHeader>
                <CardTitle>Realized Gain</CardTitle>
                <CardDescription>
                  Monthly realized gains across periods
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={realizedGainChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="period" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} className="font-mono" />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      className="font-mono"
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      itemStyle={{ color: "#f1f5f9", fontFamily: "var(--font-ibm-plex-mono)" }}
                      labelStyle={{ color: "#94a3b8", fontFamily: "var(--font-ibm-plex-mono)" }}
                      contentStyle={{
                        backgroundColor: "#242932",
                        borderColor: "rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                      }}
                      formatter={(val: any, _name: any, props: any) => {
                        const pct = props?.payload?.["Realized Gain %"];
                        const formattedVal = fmt(Number(val));
                        return [
                          pct != null ? `${formattedVal} (${fmtRealizedPct(pct)})` : formattedVal,
                          "Realized Gain",
                        ];
                      }}
                    />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
                    <Bar dataKey="Realized Gain" radius={[3, 3, 0, 0]} maxBarSize={64}>
                      {realizedGainChartData.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={entry["Realized Gain"] >= 0 ? "#22c55e" : "#ef4444"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Metrics Table */}
      <Card className="bg-[#1c2026] border-[rgba(255,255,255,0.07)] rounded-[10px] shadow-none">
        <CardHeader>
          <CardTitle>Monthly Metrics Breakdown</CardTitle>
          <CardDescription>
            Click edit on any row to override or add values (e.g. Before, Pay Out, Realized Gain, or mid-month Dividends).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-white/10 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="font-semibold text-[#94a3b8]">Period</TableHead>
                  <TableHead className="text-right font-semibold text-[#94a3b8]">Invested</TableHead>
                  <TableHead className="text-right font-semibold text-[#94a3b8]">Total Value</TableHead>
                  <TableHead className="text-right font-semibold text-[#94a3b8]">Gain</TableHead>
                  <TableHead className="text-right font-semibold text-[#94a3b8]">Realized Gain</TableHead>
                  <TableHead className="text-right font-semibold text-[#94a3b8]">Pay Out</TableHead>
                  <TableHead className="text-right font-semibold text-[#94a3b8]">Dividend</TableHead>
                  <TableHead className="text-right font-semibold text-[#94a3b8]">Total</TableHead>
                  <TableHead className="text-right font-semibold text-[#94a3b8] w-[90px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-[#64748b]">
                      No monthly metrics yet. Add a period or add snapshots/realized gains to populate automatically.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.period} className="border-white/5 hover:bg-white/[0.03]">
                      <TableCell className="font-mono font-medium text-[#f1f5f9]">
                        {row.period}
                      </TableCell>
                      <TableCell className="text-right font-mono [font-feature-settings:'tnum'] text-[#e2e8f0]">
                        {row.invested !== null ? fmt(row.invested) : ""}
                      </TableCell>
                      <TableCell className="text-right font-mono [font-feature-settings:'tnum'] text-[#e2e8f0]">
                        {row.totalValue !== null ? fmt(row.totalValue) : ""}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono [font-feature-settings:'tnum'] font-semibold ${
                          row.gain === null
                            ? ""
                            : row.gain >= 0
                            ? "text-[#22c55e]"
                            : "text-[#ef4444]"
                        }`}
                      >
                        {row.gain !== null ? fmt(row.gain) : ""}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono [font-feature-settings:'tnum'] font-semibold ${
                          row.realizedGain === null
                            ? ""
                            : row.realizedGain >= 0
                            ? "text-[#22c55e]"
                            : "text-[#ef4444]"
                        }`}
                      >
                        {row.realizedGain !== null
                          ? row.realizedGainPct !== null
                            ? `${fmt(row.realizedGain)} | ${fmtRealizedPct(row.realizedGainPct)}`
                            : fmt(row.realizedGain)
                          : ""}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono [font-feature-settings:'tnum'] font-semibold ${
                          row.payOut === null
                            ? ""
                            : row.payOut >= 0
                            ? "text-[#22c55e]"
                            : "text-[#ef4444]"
                        }`}
                      >
                        {row.payOut !== null ? fmt(row.payOut) : ""}
                      </TableCell>
                      <TableCell className="text-right font-mono [font-feature-settings:'tnum'] font-semibold text-[#f1f5f9]">
                        {row.dividend !== null ? fmt(row.dividend) : ""}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono [font-feature-settings:'tnum'] font-semibold ${
                          row.total === null
                            ? ""
                            : row.total >= 0
                            ? "text-[#22c55e]"
                            : "text-[#ef4444]"
                        }`}
                      >
                        {row.total !== null ? fmt(row.total) : ""}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-[#94a3b8] hover:text-white"
                            onClick={() => openEditDialog(row)}
                            title="Edit period"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {row.isSaved && row.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-[#94a3b8] hover:text-red-400"
                              onClick={() => {
                                if (confirm(`Remove saved override for ${row.period}?`)) {
                                  deleteMonthlyMetric(row.id!);
                                }
                              }}
                              title="Delete saved entry"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              {rows.length > 0 && (
                <TableFooter className="bg-white/[0.04] border-t border-white/10">
                  <TableRow className="hover:bg-transparent">
                    <TableCell className="font-bold text-[#f1f5f9]">Summary</TableCell>
                    <TableCell className="text-right font-mono [font-feature-settings:'tnum'] font-bold text-[#f1f5f9]">
                      {summary.latestValuation?.invested != null
                        ? fmt(summary.latestValuation.invested)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono [font-feature-settings:'tnum'] font-bold text-[#f1f5f9]">
                      {summary.latestValuation?.totalValue != null
                        ? fmt(summary.latestValuation.totalValue)
                        : "—"}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono [font-feature-settings:'tnum'] font-bold ${
                        (summary.latestValuation?.gain ?? 0) >= 0
                          ? "text-[#22c55e]"
                          : "text-[#ef4444]"
                      }`}
                    >
                      {summary.latestValuation?.gain != null
                        ? fmt(summary.latestValuation.gain)
                        : "—"}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono [font-feature-settings:'tnum'] font-bold ${
                        summary.totalRealizedGainCol >= 0
                          ? "text-[#22c55e]"
                          : "text-[#ef4444]"
                      }`}
                    >
                      {fmt(summary.totalRealizedGainCol)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono [font-feature-settings:'tnum'] font-bold ${
                        summary.totalPayOut >= 0
                          ? "text-[#22c55e]"
                          : "text-[#ef4444]"
                      }`}
                    >
                      {fmt(summary.totalPayOut)}
                    </TableCell>
                    <TableCell className="text-right font-mono [font-feature-settings:'tnum'] font-bold text-[#f1f5f9]">
                      {fmt(summary.totalDividend)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono [font-feature-settings:'tnum'] font-bold ${
                        summary.grandTotal >= 0
                          ? "text-[#22c55e]"
                          : "text-[#ef4444]"
                      }`}
                    >
                      {fmt(summary.grandTotal)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Period Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#1c2026] border-white/10 text-[#f1f5f9] sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingPeriod ? `Edit Metrics — ${editingPeriod}` : "Add / Update Period Metrics"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="metric-period">Period (e.g. Before or 2025/10)</Label>
              <Input
                id="metric-period"
                value={form.period}
                onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
                placeholder="Before or YYYY/MM"
                required
                disabled={Boolean(editingPeriod)}
                className="bg-background/50 border-white/10 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="metric-invested">Invested</Label>
                <Input
                  id="metric-invested"
                  type="number"
                  step="any"
                  value={form.invested}
                  onChange={(e) => setForm((f) => ({ ...f, invested: e.target.value }))}
                  placeholder="Optional"
                  className="bg-background/50 border-white/10 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="metric-total-value">Total Value</Label>
                <Input
                  id="metric-total-value"
                  type="number"
                  step="any"
                  value={form.totalValue}
                  onChange={(e) => setForm((f) => ({ ...f, totalValue: e.target.value }))}
                  placeholder="Optional"
                  className="bg-background/50 border-white/10 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="metric-realized-gain">Realized Gain</Label>
                <Input
                  id="metric-realized-gain"
                  type="number"
                  step="any"
                  value={form.realizedGain}
                  onChange={(e) => setForm((f) => ({ ...f, realizedGain: e.target.value }))}
                  placeholder="Optional"
                  className="bg-background/50 border-white/10 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="metric-realized-pct">Realized Gain %</Label>
                <Input
                  id="metric-realized-pct"
                  type="number"
                  step="any"
                  value={form.realizedGainPct}
                  onChange={(e) => setForm((f) => ({ ...f, realizedGainPct: e.target.value }))}
                  placeholder="e.g. 0.65"
                  className="bg-background/50 border-white/10 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="metric-payout">Pay Out</Label>
                <Input
                  id="metric-payout"
                  type="number"
                  step="any"
                  value={form.payOut}
                  onChange={(e) => setForm((f) => ({ ...f, payOut: e.target.value }))}
                  placeholder="Optional (can be negative)"
                  className="bg-background/50 border-white/10 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="metric-dividend">Dividend</Label>
                <Input
                  id="metric-dividend"
                  type="number"
                  step="any"
                  value={form.dividend}
                  onChange={(e) => setForm((f) => ({ ...f, dividend: e.target.value }))}
                  placeholder="Optional"
                  className="bg-background/50 border-white/10 font-mono"
                />
              </div>
            </div>

            <div className="rounded-lg bg-white/[0.03] border border-white/10 p-3 flex items-center justify-between text-xs font-mono">
              <span>
                Calculated Gain:{" "}
                <strong
                  className={
                    previewGain === null
                      ? "text-[#94a3b8]"
                      : previewGain >= 0
                      ? "text-[#22c55e]"
                      : "text-[#ef4444]"
                  }
                >
                  {previewGain !== null ? fmt(previewGain) : "—"}
                </strong>
              </span>
              <span>
                Calculated Total:{" "}
                <strong
                  className={
                    previewTotal === null
                      ? "text-[#94a3b8]"
                      : previewTotal >= 0
                      ? "text-[#22c55e]"
                      : "text-[#ef4444]"
                  }
                >
                  {previewTotal !== null ? fmt(previewTotal) : "—"}
                </strong>
              </span>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Period"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
