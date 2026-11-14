"use client";

import React, { useMemo, useState } from "react";
import { useStocks } from "@/context/StocksContext";
import { StockMonthlyMetric } from "@/actions/stocks";
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
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  Coins,
  Pencil,
  Plus,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";

const MONTH_TO_NUM: Record<string, string> = {
  Jan: "01",
  Feb: "02",
  Mar: "03",
  Apr: "04",
  May: "05",
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
  Dec: "12",
};

function fyMonthToPeriod(financialYear: string, month: string): string | null {
  const parts = financialYear.split("/");
  if (parts.length !== 2) return null;
  const startYear = parseInt(parts[0], 10);
  const endYear = parseInt(parts[1], 10);
  const mNum = MONTH_TO_NUM[month];
  if (!mNum || isNaN(startYear) || isNaN(endYear)) return null;
  const isNextYear = month === "Jan" || month === "Feb" || month === "Mar";
  const year = isNextYear ? endYear : startYear;
  return `${year}/${mNum}`;
}

const fmt = (n: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

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
    snapshots,
    dividends,
    dividendGains,
    realizedGains,
    monthlyMetrics,
    upsertMonthlyMetric,
    deleteMonthlyMetric,
  } = useStocks();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Derive metrics from existing snapshots, realizedGains, dividends, dividendGains
  const rows: MergedMetricRow[] = useMemo(() => {
    const derivedMap = new Map<
      string,
      {
        invested: number | null;
        totalValue: number | null;
        realizedGain: number | null;
        realizedGainPct: number | null;
        payOut: number | null;
        dividend: number | null;
      }
    >();

    const ensure = (period: string) => {
      if (!derivedMap.has(period)) {
        derivedMap.set(period, {
          invested: null,
          totalValue: null,
          realizedGain: null,
          realizedGainPct: null,
          payOut: null,
          dividend: null,
        });
      }
      return derivedMap.get(period)!;
    };

    // 1. Snapshots -> Invested, Total Value, Pay Out
    snapshots.forEach((snap) => {
      const period = fyMonthToPeriod(snap.financialYear, snap.month);
      if (!period) return;
      const entry = ensure(period);
      entry.invested = snap.totalCost;
      entry.totalValue = snap.portfolioValue;
      if (snap.moneyOut !== 0) {
        entry.payOut = snap.moneyOut;
      }
    });

    // 2. Realized Gains -> grouped by sellDate YYYY/MM
    const rgGroups = new Map<string, { gain: number; cost: number }>();
    realizedGains.forEach((g) => {
      if (!g.sellDate || g.sellDate.length < 7) return;
      const period = g.sellDate.slice(0, 7).replace("-", "/");
      const proratedBuyCost =
        g.buyQuantity > 0
          ? (g.buyAmount / g.buyQuantity) * g.sellQuantity
          : g.buyAmount;
      const absGain = g.sellAmount - proratedBuyCost;
      const prev = rgGroups.get(period) || { gain: 0, cost: 0 };
      rgGroups.set(period, {
        gain: prev.gain + absGain,
        cost: prev.cost + proratedBuyCost,
      });
    });
    rgGroups.forEach((val, period) => {
      const entry = ensure(period);
      entry.realizedGain = val.gain;
      entry.realizedGainPct = val.cost > 0 ? (val.gain / val.cost) * 100 : null;
    });

    // 3. Dividends -> prefer dividendGains by date if present for that period, else dividends
    const divGainsByPeriod = new Map<string, number>();
    dividendGains.forEach((d) => {
      if (!d.dividendReceivedDate || d.dividendReceivedDate.length < 7) return;
      const period = d.dividendReceivedDate.slice(0, 7).replace("-", "/");
      divGainsByPeriod.set(
        period,
        (divGainsByPeriod.get(period) || 0) + d.dividendAmount
      );
    });

    const divsByPeriod = new Map<string, number>();
    dividends.forEach((d) => {
      const period = fyMonthToPeriod(d.financialYear, d.month);
      if (!period) return;
      divsByPeriod.set(period, (divsByPeriod.get(period) || 0) + d.amount);
    });

    const allDivPeriods = new Set([
      ...divGainsByPeriod.keys(),
      ...divsByPeriod.keys(),
    ]);
    allDivPeriods.forEach((period) => {
      const entry = ensure(period);
      if (divGainsByPeriod.has(period)) {
        entry.dividend = divGainsByPeriod.get(period)!;
      } else if (divsByPeriod.has(period)) {
        entry.dividend = divsByPeriod.get(period)!;
      }
    });

    // 4. Merge saved monthlyMetrics (saved overrides derived for that period)
    const savedByPeriod = new Map<string, StockMonthlyMetric>();
    monthlyMetrics.forEach((m) => savedByPeriod.set(m.period, m));

    const allPeriods = new Set([
      ...derivedMap.keys(),
      ...savedByPeriod.keys(),
    ]);

    const merged: MergedMetricRow[] = Array.from(allPeriods).map((period) => {
      const saved = savedByPeriod.get(period);
      const derived = derivedMap.get(period);

      const invested = saved ? (saved.invested ?? null) : (derived?.invested ?? null);
      const totalValue = saved ? (saved.totalValue ?? null) : (derived?.totalValue ?? null);
      const realizedGain = saved ? (saved.realizedGain ?? null) : (derived?.realizedGain ?? null);
      const realizedGainPct = saved
        ? (saved.realizedGainPct ?? null)
        : (derived?.realizedGainPct ?? null);
      const payOut = saved ? (saved.payOut ?? null) : (derived?.payOut ?? null);
      const dividend = saved ? (saved.dividend ?? null) : (derived?.dividend ?? null);

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
        isSaved: Boolean(saved),
      };
    });

    // Sort: "Before" first, then chronological YYYY/MM
    merged.sort((a, b) => {
      if (a.period === "Before") return -1;
      if (b.period === "Before") return 1;
      return a.period.localeCompare(b.period);
    });

    return merged;
  }, [snapshots, dividends, dividendGains, realizedGains, monthlyMetrics]);

  // Summary / KPI calculations
  const summary = useMemo(() => {
    const withValuation = rows.filter(
      (r) => r.invested !== null && r.totalValue !== null
    );
    const latestValuation =
      withValuation.length > 0
        ? withValuation[withValuation.length - 1]
        : null;

    const latestGainPct =
      latestValuation &&
      latestValuation.invested &&
      latestValuation.invested > 0 &&
      latestValuation.gain !== null
        ? (latestValuation.gain / latestValuation.invested) * 100
        : null;

    const totalRealizedGain = rows.reduce(
      (s, r) => s + (r.realizedGain ?? 0),
      0
    );
    const totalPayOut = rows.reduce((s, r) => s + (r.payOut ?? 0), 0);
    const totalDividend = rows.reduce((s, r) => s + (r.dividend ?? 0), 0);
    const grandTotal = totalPayOut + totalDividend;

    return {
      latestValuation,
      latestGainPct,
      totalRealizedGain,
      totalPayOut,
      totalDividend,
      grandTotal,
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

  const cashFlowChartData = useMemo(() => {
    return rows
      .filter(
        (r) =>
          r.payOut !== null ||
          r.dividend !== null ||
          r.realizedGain !== null
      )
      .map((r) => ({
        period: r.period,
        "Pay Out": r.payOut ?? 0,
        Dividend: r.dividend ?? 0,
        "Realized Gain": r.realizedGain ?? 0,
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
            <BarChart2 className="h-20 w-20" />
          </div>
          <CardHeader className="pb-1">
            <CardDescription className="text-[#94a3b8] text-xs uppercase tracking-wider font-medium">
              Latest Total Value
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-[#f1f5f9] font-mono [font-feature-settings:'tnum']">
              {summary.latestValuation?.totalValue != null
                ? fmt(summary.latestValuation.totalValue)
                : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#64748b] italic">
              {summary.latestValuation
                ? `Invested: ${
                    summary.latestValuation.invested != null
                      ? fmt(summary.latestValuation.invested)
                      : "—"
                  } (${summary.latestValuation.period})`
                : "No valuation data yet"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#1c2026] border-[rgba(255,255,255,0.07)] rounded-[10px] relative overflow-hidden group shadow-none">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform text-[#94a3b8]">
            <TrendingUp className="h-20 w-20" />
          </div>
          <CardHeader className="pb-1">
            <CardDescription className="text-[#94a3b8] text-xs uppercase tracking-wider font-medium">
              Latest Unrealized Gain
            </CardDescription>
            <CardTitle
              className={`text-3xl font-bold font-mono [font-feature-settings:'tnum'] ${
                (summary.latestValuation?.gain ?? 0) >= 0
                  ? "text-[#22c55e]"
                  : "text-[#ef4444]"
              }`}
            >
              {summary.latestValuation?.gain != null
                ? fmt(summary.latestValuation.gain)
                : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary.latestGainPct != null && (
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded border font-mono [font-feature-settings:'tnum'] ${
                  summary.latestGainPct >= 0
                    ? "bg-[rgba(34,197,94,0.12)] text-[#22c55e] border-[rgba(34,197,94,0.2)]"
                    : "bg-[rgba(239,68,68,0.12)] text-[#ef4444] border-[rgba(239,68,68,0.2)]"
                }`}
              >
                {summary.latestGainPct >= 0 ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                {fmtPct(summary.latestGainPct)}
              </span>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#1c2026] border-[rgba(255,255,255,0.07)] rounded-[10px] relative overflow-hidden group shadow-none">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform text-[#94a3b8]">
            <Coins className="h-20 w-20" />
          </div>
          <CardHeader className="pb-1">
            <CardDescription className="text-[#94a3b8] text-xs uppercase tracking-wider font-medium">
              Cumulative Realized Gain
            </CardDescription>
            <CardTitle
              className={`text-3xl font-bold font-mono [font-feature-settings:'tnum'] ${
                summary.totalRealizedGain >= 0
                  ? "text-[#22c55e]"
                  : "text-[#ef4444]"
              }`}
            >
              {fmt(summary.totalRealizedGain)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#64748b] italic">
              Total realized profits across all periods
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#1c2026] border-[rgba(255,255,255,0.07)] rounded-[10px] relative overflow-hidden group shadow-none">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform text-[#94a3b8]">
            <Wallet className="h-20 w-20" />
          </div>
          <CardHeader className="pb-1">
            <CardDescription className="text-[#94a3b8] text-xs uppercase tracking-wider font-medium">
              Total Cash Returned
            </CardDescription>
            <CardTitle
              className={`text-3xl font-bold font-mono [font-feature-settings:'tnum'] ${
                summary.grandTotal >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"
              }`}
            >
              {fmt(summary.grandTotal)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#64748b] font-mono [font-feature-settings:'tnum']">
              Pay Out: {fmt(summary.totalPayOut)} | Div: {fmt(summary.totalDividend)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {rows.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

          <Card className="bg-[#1c2026] border-[rgba(255,255,255,0.07)] rounded-[10px] shadow-none">
            <CardHeader>
              <CardTitle>Realized Gains, Pay Out & Dividends</CardTitle>
              <CardDescription>
                Monthly cash flows and realized profits across periods
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlowChartData}>
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
                    formatter={(val: any) => fmt(Number(val))}
                  />
                  <Legend />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
                  <Bar dataKey="Realized Gain" fill="#38bdf8" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Pay Out" fill="#22c55e" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Dividend" fill="#a855f7" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
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
                        summary.totalRealizedGain >= 0
                          ? "text-[#22c55e]"
                          : "text-[#ef4444]"
                      }`}
                    >
                      {fmt(summary.totalRealizedGain)}
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
