"use client";

import React, { useState, useMemo } from "react";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { useStocks } from "@/context/StocksContext";
import {
  FINANCIAL_YEAR_MONTHS,
  currentFinancialYear,
  currentFinancialMonth,
  generateFinancialYears,
} from "@/context/TaxContext";
import { AddStockModal } from "./AddStockModal";
import {
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

const SECURITY_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b",
  "#10b981", "#06b6d4", "#3b82f6", "#a78bfa", "#fb923c",
  "#34d399", "#f472b6", "#60a5fa", "#fbbf24", "#a3e635",
];

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  sub,
  color,
  icon,
  pct,
}: {
  title: string;
  value: string;
  sub?: string;
  color: string;
  icon: React.ReactNode;
  pct?: number | null;
}) {
  const positive = pct == null || pct >= 0;
  return (
    <Card className={`bg-gradient-to-br ${color} border-white/10 relative overflow-hidden group`}>
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <CardHeader className="pb-1">
        <CardDescription className="text-white/50 text-xs uppercase tracking-wider">
          {title}
        </CardDescription>
        <CardTitle className="text-3xl font-black text-white/90 tabular-nums">
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pct != null && (
          <span
            className={`flex items-center gap-1 text-sm font-semibold ${
              positive ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {positive ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : (
              <ArrowDownRight className="h-4 w-4" />
            )}
            {fmtPct(pct)}
          </span>
        )}
        {sub && <p className="text-xs text-white/30 italic mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function StocksDashboard() {
  const { snapshots, dividends, deleteSnapshot, deleteDividend, isLoaded } = useStocks();
  const availableYears = generateFinancialYears(4);

  const [selectedYear, setSelectedYear] = useState(currentFinancialYear());
  const [selectedMonth, setSelectedMonth] = useState<string>(currentFinancialMonth());
  const [viewMode, setViewMode] = useState<"monthly" | "fy">("monthly");

  // ─── Month Navigation ──────────────────────────────────────────────────────
  const handlePrevMonth = () => {
    const idx = FINANCIAL_YEAR_MONTHS.indexOf(selectedMonth as any);
    if (idx === 0) {
      const [s, e] = selectedYear.split("/").map(Number);
      setSelectedYear(`${s - 1}/${e - 1}`);
      setSelectedMonth(FINANCIAL_YEAR_MONTHS[FINANCIAL_YEAR_MONTHS.length - 1]);
    } else {
      setSelectedMonth(FINANCIAL_YEAR_MONTHS[idx - 1]);
    }
  };

  const handleNextMonth = () => {
    const idx = FINANCIAL_YEAR_MONTHS.indexOf(selectedMonth as any);
    if (idx === FINANCIAL_YEAR_MONTHS.length - 1) {
      const [s, e] = selectedYear.split("/").map(Number);
      setSelectedYear(`${s + 1}/${e + 1}`);
      setSelectedMonth(FINANCIAL_YEAR_MONTHS[0]);
    } else {
      setSelectedMonth(FINANCIAL_YEAR_MONTHS[idx + 1]);
    }
  };

  // ─── Data derivations ─────────────────────────────────────────────────────
  const fySnapshots = useMemo(
    () =>
      snapshots
        .filter((s) => s.financialYear === selectedYear)
        .sort(
          (a, b) =>
            FINANCIAL_YEAR_MONTHS.indexOf(a.month as any) -
            FINANCIAL_YEAR_MONTHS.indexOf(b.month as any)
        ),
    [snapshots, selectedYear]
  );
  
  const fyDividends = useMemo(
    () => dividends.filter(d => d.financialYear === selectedYear),
    [dividends, selectedYear]
  );
  
  const monthlyDividends = useMemo(
    () => fyDividends.filter(d => d.month === selectedMonth),
    [fyDividends, selectedMonth]
  );

  const currentSnap = useMemo(
    () => fySnapshots.find((s) => s.month === selectedMonth) ?? null,
    [fySnapshots, selectedMonth]
  );

  const prevSnap = useMemo(() => {
    if (!currentSnap) return null;
    const allSnaps = [...snapshots].sort((a, b) => {
      const aStart = parseInt(a.financialYear.split("/")[0], 10);
      const bStart = parseInt(b.financialYear.split("/")[0], 10);
      if (aStart !== bStart) return aStart - bStart;
      return FINANCIAL_YEAR_MONTHS.indexOf(a.month as any) - FINANCIAL_YEAR_MONTHS.indexOf(b.month as any);
    });
    
    const currIdx = allSnaps.findIndex(s => s.id === currentSnap.id);
    if (currIdx > 0) return allSnaps[currIdx - 1];
    return null;
  }, [currentSnap, snapshots]);

  const prevHoldingsMap = useMemo(() => {
    const map = new Map<string, any>();
    if (prevSnap) {
      prevSnap.holdings.forEach(h => map.set(h.security, h));
    }
    return map;
  }, [prevSnap]);

  const sortedHoldings = useMemo(() => {
    if (!currentSnap) return [];
    return [...currentSnap.holdings].sort((a, b) => b.totalCost - a.totalCost);
  }, [currentSnap]);

  const gainLoss = currentSnap
    ? currentSnap.portfolioValue - currentSnap.totalCost
    : 0;
  const gainLossPct = currentSnap && currentSnap.totalCost > 0
    ? (gainLoss / currentSnap.totalCost) * 100
    : null;

  const fyChartData = useMemo(() => {
    return FINANCIAL_YEAR_MONTHS.map((m) => {
      const snap = fySnapshots.find((s) => s.month === m);
      const mDivs = fyDividends.filter(d => d.month === m);
      const totalDiv = mDivs.reduce((sum, d) => sum + d.amount, 0);

      return {
        month: m,
        "Portfolio Value": snap?.portfolioValue ?? null,
        "Total Cost": snap?.totalCost ?? null,
        "Gain/Loss": snap ? snap.portfolioValue - snap.totalCost : null,
        "Money Out": snap?.moneyOut ?? null,
        "Dividends": totalDiv > 0 ? totalDiv : null,
      };
    });
  }, [fySnapshots, fyDividends]);

  const fyTotals = useMemo(() => {
    const totalMoneyOut = fySnapshots.reduce((s, r) => s + r.moneyOut, 0);
    const totalDividends = fyDividends.reduce((s, r) => s + r.amount, 0);
    const latestSnap = fySnapshots[fySnapshots.length - 1];
    
    const yieldPct = (latestSnap && latestSnap.totalCost > 0)
      ? (totalDividends / latestSnap.totalCost) * 100
      : null;

    return { totalMoneyOut, totalDividends, latestSnap, yieldPct };
  }, [fySnapshots, fyDividends]);

  const fyDividendsPieData = useMemo(() => {
    const map = new Map<string, number>();
    fyDividends.forEach((d) => {
      map.set(d.security, (map.get(d.security) || 0) + d.amount);
    });
    return Array.from(map.entries())
      .map(([security, amount]) => ({ security, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [fyDividends]);

  const fyYieldData = useMemo(() => {
    const map = new Map<string, { amount: number; latestDivMonth: string; count: number }>();
    for (const div of fyDividends) {
      const existing = map.get(div.security);
      if (!existing) {
        map.set(div.security, { amount: div.amount, latestDivMonth: div.month, count: 1 });
      } else {
        existing.amount += div.amount;
        existing.count += 1;
        // Keep the latest chronological month
        const oldIdx = FINANCIAL_YEAR_MONTHS.indexOf(existing.latestDivMonth as any);
        const newIdx = FINANCIAL_YEAR_MONTHS.indexOf(div.month as any);
        if (newIdx > oldIdx) existing.latestDivMonth = div.month;
      }
    }

    return Array.from(map.entries()).map(([security, data]) => {
      let cost = 0;
      
      const snapsWithSec = fySnapshots.filter((s) => s.holdings.some((h) => h.security === security));

      if (snapsWithSec.length > 0) {
        let targetSnap = snapsWithSec.find((s) => s.month === data.latestDivMonth);
        
        if (!targetSnap) {
          targetSnap = snapsWithSec[snapsWithSec.length - 1];
        }
        
        const holding = targetSnap.holdings.find((h) => h.security === security);
        if (holding) cost = holding.totalCost;
      }
      
      const yieldGross = cost > 0 ? (data.amount / cost) * 100 : 0;
      const yieldNet = cost > 0 ? ((data.amount * 0.85) / cost) * 100 : 0;
      
      return {
        security,
        totalDividend: data.amount,
        dividendCount: data.count,
        totalCost: cost,
        yieldGross,
        yieldNet
      };
    }).sort((a, b) => b.totalDividend - a.totalDividend);
  }, [fyDividends, fySnapshots]);

  // Holdings pie data for current month (if XLSX uploaded)
  const holdingsPieData = useMemo(() => {
    if (!currentSnap || currentSnap.holdings.length === 0) return [];
    return currentSnap.holdings
      .filter((h) => h.marketValue > 0)
      .sort((a, b) => b.marketValue - a.marketValue)
      .slice(0, 12); // cap at 12 for readability
  }, [currentSnap]);

  // ─── Empty state ──────────────────────────────────────────────────────────
  if (isLoaded && snapshots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
        <div className="p-5 bg-primary/10 rounded-3xl border border-primary/20">
          <BarChart2 className="h-16 w-16 text-primary opacity-60" />
        </div>
        <h3 className="text-2xl font-bold tracking-tight">No Portfolio Data Yet</h3>
        <p className="text-muted-foreground max-w-sm">
          Add your first month-end snapshot manually or upload your broker&apos;s XLSX export to get started.
        </p>
        <AddStockModal />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header Controls ─── */}
      <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between p-4 bg-card/40 backdrop-blur-md rounded-2xl border border-white/10">
        <div className="flex flex-wrap items-center gap-3">
          {/* Year selector */}
          <Select value={selectedYear} onValueChange={(v) => { if (v) setSelectedYear(v); }}>
            <SelectTrigger className="w-[140px] bg-background/50 border-white/10 font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Month navigator — only in monthly mode */}
          {viewMode === "monthly" && (
            <div className="flex items-center gap-1 bg-background/50 rounded-xl border border-white/10 p-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/5" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Select value={selectedMonth} onValueChange={(v) => { if (v) setSelectedMonth(v); }}>
                <SelectTrigger className="w-[100px] border-none bg-transparent font-medium focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FINANCIAL_YEAR_MONTHS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/5" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="h-8 w-px bg-white/10 hidden xl:block" />

          {/* Monthly / FY toggle */}
          <div className="flex bg-background/50 p-1 rounded-xl border border-white/10">
            <Button
              variant={viewMode === "monthly" ? "default" : "ghost"}
              onClick={() => setViewMode("monthly")}
              className="h-8 rounded-lg"
            >
              Monthly
            </Button>
            <Button
              variant={viewMode === "fy" ? "default" : "ghost"}
              onClick={() => setViewMode("fy")}
              className="h-8 rounded-lg"
            >
              FY View
            </Button>
          </div>
        </div>

        <AddStockModal />
      </div>

      {/* ═══════════════ MONTHLY VIEW ═══════════════ */}
      {viewMode === "monthly" && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            <KpiCard
              title="Portfolio Value"
              value={currentSnap ? fmt(currentSnap.portfolioValue) : "—"}
              sub="Market value at month end"
              color="from-violet-500/15 to-indigo-500/15"
              icon={<BarChart2 className="h-24 w-24" />}
              pct={null}
            />
            <KpiCard
              title="Total Cost"
              value={currentSnap ? fmt(currentSnap.totalCost) : "—"}
              sub="Total amount invested"
              color="from-blue-500/15 to-cyan-500/15"
              icon={<DollarSign className="h-24 w-24" />}
              pct={null}
            />
            <KpiCard
              title="Unrealized Gain/Loss"
              value={currentSnap ? fmt(gainLoss) : "—"}
              sub="Portfolio Value − Total Cost"
              color={
                gainLoss >= 0
                  ? "from-emerald-500/15 to-teal-500/15"
                  : "from-red-500/15 to-rose-500/15"
              }
              icon={gainLoss >= 0 ? <TrendingUp className="h-24 w-24" /> : <TrendingDown className="h-24 w-24" />}
              pct={gainLossPct}
            />
            <KpiCard
              title="Total Dividends"
              value={monthlyDividends.length > 0 ? fmt(monthlyDividends.reduce((s, d) => s + d.amount, 0)) : "0"}
              sub="Dividends received this month"
              color="from-amber-500/15 to-orange-500/15"
              icon={<Wallet className="h-24 w-24" />}
              pct={null}
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Value vs Cost Donut */}
            <Card>
              <CardHeader>
                <CardTitle>Value vs Cost</CardTitle>
                <CardDescription>Portfolio market value compared to total invested cost</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {currentSnap ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Total Cost", value: currentSnap.totalCost },
                          {
                            name: gainLoss >= 0 ? "Unrealized Gain" : "Unrealized Loss",
                            value: Math.abs(gainLoss),
                          },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${((percent || 0) * 100).toFixed(0)}%`
                        }
                      >
                        <Cell fill="#6366f1" />
                        <Cell fill={gainLoss >= 0 ? "#10b981" : "#f43f5e"} />
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "12px",
                        }}
                        formatter={(val: any) => val?.toLocaleString()}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground italic text-sm">
                    No snapshot for {selectedMonth}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Holdings breakdown by security */}
            <Card>
              <CardHeader>
                <CardTitle>Holdings Breakdown</CardTitle>
                <CardDescription>
                  {holdingsPieData.length > 0
                    ? "Market value by security (from XLSX)"
                    : "Upload XLSX to see per-security breakdown"}
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {holdingsPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={holdingsPieData}
                        dataKey="marketValue"
                        nameKey="security"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        label={({ name, percent }: any) =>
                          (percent ?? 0) > 0.05 ? `${String(name)} ${(((percent ?? 0)) * 100).toFixed(0)}%` : ""
                        }
                      >
                        {holdingsPieData.map((_, i) => (
                          <Cell key={i} fill={SECURITY_COLORS[i % SECURITY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "12px",
                        }}
                        formatter={(val: any) => val?.toLocaleString()}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground italic text-sm">
                    {currentSnap
                      ? "No holdings data — upload XLSX for breakdown"
                      : `No snapshot for ${selectedMonth}`}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Holdings Table */}
          {currentSnap && currentSnap.holdings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Holdings Detail</CardTitle>
                <CardDescription>
                  Per-security breakdown for {selectedMonth} {selectedYear}
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Security</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Avg Price</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead className="text-right">Traded Price</TableHead>
                      <TableHead className="text-right">Market Value</TableHead>
                      <TableHead className="text-right">Unr. G/L</TableHead>
                      <TableHead className="text-right">Unr. G/L %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedHoldings.map((h, i) => {
                      const prev = prevHoldingsMap.get(h.security);
                      const diffTraded = prev ? h.tradedPrice - prev.tradedPrice : 0;
                      const diffCost = prev ? h.totalCost - prev.totalCost : 0;
                      const diffMarketValue = prev ? h.marketValue - prev.marketValue : 0;

                      // Derive explicitly in case of bad historic parses
                      const derivedGL = h.marketValue - h.totalCost;
                      const derivedPct = h.totalCost > 0 ? (derivedGL / h.totalCost) * 100 : 0;

                      const formatDiff = (d: number) => {
                        if (Math.abs(d) < 0.01) return null;
                        const isPos = d > 0;
                        return (
                          <span className={`text-[10px] block mt-0.5 ${isPos ? 'text-emerald-400/80' : 'text-red-400/80'}`}>
                            {isPos ? '▲' : '▼'} {fmt(Math.abs(d))}
                          </span>
                        );
                      };

                      return (
                        <TableRow key={i} className="group transition-colors">
                          <TableCell className="font-semibold">{h.security}</TableCell>
                          <TableCell className="text-right font-mono">{fmt(h.quantity)}</TableCell>
                          <TableCell className="text-right font-mono">{fmt(h.avgPrice)}</TableCell>
                          <TableCell className="text-right font-mono flex-col justify-end">
                            <div>{fmt(h.totalCost)}</div>
                            {formatDiff(diffCost)}
                          </TableCell>
                          <TableCell className="text-right font-mono flex-col justify-end">
                            <div>{fmt(h.tradedPrice)}</div>
                            {formatDiff(diffTraded)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold flex-col justify-end">
                            <div>{fmt(h.marketValue)}</div>
                            {formatDiff(diffMarketValue)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono font-bold ${
                              derivedGL >= 0 ? "text-emerald-400" : "text-red-400"
                            }`}
                          >
                            {fmt(derivedGL)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono ${
                              derivedPct >= 0 ? "text-emerald-400" : "text-red-400"
                            }`}
                          >
                            {fmtPct(derivedPct)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {/* Totals row */}
                    <TableRow className="border-t-2 border-white/10 font-bold bg-white/5">
                      <TableCell>TOTAL</TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell className="text-right font-mono">
                        {fmt(currentSnap.holdings.reduce((s, h) => s + h.totalCost, 0))}
                      </TableCell>
                      <TableCell />
                      <TableCell className="text-right font-mono">
                        {fmt(currentSnap.holdings.reduce((s, h) => s + h.marketValue, 0))}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono ${
                          currentSnap.holdings.reduce((s, h) => s + h.unrealizedGainLoss, 0) >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {fmt(currentSnap.holdings.reduce((s, h) => s + h.unrealizedGainLoss, 0))}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Monthly Dividends Table */}
          {monthlyDividends.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Dividends Received</CardTitle>
                <CardDescription>Dividends for {selectedMonth} {selectedYear}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Security</TableHead>
                      <TableHead className="text-right">Amount (LKR)</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyDividends.map((div) => (
                      <TableRow key={div.id}>
                        <TableCell className="font-semibold">{div.security}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-emerald-400">
                          +{fmt(div.amount)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteDividend(div.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 border-white/10 font-bold bg-white/5">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-right font-mono text-emerald-400">
                        {fmt(monthlyDividends.reduce((s, d) => s + d.amount, 0))}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ═══════════════ FY VIEW ═══════════════ */}
      {viewMode === "fy" && (
        <>
          {/* FY KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <KpiCard
              title="Latest Portfolio Value"
              value={fyTotals.latestSnap ? fmt(fyTotals.latestSnap.portfolioValue) : "—"}
              sub={fyTotals.latestSnap ? `As of ${fyTotals.latestSnap.month}` : "No data yet"}
              color="from-violet-500/15 to-indigo-500/15"
              icon={<BarChart2 className="h-24 w-24" />}
              pct={null}
            />
            <KpiCard
              title="Latest Unrealized G/L"
              value={
                fyTotals.latestSnap
                  ? fmt(fyTotals.latestSnap.portfolioValue - fyTotals.latestSnap.totalCost)
                  : "—"
              }
              sub="At most recent snapshot"
              color={
                fyTotals.latestSnap &&
                fyTotals.latestSnap.portfolioValue >= fyTotals.latestSnap.totalCost
                  ? "from-emerald-500/15 to-teal-500/15"
                  : "from-red-500/15 to-rose-500/15"
              }
              icon={<TrendingUp className="h-24 w-24" />}
              pct={
                fyTotals.latestSnap && fyTotals.latestSnap.totalCost > 0
                  ? ((fyTotals.latestSnap.portfolioValue - fyTotals.latestSnap.totalCost) /
                      fyTotals.latestSnap.totalCost) *
                    100
                  : null
              }
            />
            <KpiCard
              title="Total Dividends (FY)"
              value={fmt(fyTotals.totalDividends)}
              sub="Total dividends received this year"
              color="from-amber-500/15 to-orange-500/15"
              icon={<Wallet className="h-24 w-24" />}
              pct={fyTotals.yieldPct}
            />
          </div>

          {/* Portfolio Value Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Value vs Cost — FY Trend</CardTitle>
              <CardDescription>Month-end portfolio value and total cost across {selectedYear}</CardDescription>
            </CardHeader>
            <CardContent className="h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-white/5" />
                  <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "12px",
                    }}
                    formatter={(val: any) => val?.toLocaleString()}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="Portfolio Value"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fill="url(#gradValue)"
                    connectNulls
                    dot={{ fill: "#6366f1", r: 4 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Total Cost"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fill="url(#gradCost)"
                    strokeDasharray="5 5"
                    connectNulls
                    dot={{ fill: "#06b6d4", r: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly Gain/Loss bar chart */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Unrealized Gain / Loss</CardTitle>
                <CardDescription>Portfolio Value minus Total Cost, per month</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fyChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-white/5" />
                    <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "12px",
                      }}
                      formatter={(val: any) => val?.toLocaleString()}
                    />
                    <Bar dataKey="Gain/Loss" radius={[6, 6, 0, 0]}>
                      {fyChartData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={(entry["Gain/Loss"] ?? 0) >= 0 ? "#10b981" : "#f43f5e"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Money Out trend */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Money Out</CardTitle>
                <CardDescription>Cash income withdrawn from portfolio, per month</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fyChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-white/5" />
                    <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "12px",
                      }}
                      formatter={(val: any) => val?.toLocaleString()}
                    />
                    <Bar dataKey="Money Out" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Dividends Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Dividends</CardTitle>
                <CardDescription>Dividends collected per month across {selectedYear}</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fyChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-white/5" />
                    <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "12px",
                      }}
                      formatter={(val: any) => val?.toLocaleString()}
                    />
                    <Bar dataKey="Dividends" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dividend Breakdown</CardTitle>
                <CardDescription>
                  {fyDividendsPieData.length > 0
                    ? `Dividend income by security for FY ${selectedYear}`
                    : "No dividends recorded yet"}
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {fyDividendsPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={fyDividendsPieData}
                        dataKey="amount"
                        nameKey="security"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        label={({ name, percent }: any) =>
                          (percent ?? 0) > 0.05 ? `${String(name)} ${(((percent ?? 0)) * 100).toFixed(0)}%` : ""
                        }
                      >
                        {fyDividendsPieData.map((_, i) => (
                          <Cell key={i} fill={SECURITY_COLORS[i % SECURITY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "12px",
                        }}
                        formatter={(val: any) => val?.toLocaleString()}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground italic text-sm">
                    No dividends data for FY {selectedYear}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Snapshot Ledger */}
          <Card>
            <CardHeader>
              <CardTitle>Snapshot Ledger</CardTitle>
              <CardDescription>All month-end snapshots for FY {selectedYear}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Portfolio Value</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead className="text-right">Unrealized G/L</TableHead>
                    <TableHead className="text-right">G/L %</TableHead>
                    <TableHead className="text-right">Money Out</TableHead>
                    <TableHead className="text-center">Holdings</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fySnapshots.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground italic">
                        No snapshots for FY {selectedYear}
                      </TableCell>
                    </TableRow>
                  )}
                  {fySnapshots.map((snap) => {
                    const gl = snap.portfolioValue - snap.totalCost;
                    const glPct =
                      snap.totalCost > 0 ? (gl / snap.totalCost) * 100 : 0;
                    return (
                      <TableRow key={snap.id} className="group transition-colors">
                        <TableCell className="font-semibold text-primary/80">{snap.month}</TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          {fmt(snap.portfolioValue)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {fmt(snap.totalCost)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono font-bold ${
                            gl >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {fmt(gl)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono ${
                            glPct >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {fmtPct(glPct)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {fmt(snap.moneyOut)}
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {snap.holdings.length > 0
                            ? `${snap.holdings.length} securities`
                            : "Manual"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                            onClick={() => deleteSnapshot(snap.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* FY Dividends Ledger */}
          <Card>
            <CardHeader>
              <CardTitle>Dividends Ledger</CardTitle>
              <CardDescription>All dividends received in FY {selectedYear}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Security</TableHead>
                    <TableHead className="text-right">Amount (LKR)</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fyDividends.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground italic">
                        No dividends recorded for this year.
                      </TableCell>
                    </TableRow>
                  )}
                  {fyDividends
                    .sort((a, b) => FINANCIAL_YEAR_MONTHS.indexOf(a.month as any) - FINANCIAL_YEAR_MONTHS.indexOf(b.month as any))
                    .map((div) => (
                    <TableRow key={div.id} className="group">
                      <TableCell className="font-semibold text-primary/80">{div.month}</TableCell>
                      <TableCell className="font-semibold">{div.security}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-emerald-400">
                        +{fmt(div.amount)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                          onClick={() => deleteDividend(div.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {fyDividends.length > 0 && (
                    <TableRow className="border-t-2 border-white/10 font-bold bg-white/5">
                      <TableCell colSpan={2}>TOTAL DIVIDENDS</TableCell>
                      <TableCell className="text-right font-mono text-emerald-400">
                        {fmt(fyDividends.reduce((s, d) => s + d.amount, 0))}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* FY Dividend Yield Table */}
          {fyYieldData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Dividend Yield by Security</CardTitle>
                <CardDescription>Calculated against total cost from the lowest matching snapshot</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Security</TableHead>
                      <TableHead className="text-right">No. of Dividends</TableHead>
                      <TableHead className="text-right">Total Dividend</TableHead>
                      <TableHead className="text-right">Total Cost Base</TableHead>
                      <TableHead className="text-right">Gross Yield %</TableHead>
                      <TableHead className="text-right">Net Yield % (after 15% tax)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fyYieldData.map((row, i) => (
                      <TableRow key={i} className="group transition-colors">
                        <TableCell className="font-semibold">{row.security}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {row.dividendCount}
                        </TableCell>
                        <TableCell className="text-right font-mono text-emerald-400 font-bold">
                          {fmt(row.totalDividend)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {row.totalCost > 0 ? fmt(row.totalCost) : "—"}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono font-bold ${
                            row.yieldGross >= 5 ? "text-emerald-400" : row.yieldGross > 0 ? "text-blue-400" : "text-muted-foreground"
                          }`}
                        >
                          {row.totalCost > 0 ? fmtPct(row.yieldGross) : "—"}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono font-bold ${
                            row.yieldNet >= 5 ? "text-emerald-400" : row.yieldNet > 0 ? "text-blue-400" : "text-muted-foreground"
                          }`}
                        >
                          {row.totalCost > 0 ? fmtPct(row.yieldNet) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals row */}
                    <TableRow className="border-t-2 border-white/10 font-bold bg-white/5">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {fyYieldData.reduce((s, r) => s + r.dividendCount, 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-400">
                        {fmt(fyYieldData.reduce((s, r) => s + r.totalDividend, 0))}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {fmt(fyYieldData.reduce((s, r) => s + r.totalCost, 0))}
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-400">
                        {fyYieldData.reduce((s, r) => s + r.totalCost, 0) > 0
                          ? fmtPct(
                              (fyYieldData.reduce((s, r) => s + r.totalDividend, 0) /
                                fyYieldData.reduce((s, r) => s + r.totalCost, 0)) *
                                100
                            )
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-400">
                        {fyYieldData.reduce((s, r) => s + r.totalCost, 0) > 0
                          ? fmtPct(
                              ((fyYieldData.reduce((s, r) => s + r.totalDividend, 0) * 0.85) /
                                fyYieldData.reduce((s, r) => s + r.totalCost, 0)) *
                                100
                            )
                          : "—"}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
