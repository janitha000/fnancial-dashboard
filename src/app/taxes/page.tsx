"use client";

import React, { useMemo, useState } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  Receipt, Plus, Trash2, TrendingDown, Wallet, PiggyBank,
} from "lucide-react";
import { useTax, FINANCIAL_YEAR_MONTHS } from "@/context/TaxContext";
import { AddTaxDialog } from "@/components/taxes/AddTaxDialog";

// ─── Palette ──────────────────────────────────────────────────────────────────
const USER_COLORS: Record<string, string> = {
  Janitha: "#818cf8",   // indigo-300
  Vindya:  "#34d399",   // emerald-400
};

const PASSIVE_COLORS: Record<string, string> = {
  "LKR FD":    "#f59e0b",
  "UT":         "#06b6d4",
  "TBill":      "#a78bfa",
  "NDB Wealth": "#f472b6",
};

const PIE_COLORS = ["#818cf8", "#34d399", "#f59e0b", "#f472b6"];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString("en-LK", { maximumFractionDigits: 0 });
}

function fmtK(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-card/95 p-3 shadow-xl backdrop-blur-xl text-sm">
      <p className="font-semibold mb-1.5 text-foreground">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: p.fill ?? p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground">LKR {fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Summary KPI Card ─────────────────────────────────────────────────────────
function KpiCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <Card className="relative overflow-hidden border-white/10">
      <div
        className="absolute inset-0 opacity-10"
        style={{ background: `radial-gradient(ellipse at top right, ${color}, transparent 70%)` }}
      />
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{label}</p>
            <p className="text-2xl font-extrabold tracking-tight mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <span
            className="p-2.5 rounded-xl"
            style={{ background: `${color}22`, color }}
          >
            <Icon className="h-5 w-5" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TaxesPage() {
  const { taxRecords, isLoaded, selectedYear, setSelectedYear, availableYears, deleteTaxRecord } = useTax();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [viewUser, setViewUser] = useState<string>("Total");

  // Records filtered to selected FY and optionally by User
  const fyRecords = useMemo(
    () => {
      const yearFiltered = taxRecords.filter((r) => r.financialYear === selectedYear);
      if (viewUser === "Total") return yearFiltered;
      return yearFiltered.filter((r) => r.user === viewUser);
    },
    [taxRecords, selectedYear, viewUser]
  );

  // ── KPI totals ────────────────────────────────────────────────────────────
  const { salaryTax, passiveTax, grandTotal } = useMemo(() => {
    let salaryTax = 0;
    let passiveTax = 0;
    fyRecords.forEach((r) => {
      if (r.incomeType === "Salary") salaryTax += r.taxPaid;
      else passiveTax += r.taxPaid;
    });
    return { salaryTax, passiveTax, grandTotal: salaryTax + passiveTax };
  }, [fyRecords]);

  // ── Monthly chart data (non-cumulative, by user) ──────────────────────────
  const monthlyUserData = useMemo(() => {
    return FINANCIAL_YEAR_MONTHS.map((m) => {
      const row: Record<string, any> = { month: m };
      const monthRecs = fyRecords.filter((r) => r.month === m);
      const janitha = monthRecs.filter((r) => r.user === "Janitha").reduce((s, r) => s + r.taxPaid, 0);
      const vindya  = monthRecs.filter((r) => r.user === "Vindya").reduce((s, r) => s + r.taxPaid, 0);
      row["Janitha"] = janitha;
      row["Vindya"]  = vindya;
      return row;
    }).filter((r) => r["Janitha"] > 0 || r["Vindya"] > 0);
  }, [fyRecords]);

  // ── Passive income chart data (by category, per month) ───────────────────
  const passiveMonthlyData = useMemo(() => {
    const passiveRecs = fyRecords.filter((r) => r.incomeType === "Passive Income");
    if (passiveRecs.length === 0) return [];
    return FINANCIAL_YEAR_MONTHS.map((m) => {
      const row: Record<string, any> = { month: m };
      const mRecs = passiveRecs.filter((r) => r.month === m);
      ["LKR FD", "UT", "TBill", "NDB Wealth"].forEach((cat) => {
        row[cat] = mRecs.filter((r) => r.passiveCategory === cat).reduce((s, r) => s + r.taxPaid, 0);
      });
      return row;
    }).filter((r) =>
      ["LKR FD", "UT", "TBill", "NDB Wealth"].some((cat) => (r[cat] as number) > 0)
    );
  }, [fyRecords]);

  // ── Pie breakdown (User Share or Income Type) ───────────────────────────
  const pieData = useMemo(() => {
    const map = new Map<string, number>();
    if (viewUser === "Total") {
      fyRecords.forEach((r) => {
        map.set(r.user, (map.get(r.user) ?? 0) + r.taxPaid);
      });
    } else {
      fyRecords.forEach((r) => {
        map.set(r.incomeType, (map.get(r.incomeType) ?? 0) + r.taxPaid);
      });
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [fyRecords, viewUser]);

  // ── Sorted ledger ─────────────────────────────────────────────────────────
  const sortedLedger = useMemo(() => {
    const monthOrder = Object.fromEntries(FINANCIAL_YEAR_MONTHS.map((m, i) => [m, i]));
    return [...fyRecords].sort((a, b) => (monthOrder[a.month] ?? 99) - (monthOrder[b.month] ?? 99));
  }, [fyRecords]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteTaxRecord(id);
    } finally {
      setDeleting(null);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading tax data…
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Receipt className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Tax Records</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Track salary &amp; passive income taxes by financial year
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* FY Selector */}
          <Select value={selectedYear} onValueChange={(v) => v && setSelectedYear(v)}>
            <SelectTrigger className="w-[140px] bg-card border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((fy) => (
                <SelectItem key={fy} value={fy}>FY {fy}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-primary hover:bg-primary/90 gap-2 font-semibold"
          >
            <Plus className="h-4 w-4" />
            Add Tax
          </Button>
        </div>
      </div>

      <div className="flex justify-center">
        <Tabs value={viewUser} onValueChange={setViewUser} className="w-auto">
          <TabsList className="bg-card border border-white/10 shadow-lg">
            <TabsTrigger value="Total" className="px-6">Household Total</TabsTrigger>
            <TabsTrigger value="Janitha" className="px-6">Janitha</TabsTrigger>
            <TabsTrigger value="Vindya" className="px-6">Vindya</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          icon={Wallet}
          label="Salary Tax Paid"
          value={`LKR ${fmt(salaryTax)}`}
          sub={`${fyRecords.filter((r) => r.incomeType === "Salary").length} records`}
          color="#818cf8"
        />
        <KpiCard
          icon={PiggyBank}
          label="Passive Income Tax"
          value={`LKR ${fmt(passiveTax)}`}
          sub={`${fyRecords.filter((r) => r.incomeType === "Passive Income").length} records`}
          color="#34d399"
        />
        <KpiCard
          icon={TrendingDown}
          label="Total Tax Paid"
          value={`LKR ${fmt(grandTotal)}`}
          sub={`FY ${selectedYear}`}
          color="#f472b6"
        />
      </div>

      {/* ── Charts Row ──────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Monthly by user — bar chart */}
        <Card className="lg:col-span-4 border-white/10">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Monthly Tax by User</CardTitle>
            <CardDescription>Non-cumulative tax paid per month (grouped)</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyUserData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                No salary or tax data for FY {selectedYear}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyUserData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="month" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={fmtK} width={48} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <Bar dataKey="Janitha" fill={USER_COLORS["Janitha"]} radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Vindya"  fill={USER_COLORS["Vindya"]}  radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* User share or category mix pie */}
        <Card className="lg:col-span-3 border-white/10">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              {viewUser === "Total" ? "Tax Contribution" : `${viewUser}'s Tax Mix`}
            </CardTitle>
            <CardDescription>
              {viewUser === "Total" ? "Share per person" : "Salary vs Passive breakdown"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                No data yet
              </div>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="45%"
                      innerRadius={68} outerRadius={105}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any) => [`LKR ${fmt(v)}`, ""]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "rgba(255,255,255,0.1)",
                        color: "hsl(var(--foreground))",
                        borderRadius: 8,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 13 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Passive Income Tax Chart ─────────────────────────────────────── */}
      {passiveMonthlyData.length > 0 && (
        <Card className="border-white/10">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Passive Income Tax by Category</CardTitle>
            <CardDescription>Monthly breakdown — LKR FD, UT, TBill, NDB Wealth</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={passiveMonthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={fmtK} width={48} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                {(["LKR FD", "UT", "TBill", "NDB Wealth"] as const).map((cat) => (
                  <Bar key={cat} dataKey={cat} stackId="passive" fill={PASSIVE_COLORS[cat]} maxBarSize={60} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Ledger Table ────────────────────────────────────────────────── */}
      <Card className="border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Tax Ledger</CardTitle>
              <CardDescription>All records for FY {selectedYear}</CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">
              {fyRecords.length} {fyRecords.length === 1 ? "record" : "records"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {sortedLedger.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-10 w-10 mx-auto mb-3 opacity-25" />
              <p className="font-medium">No tax records for FY {selectedYear}</p>
              <p className="text-sm mt-1">Click &quot;Add Tax&quot; to add your first record.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead>Month</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Income Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Total Income</TableHead>
                    <TableHead className="text-right">Tax Paid</TableHead>
                    <TableHead className="text-right">Effective Rate</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLedger.map((rec) => {
                    const rate = rec.totalIncome > 0
                      ? ((rec.taxPaid / rec.totalIncome) * 100).toFixed(1)
                      : "—";
                    return (
                      <TableRow key={rec.id} className="border-white/5 hover:bg-white/5 transition-colors">
                        <TableCell className="font-medium">{rec.month}</TableCell>
                        <TableCell>
                          <span
                            className="inline-flex items-center gap-1.5 text-sm font-medium"
                            style={{ color: USER_COLORS[rec.user] }}
                          >
                            <span
                              className="inline-block w-2 h-2 rounded-full"
                              style={{ background: USER_COLORS[rec.user] }}
                            />
                            {rec.user}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-xs border-white/10"
                          >
                            {rec.incomeType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {rec.passiveCategory ? (
                            <span
                              className="font-medium"
                              style={{ color: PASSIVE_COLORS[rec.passiveCategory] }}
                            >
                              {rec.passiveCategory}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {fmt(rec.totalIncome)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold text-rose-400">
                          {fmt(rec.taxPaid)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {rate !== "—" ? `${rate}%` : "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={() => handleDelete(rec.id)}
                            disabled={deleting === rec.id}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AddTaxDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
