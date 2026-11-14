"use client";

import React, { useMemo, useState } from "react";
import { useStocks } from "@/context/StocksContext";
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
  CartesianGrid,
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
  BarChart2,
  Coins,
  Landmark,
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
  const rounded = Number(n.toFixed(2));
  return `${rounded}%`;
};

function parseOptionalNumber(raw: string): number | null {
  const trimmed = raw.trim().replace(/,/g, "");
  if (trimmed === "") return null;
  const val = Number(trimmed);
  return isNaN(val) ? null : val;
}

function getSplitOffset(values: number[]): number {
  if (values.length === 0) return 0;
  const max = Math.max(...values);
  const min = Math.min(...values);
  if (max <= 0) return 0;
  if (min >= 0) return 1;
  return max / (max - min);
}

type MergedMetricRow = {
  id: string;
  period: string;
  invested: number | null;
  totalValue: number | null;
  gain: number | null;
  realizedGain: number | null;
  realizedGainPct: number | null;
  payOut: number | null;
  dividend: number | null;
  total: number | null;
};

type FormState = {
  period: string;
  invested: string;
  totalValue: string;
  realizedGain: string;
  payOut: string;
  dividend: string;
};

const EMPTY_FORM: FormState = {
  period: "",
  invested: "",
  totalValue: "",
  realizedGain: "",
  payOut: "",
  dividend: "",
};

export function MonthlyMetricsDashboard() {
  const { monthlyMetrics, upsertMonthlyMetric, deleteMonthlyMetric } = useStocks();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const rows: MergedMetricRow[] = useMemo(() => {
    const mapped: MergedMetricRow[] = monthlyMetrics.map((m) => {
      const invested = m.invested ?? null;
      const totalValue = m.totalValue ?? null;
      const realizedGain = m.realizedGain ?? null;
      const payOut = m.payOut ?? null;
      const dividend = m.dividend ?? null;

      const gain =
        invested !== null && totalValue !== null ? totalValue - invested : null;
      const realizedGainPct =
        realizedGain !== null && invested !== null && invested > 0
          ? (realizedGain / invested) * 100
          : null;
      const total =
        payOut !== null || dividend !== null
          ? (payOut ?? 0) + (dividend ?? 0)
          : null;

      return {
        id: m.id,
        period: m.period,
        invested,
        totalValue,
        gain,
        realizedGain,
        realizedGainPct,
        payOut,
        dividend,
        total,
      };
    });

    mapped.sort((a, b) => {
      if (a.period === "Before") return -1;
      if (b.period === "Before") return 1;
      return a.period.localeCompare(b.period);
    });

    return mapped;
  }, [monthlyMetrics]);

  // Summary / KPI calculations
  const summary = useMemo(() => {
    const withTotalValue = rows.filter((r) => r.totalValue !== null);
    const latestTotalValueRow =
      withTotalValue.length > 0 ? withTotalValue[withTotalValue.length - 1] : null;

    const withInvested = rows.filter((r) => r.invested !== null);
    const latestInvestedRow =
      withInvested.length > 0 ? withInvested[withInvested.length - 1] : null;

    const withValuation = rows.filter(
      (r) => r.invested !== null && r.totalValue !== null
    );
    const latestValuation =
      withValuation.length > 0 ? withValuation[withValuation.length - 1] : null;

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

    const net = totalRealizedGains + totalRealizedLosses + totalDividend;

    return {
      latestTotalValueRow,
      latestInvestedRow,
      latestValuation,
      totalRealizedGains,
      totalRealizedLosses,
      totalRealizedGainCol,
      totalPayOut,
      totalDividend,
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

  const gainValueOffset = useMemo(
    () => getSplitOffset(growthChartData.map((d) => d.Gain)),
    [growthChartData]
  );

  const gainPctOffset = useMemo(
    () =>
      getSplitOffset(
        growthChartData
          .map((d) => d["Gain %"])
          .filter((v): v is number => v !== null)
      ),
    [growthChartData]
  );

  const realizedGainChartData = useMemo(() => {
    return rows
      .filter((r) => r.realizedGain !== null)
      .map((r) => ({
        period: r.period,
        "Realized Gain": r.realizedGain as number,
        "Realized Gain %":
          r.realizedGainPct !== null
            ? Number(r.realizedGainPct.toFixed(2))
            : null,
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
        realizedGainPct: null,
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <Card className="bg-[#1c2026] border-[rgba(255,255,255,0.07)] rounded-[10px] relative overflow-hidden group shadow-none">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform text-[#94a3b8]">
            <BarChart2 className="h-20 w-20" />
          </div>
          <CardHeader className="pb-1">
            <CardDescription className="text-[#94a3b8] text-xs uppercase tracking-wider font-medium">
              Latest Portfolio Value
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-[#38bdf8] font-mono [font-feature-settings:'tnum']">
              {summary.latestTotalValueRow?.totalValue != null
                ? fmt(summary.latestTotalValueRow.totalValue)
                : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#64748b] italic">
              {summary.latestTotalValueRow
                ? `As of ${summary.latestTotalValueRow.period}`
                : "No entries yet"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#1c2026] border-[rgba(255,255,255,0.07)] rounded-[10px] relative overflow-hidden group shadow-none">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform text-[#94a3b8]">
            <Landmark className="h-20 w-20" />
          </div>
          <CardHeader className="pb-1">
            <CardDescription className="text-[#94a3b8] text-xs uppercase tracking-wider font-medium">
              Latest Invested
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-[#eab308] font-mono [font-feature-settings:'tnum']">
              {summary.latestInvestedRow?.invested != null
                ? fmt(summary.latestInvestedRow.invested)
                : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#64748b] italic">
              {summary.latestInvestedRow
                ? `As of ${summary.latestInvestedRow.period}`
                : "No entries yet"}
            </p>
          </CardContent>
        </Card>

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

      {/* Charts — all full width */}
      {rows.length > 0 && (
        <div className="space-y-6">
          {valuationChartData.length > 0 && (
            <Card className="bg-[#1c2026] border-[rgba(255,255,255,0.07)] rounded-[10px] shadow-none">
              <CardHeader>
                <CardTitle>Invested vs Total Value</CardTitle>
                <CardDescription>
                  Monthly capital invested compared against portfolio market value
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[340px]">
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
          )}

          {growthChartData.length > 0 && (
            <>
              <Card className="bg-[#1c2026] border-[rgba(255,255,255,0.07)] rounded-[10px] shadow-none">
                <CardHeader>
                  <CardTitle>Portfolio Growth (Value)</CardTitle>
                  <CardDescription>
                    Monthly unrealized gain/loss (Total Value − Invested) relative to 0
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[340px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={growthChartData}>
                      <defs>
                        <linearGradient id="splitGainStroke" x1="0" y1="0" x2="0" y2="1">
                          <stop offset={gainValueOffset} stopColor="#22c55e" stopOpacity={1} />
                          <stop offset={gainValueOffset} stopColor="#ef4444" stopOpacity={1} />
                        </linearGradient>
                        <linearGradient id="splitGainFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset={0} stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset={gainValueOffset} stopColor="#22c55e" stopOpacity={0.05} />
                          <stop offset={gainValueOffset} stopColor="#ef4444" stopOpacity={0.05} />
                          <stop offset={1} stopColor="#ef4444" stopOpacity={0.3} />
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
                      <ReferenceLine y={0} stroke="rgba(255,255,255,0.25)" strokeDasharray="3 3" />
                      <Area
                        type="monotone"
                        dataKey="Gain"
                        baseValue={0}
                        stroke="url(#splitGainStroke)"
                        strokeWidth={2.5}
                        fill="url(#splitGainFill)"
                        connectNulls
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-[#1c2026] border-[rgba(255,255,255,0.07)] rounded-[10px] shadow-none">
                <CardHeader>
                  <CardTitle>Portfolio Growth (%)</CardTitle>
                  <CardDescription>
                    Monthly gain/loss percentage against Invested capital relative to 0%
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[340px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={growthChartData}>
                      <defs>
                        <linearGradient id="splitGainPctStroke" x1="0" y1="0" x2="0" y2="1">
                          <stop offset={gainPctOffset} stopColor="#22c55e" stopOpacity={1} />
                          <stop offset={gainPctOffset} stopColor="#ef4444" stopOpacity={1} />
                        </linearGradient>
                        <linearGradient id="splitGainPctFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset={0} stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset={gainPctOffset} stopColor="#22c55e" stopOpacity={0.05} />
                          <stop offset={gainPctOffset} stopColor="#ef4444" stopOpacity={0.05} />
                          <stop offset={1} stopColor="#ef4444" stopOpacity={0.3} />
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
                      <ReferenceLine y={0} stroke="rgba(255,255,255,0.25)" strokeDasharray="3 3" />
                      <Area
                        type="monotone"
                        dataKey="Gain %"
                        baseValue={0}
                        stroke="url(#splitGainPctStroke)"
                        strokeWidth={2.5}
                        fill="url(#splitGainPctFill)"
                        connectNulls
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}

          {realizedGainChartData.length > 0 && (
            <Card className="bg-[#1c2026] border-[rgba(255,255,255,0.07)] rounded-[10px] shadow-none">
              <CardHeader>
                <CardTitle>Realized Gain</CardTitle>
                <CardDescription>
                  Monthly realized gains (value & percentage against Invested)
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={realizedGainChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="period" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} className="font-mono" />
                    <YAxis
                      yAxisId="left"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      className="font-mono"
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      className="font-mono"
                      tickFormatter={(v) => `${Number(v).toFixed(2)}%`}
                    />
                    <Tooltip
                      itemStyle={{ color: "#f1f5f9", fontFamily: "var(--font-ibm-plex-mono)" }}
                      labelStyle={{ color: "#94a3b8", fontFamily: "var(--font-ibm-plex-mono)" }}
                      contentStyle={{
                        backgroundColor: "#242932",
                        borderColor: "rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                      }}
                      formatter={(val: any, name: any) => {
                        if (name === "Realized Gain %") {
                          return [`${Number(val).toFixed(2)}%`, name];
                        }
                        return [fmt(Number(val)), name];
                      }}
                    />
                    <Legend />
                    <ReferenceLine yAxisId="left" y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="Realized Gain"
                      stroke="#22c55e"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "#22c55e" }}
                      activeDot={{ r: 6 }}
                      connectNulls
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="Realized Gain %"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 4, fill: "#38bdf8" }}
                      activeDot={{ r: 6 }}
                      connectNulls
                    />
                  </LineChart>
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
            Add or edit periods manually. Gain, Realized Gain %, and Total are calculated automatically.
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
                      No monthly metrics yet. Click &quot;Add / Update Period&quot; to enter your data.
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
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-[#94a3b8] hover:text-red-400"
                            onClick={() => {
                              if (confirm(`Delete metrics for ${row.period}?`)) {
                                deleteMonthlyMetric(row.id);
                              }
                            }}
                            title="Delete entry"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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
                        summary.totalPayOut + summary.totalDividend >= 0
                          ? "text-[#22c55e]"
                          : "text-[#ef4444]"
                      }`}
                    >
                      {fmt(summary.totalPayOut + summary.totalDividend)}
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
