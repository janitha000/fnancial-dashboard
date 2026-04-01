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
  Bar,
  BarChart,
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
import { useIncome } from "@/context/IncomeContext";
import { useTax, FINANCIAL_YEAR_MONTHS, currentFinancialYear, currentFinancialMonth } from "@/context/TaxContext";
import { AddIncomeModal } from "./AddIncomeModal";
import { 
  Trash2, 
  Wallet, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  User as UserIcon, 
  TrendingUp, 
  Briefcase,
  Layers
} from "lucide-react";
import { IncomeUser } from "@/actions/income";

type FilterUser = IncomeUser | "Household";

export function IncomeDashboard() {
  const { incomeRecords, deleteIncome } = useIncome();
  const { availableYears } = useTax();

  const [selectedYear, setSelectedYear] = useState(currentFinancialYear());
  const [selectedMonth, setSelectedMonth] = useState<(typeof FINANCIAL_YEAR_MONTHS)[number]>(currentFinancialMonth());
  const [viewMode, setViewMode] = useState<"monthly" | "fy">("monthly");
  const [filterUser, setFilterUser] = useState<FilterUser>("Household");

  // Colors for categories
  const PASSIVE_COLORS: Record<string, string> = {
    "LKR FD": "#6366f1",
    "USD FD": "#8b5cf6",
    "UT - Income Fund": "#ec4899",
    "UT - Equity Fund": "#f43f5e",
    "TBill": "#f59e0b",
    "Dividends": "#10b981",
    "Stock Market": "#06b6d4",
    "NDB Wealth": "#3b82f6",
  };

  const TYPE_COLORS = {
    "Salary": "#6366f1",
    "Passive Income": "#10b981",
  };

  // ─── Navigation Logic ───────────────────────────────────────────────────────
  const handlePrevMonth = () => {
    const currentIndex = FINANCIAL_YEAR_MONTHS.indexOf(selectedMonth);
    if (currentIndex === 0) {
      const [start, end] = selectedYear.split("/").map(Number);
      const prevFY = `${start - 1}/${end - 1}`;
      if (availableYears.includes(prevFY)) {
        setSelectedYear(prevFY);
        setSelectedMonth(FINANCIAL_YEAR_MONTHS[FINANCIAL_YEAR_MONTHS.length - 1]);
      }
    } else {
      setSelectedMonth(FINANCIAL_YEAR_MONTHS[currentIndex - 1]);
    }
  };

  const handleNextMonth = () => {
    const currentIndex = FINANCIAL_YEAR_MONTHS.indexOf(selectedMonth);
    if (currentIndex === FINANCIAL_YEAR_MONTHS.length - 1) {
      const [start, end] = selectedYear.split("/").map(Number);
      const nextFY = `${start + 1}/${end + 1}`;
      if (availableYears.includes(nextFY)) {
        setSelectedYear(nextFY);
        setSelectedMonth(FINANCIAL_YEAR_MONTHS[0]);
      }
    } else {
      setSelectedMonth(FINANCIAL_YEAR_MONTHS[currentIndex + 1]);
    }
  };

  // ─── Data Filtering ─────────────────────────────────────────────────────────
  const filteredRecords = useMemo(() => {
    return incomeRecords.filter((r) => {
      const yearMatch = r.financialYear === selectedYear;
      const userMatch = filterUser === "Household" || r.user === filterUser;
      return yearMatch && userMatch;
    });
  }, [incomeRecords, selectedYear, filterUser]);

  const monthlyData = useMemo(() => {
    return filteredRecords.filter((r) => r.month === selectedMonth);
  }, [filteredRecords, selectedMonth]);

  const monthlySummary = useMemo(() => {
    const salary = monthlyData.filter(r => r.type === "Salary").reduce((s, r) => s + r.amount, 0);
    const passive = monthlyData.filter(r => r.type === "Passive Income").reduce((s, r) => s + r.amount, 0);
    const total = salary + passive;

    const passiveBreakdown = monthlyData
      .filter(r => r.type === "Passive Income")
      .reduce((acc, r) => {
        if (r.category) acc[r.category] = (acc[r.category] || 0) + r.amount;
        return acc;
      }, {} as Record<string, number>);

    return { total, salary, passive, passiveBreakdown };
  }, [monthlyData]);

  const fyChartData = useMemo(() => {
    return FINANCIAL_YEAR_MONTHS.map((m) => {
      const records = filteredRecords.filter(r => r.month === m);
      const salary = records.filter(r => r.type === "Salary").reduce((s, r) => s + r.amount, 0);
      const passive = records.filter(r => r.type === "Passive Income").reduce((s, r) => s + r.amount, 0);
      
      const janithaTotal = records.filter(r => r.user === "Janitha").reduce((s, r) => s + r.amount, 0);
      const vindyaTotal = records.filter(r => r.user === "Vindya").reduce((s, r) => s + r.amount, 0);

      const data: any = { 
        month: m, 
        Salary: salary, 
        "Passive Income": passive,
        "Janitha": janithaTotal,
        "Vindya": vindyaTotal
      };

      records.forEach(r => {
        if (r.type === "Passive Income" && r.category) {
          data[r.category] = (data[r.category] || 0) + r.amount;
        }
      });

      return data;
    });
  }, [filteredRecords]);

  const fySummary = useMemo(() => {
    const total = filteredRecords.reduce((s, r) => s + r.amount, 0);
    const salary = filteredRecords.filter(r => r.type === "Salary").reduce((s, r) => s + r.amount, 0);
    const passive = filteredRecords.filter(r => r.type === "Passive Income").reduce((s, r) => s + r.amount, 0);
    const passiveBreakdown = filteredRecords
      .filter(r => r.type === "Passive Income")
      .reduce((acc, r) => {
        if (r.category) acc[r.category] = (acc[r.category] || 0) + r.amount;
        return acc;
      }, {} as Record<string, number>);
    return { total, salary, passive, passiveBreakdown };
  }, [filteredRecords]);

  return (
    <div className="space-y-6">
      {/* ─── Header Controls ─── */}
      <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between p-4 bg-card/40 backdrop-blur-md rounded-2xl border border-white/10">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-background/50 p-1 rounded-xl border border-white/10">
            <Button
              variant={filterUser === "Household" ? "default" : "ghost"}
              onClick={() => setFilterUser("Household")}
              className="h-8 rounded-lg gap-2"
            >
              <Users className="h-4 w-4" />
              Household
            </Button>
            <Button
              variant={filterUser === "Janitha" ? "default" : "ghost"}
              onClick={() => setFilterUser("Janitha")}
              className="h-8 rounded-lg gap-2"
            >
              <UserIcon className="h-4 w-4" />
              Janitha
            </Button>
            <Button
              variant={filterUser === "Vindya" ? "default" : "ghost"}
              onClick={() => setFilterUser("Vindya")}
              className="h-8 rounded-lg gap-2"
            >
              <UserIcon className="h-4 w-4" />
              Vindya
            </Button>
          </div>

          <div className="h-8 w-px bg-white/10 hidden xl:block" />

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

          {viewMode === "monthly" && (
            <div className="flex items-center gap-1 bg-background/50 rounded-xl border border-white/10 p-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/5" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Select value={selectedMonth} onValueChange={(v) => { if (v) setSelectedMonth(v as any); }}>
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

        <AddIncomeModal />
      </div>

      {/* ─── Summary Cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-white/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp className="h-24 w-24" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-blue-400">Total Income</CardDescription>
            <CardTitle className="text-4xl font-black text-white/90">
              {viewMode === "monthly" 
                ? monthlySummary.total.toLocaleString() 
                : fyChartData.reduce((s, m) => s + (m.Salary || 0) + (m["Passive Income"] || 0), 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground italic">Combined salary and passive earnings</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-white/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Briefcase className="h-24 w-24" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-purple-400">Salary Component</CardDescription>
            <CardTitle className="text-3xl font-black text-white/90">
              {viewMode === "monthly" ? monthlySummary.salary.toLocaleString() : fySummary.salary.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground italic">Primary employment income</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-white/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Layers className="h-24 w-24" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-400">Passive Component</CardDescription>
            <CardTitle className="text-3xl font-black text-white/90">
              {viewMode === "monthly" ? monthlySummary.passive.toLocaleString() : fySummary.passive.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground italic">Investments, FDs, and Dividends</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Charts ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {viewMode === "monthly" ? (
          <>
            {/* Income Source Split (Salary vs Passive) */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Income Source Split</CardTitle>
                <CardDescription>Contribution of Salary vs Passive Income</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Salary", value: monthlySummary.salary },
                        { name: "Passive Income", value: monthlySummary.passive },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      <Cell key="salary" fill={TYPE_COLORS["Salary"]} />
                      <Cell key="passive" fill={TYPE_COLORS["Passive Income"]} />
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px' }}
                      formatter={(val: any) => val?.toLocaleString()}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Passive Income Breakdown */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Passive Income Breakdown</CardTitle>
                <CardDescription>Detailed distribution of investment earnings</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(monthlySummary.passiveBreakdown).map(([name, value]) => ({ name, value }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {Object.entries(monthlySummary.passiveBreakdown).map(([name], index) => (
                        <Cell key={`cell-${index}`} fill={PASSIVE_COLORS[name] || "#8884d8"} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px' }}
                      formatter={(val: any) => val?.toLocaleString()}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* FY Summary Pies */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              {filterUser === "Household" && (
                <Card>
                  <CardHeader>
                    <CardTitle>FY Household Split</CardTitle>
                    <CardDescription>Janitha vs Vindya (Total Yearly Income)</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Janitha", value: fyChartData.reduce((s, m) => s + (m.Janitha || 0), 0) },
                            { name: "Vindya", value: fyChartData.reduce((s, m) => s + (m.Vindya || 0), 0) },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                        >
                          <Cell key="janitha" fill="#6366f1" />
                          <Cell key="vindya" fill="#ec4899" />
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px' }}
                          formatter={(val: any) => val?.toLocaleString()}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              <Card className={filterUser !== "Household" ? "md:col-span-2" : ""}>
                <CardHeader>
                  <CardTitle>FY Income Source Split</CardTitle>
                  <CardDescription>Salary vs Passive Income (Total Yearly)</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Salary", value: fySummary.salary },
                          { name: "Passive Income", value: fySummary.passive },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      >
                        <Cell key="salary" fill={TYPE_COLORS["Salary"]} />
                        <Cell key="passive" fill={TYPE_COLORS["Passive Income"]} />
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px' }}
                        formatter={(val: any) => val?.toLocaleString()}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Total Monthly Income Trend (FY Mode) */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>FY Monthly Overall Trend</CardTitle>
                <CardDescription>Total monthly income across the financial year</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fyChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-white/5" />
                    <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val/1000).toFixed(0)}k`} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px' }}
                      formatter={(val: any) => val?.toLocaleString()}
                    />
                    <Legend />
                    {filterUser === "Household" ? (
                      <>
                        <Bar dataKey="Janitha" stackId="total" fill="#6366f1" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Vindya" stackId="total" fill="#ec4899" radius={[0, 0, 0, 0]} />
                      </>
                    ) : (
                      <Bar dataKey="Salary" stackId="total" fill={TYPE_COLORS["Salary"]} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Passive Income row */}
            <div className="md:col-span-2 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Passive Trend (Optional FY Card) */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>FY Passive Income Trend</CardTitle>
                  <CardDescription>Passive breakdown trends over the year</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fyChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-white/5" />
                      <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val/1000).toFixed(0)}k`} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px' }}
                        formatter={(val: any) => val?.toLocaleString()}
                      />
                      <Legend iconType="circle" />
                      {Object.keys(PASSIVE_COLORS).map((cat) => (
                        <Bar key={cat} dataKey={cat} stackId="passive" fill={PASSIVE_COLORS[cat]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* FY Passive Breakdown */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>FY Passive Breakdown</CardTitle>
                  <CardDescription>Total distribution of investment earnings</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(fySummary.passiveBreakdown).map(([name, value]) => ({ name, value }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      >
                        {Object.entries(fySummary.passiveBreakdown).map(([name], index) => (
                          <Cell key={`cell-${index}`} fill={PASSIVE_COLORS[name] || "#8884d8"} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px' }}
                        formatter={(val: any) => val?.toLocaleString()}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* ─── Ledger Table ─── */}
      <Card>
        <CardHeader>
          <CardTitle>Income Ledger</CardTitle>
          <CardDescription>All recorded earnings for {filterUser === "Household" ? "all users" : filterUser} in FY {selectedYear}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {viewMode === "fy" && <TableHead>Month</TableHead>}
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount (LKR)</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(viewMode === "monthly" ? monthlyData : [...filteredRecords].sort((a,b) => FINANCIAL_YEAR_MONTHS.indexOf(a.month as any) - FINANCIAL_YEAR_MONTHS.indexOf(b.month as any)))
                .map((record) => (
                <TableRow key={record.id} className="group transition-colors">
                  {viewMode === "fy" && (
                    <TableCell className="font-semibold text-primary/80">
                      {record.month}
                    </TableCell>
                  )}
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <UserIcon className="h-3 w-3 text-muted-foreground" />
                      {record.user}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${record.type === "Salary" ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                      {record.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground italic">
                    {record.category || "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold tracking-tighter">
                    {record.amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                      onClick={() => deleteIncome(record.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(viewMode === "monthly" ? monthlyData : filteredRecords).length === 0 && (
                <TableRow>
                  <TableCell colSpan={viewMode === "fy" ? 6 : 5} className="text-center py-10 text-muted-foreground italic">
                    {viewMode === "monthly" ? `No records found for ${selectedMonth}` : "No income records found for this year."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
