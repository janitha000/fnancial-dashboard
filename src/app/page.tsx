"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Line,
  ComposedChart
} from "recharts";
import { 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown,
  PieChart as PieIcon, 
  BarChart3,
  Users,
  User as UserIcon,
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
  Wallet
} from "lucide-react";
import { useIncome } from "@/context/IncomeContext";
import { useExpenses } from "@/context/ExpenseContext";
import { useTax, FINANCIAL_YEAR_MONTHS, currentFinancialYear, currentFinancialMonth } from "@/context/TaxContext";

const INCOME_COLORS = {
  Salary: "#6366f1",
  "Passive Income": "#10b981",
};

const EXPENSE_COLORS: Record<string, string> = {
  Household: "#6366f1", // Indigo
  Vehicle: "#f59e0b",   // Amber
  Loan: "#10b981",      // Emerald
  OD: "#ef4444",        // Red
  Tax: "#a855f7",       // Purple
};

type ViewMode = "monthly" | "fy";
type FilterUser = "Household" | "Janitha" | "Vindya";

export default function HomeDashboard() {
  const { incomeRecords, isLoaded: incomeLoaded } = useIncome();
  const { getMonthlyExpenses, getFYExpenses, isLoaded: expenseLoaded } = useExpenses();
  const { availableYears } = useTax();

  // DASHBOARD STATE
  const [selectedYear, setSelectedYear] = useState(currentFinancialYear());
  const [selectedMonth, setSelectedMonth] = useState<(typeof FINANCIAL_YEAR_MONTHS)[number]>(currentFinancialMonth());
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [filterUser, setFilterUser] = useState<FilterUser>("Household");

  const isLoaded = incomeLoaded && expenseLoaded;

  // --- NAVIGATION LOGIC ---
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

  // --- DATA AGGREGATION ---

  const dashboardData = useMemo(() => {
    if (!isLoaded) return null;

    // 1. Filtered Income
    const getIncomeStats = (year: string, month: string) => {
      const records = incomeRecords.filter(r => 
        r.financialYear === year && 
        r.month === month && 
        (filterUser === "Household" || r.user === filterUser)
      );
      const salary = records.filter(r => r.type === "Salary").reduce((s, r) => s + r.amount, 0);
      const passive = records.filter(r => r.type === "Passive Income").reduce((s, r) => s + r.amount, 0);
      return { total: salary + passive, salary, passive, records };
    };

    // 2. Filtered Expenses
    const getExpenseStats = (year: string, month: string) => {
      let combined = getMonthlyExpenses(year, month);
      
      if (filterUser !== "Household") {
         combined = combined.filter(e => {
            if (e.category === "Tax") {
               return e.description.includes(filterUser);
            }
            return true; 
         });
      }

      const categories = combined.reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
        return acc;
      }, {} as Record<string, number>);

      const total = combined.reduce((s, e) => s + e.amount, 0);
      return { total, categories };
    };

    // --- Current Month Summary ---
    const currentIncome = getIncomeStats(selectedYear, selectedMonth);
    const currentExpense = getExpenseStats(selectedYear, selectedMonth);

    // --- FY Trend Data ---
    const fyTrend = FINANCIAL_YEAR_MONTHS.map(m => {
       const inc = getIncomeStats(selectedYear, m);
       const exp = getExpenseStats(selectedYear, m);
       return {
          month: m,
          Income: inc.total,
          Expenses: exp.total,
          "Gain/Loss": inc.total - exp.total
       };
    });

    // --- FY Summary Data ---
    const fySummary = fyTrend.reduce((acc, curr) => {
       acc.income += curr.Income;
       acc.expense += curr.Expenses;
       return acc;
    }, { income: 0, expense: 0 });

    // Calculate FY Breakdown for charts
    const fyIncomeBreakdown = {
       total: fySummary.income,
       salary: incomeRecords.filter(r => r.financialYear === selectedYear && r.type === "Salary" && (filterUser === "Household" || r.user === filterUser)).reduce((s, r) => s + r.amount, 0),
       passive: incomeRecords.filter(r => r.financialYear === selectedYear && r.type === "Passive Income" && (filterUser === "Household" || r.user === filterUser)).reduce((s, r) => s + r.amount, 0),
    };

    const fyExpenseBreakdown = {
       total: fySummary.expense,
       categories: FINANCIAL_YEAR_MONTHS.reduce((acc, m) => {
          const monthExp = getExpenseStats(selectedYear, m);
          Object.entries(monthExp.categories).forEach(([cat, amt]) => {
             acc[cat] = (acc[cat] || 0) + amt;
          });
          return acc;
       }, {} as Record<string, number>)
    };

    return {
       current: {
          income: currentIncome,
          expense: currentExpense,
          gainLoss: currentIncome.total - currentExpense.total,
          ratio: currentIncome.total > 0 ? (currentExpense.total / currentIncome.total) * 100 : 0,
          netPassive: currentIncome.passive - ((currentExpense.categories["Loan"] || 0) + (currentExpense.categories["Tax"] || 0)),
          debtAndTax: (currentExpense.categories["Loan"] || 0) + (currentExpense.categories["Tax"] || 0)
       },
       fy: {
          income: fyIncomeBreakdown,
          expense: fyExpenseBreakdown,
          gainLoss: fySummary.income - fySummary.expense,
          ratio: fySummary.income > 0 ? (fySummary.expense / fySummary.income) * 100 : 0,
          trend: fyTrend,
          netPassive: fyIncomeBreakdown.passive - ((fyExpenseBreakdown.categories["Loan"] || 0) + (fyExpenseBreakdown.categories["Tax"] || 0)),
          debtAndTax: (fyExpenseBreakdown.categories["Loan"] || 0) + (fyExpenseBreakdown.categories["Tax"] || 0)
       }
    };
  }, [incomeRecords, getMonthlyExpenses, selectedYear, selectedMonth, filterUser, isLoaded]);

  if (!isLoaded) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground animate-pulse">Syncing financial nodes...</p>
      </div>
    );
  }

  const activeStats = viewMode === "monthly" ? dashboardData?.current : dashboardData?.fy;
  const isGain = (activeStats?.gainLoss ?? 0) >= 0;

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 pb-12">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
            Executive Summary
          </h1>
          <p className="text-muted-foreground">Unified cash flow analytics across your financial ecosystem.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-background/50 p-1 rounded-xl border border-white/10">
            <Button 
              variant={filterUser === "Household" ? "default" : "ghost"}
              onClick={() => setFilterUser("Household")}
              size="sm" className="h-8 gap-2 rounded-lg"
            >
              <Users className="h-3.5 w-3.5" /> Household
            </Button>
            <Button 
              variant={filterUser === "Janitha" ? "default" : "ghost"}
              onClick={() => setFilterUser("Janitha")}
              size="sm" className="h-8 gap-2 rounded-lg"
            >
              <UserIcon className="h-3.5 w-3.5" /> Janitha
            </Button>
            <Button 
              variant={filterUser === "Vindya" ? "default" : "ghost"}
              onClick={() => setFilterUser("Vindya")}
              size="sm" className="h-8 gap-2 rounded-lg"
            >
              <UserIcon className="h-3.5 w-3.5" /> Vindya
            </Button>
          </div>

          <div className="flex bg-background/50 p-1 rounded-xl border border-white/10">
            <Button 
              variant={viewMode === "monthly" ? "default" : "ghost"}
              onClick={() => setViewMode("monthly")}
              size="sm" className="h-8 rounded-lg"
            >
              Monthly
            </Button>
            <Button 
              variant={viewMode === "fy" ? "default" : "ghost"}
              onClick={() => setViewMode("fy")}
              size="sm" className="h-8 rounded-lg"
            >
              FY View
            </Button>
          </div>

          {viewMode === "monthly" && (
            <div className="flex items-center gap-1 bg-background/50 rounded-xl border border-white/10 p-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Select value={selectedMonth} onValueChange={(v) => { if (v) setSelectedMonth(v as any); }}>
                <SelectTrigger className="w-[100px] border-none bg-transparent font-medium focus:ring-0 h-8 shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FINANCIAL_YEAR_MONTHS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          <Select value={selectedYear} onValueChange={(v) => { if (v) setSelectedYear(v); }}>
            <SelectTrigger className="w-[130px] h-10 bg-background/50 border-white/10 font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ─── Summary Cards ─── */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border-white/10">
          <CardHeader className="pb-2">
            <CardDescription className="text-blue-400 flex items-center gap-2">
              <ArrowUpRight className="h-3 w-3" /> Total Income
            </CardDescription>
            <CardTitle className="text-3xl font-black">{activeStats?.income.total.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Combined earnings for {viewMode === "monthly" ? selectedMonth : "the year"}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-white/10">
          <CardHeader className="pb-2">
            <CardDescription className="text-orange-400 flex items-center gap-2">
              <ArrowDownRight className="h-3 w-3" /> Total Expenses
            </CardDescription>
            <CardTitle className="text-3xl font-black">{activeStats?.expense.total.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Categorized outgoings and tax payments</p>
          </CardContent>
        </Card>

        <Card className={`${isGain ? 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10' : 'bg-gradient-to-br from-red-500/10 to-orange-500/10'} border-white/10`}>
          <CardHeader className="pb-2">
            <CardDescription className={isGain ? "text-emerald-400" : "text-red-400"}>
              {isGain ? "Net Savings" : "Net Deficit"}
            </CardDescription>
            <CardTitle className="text-3xl font-black">{activeStats?.gainLoss.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{viewMode === "monthly" ? "Surplus for this month" : "Cumulative FY savings"}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border-white/10">
          <CardHeader className="pb-2">
            <CardDescription className="text-amber-400">Efficiency Ratio</CardDescription>
            <CardTitle className="text-3xl font-black">{(100 - (activeStats?.ratio ?? 0)).toFixed(1)}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Percentage of income successfully saved</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Breakdown Charts ─── */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PieIcon className="h-5 w-5 text-indigo-400" /> Income Breakdown
            </CardTitle>
            <CardDescription>Composition of your revenue streams</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: "Salary", value: activeStats?.income.salary },
                    { name: "Passive", value: activeStats?.income.passive },
                  ]}
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  <Cell fill={INCOME_COLORS.Salary} />
                  <Cell fill={INCOME_COLORS["Passive Income"]} />
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

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-orange-400" /> Expense Breakdown
            </CardTitle>
            <CardDescription>Major spending categories</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={Object.entries(activeStats?.expense.categories ?? {}).map(([name, value]) => ({ name, value }))}
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {Object.entries(activeStats?.expense.categories ?? {}).map(([name], index) => (
                    <Cell key={name} fill={EXPENSE_COLORS[name] || "#888888"} />
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

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calculator className="h-5 w-5 text-emerald-400" /> Savings Efficiency
            </CardTitle>
            <CardDescription>Income vs. Expense ratio</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-[300px] relative">
            <div className="text-center z-10">
              <p className="text-4xl font-black">{(100 - (activeStats?.ratio ?? 0)).toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Saved</p>
            </div>
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <Wallet className="h-32 w-32 text-emerald-500" />
            </div>
            <div className="w-full h-4 bg-white/10 rounded-full mt-8 overflow-hidden relative">
              <div 
                className={`h-full transition-all duration-1000 ${isGain ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, 100 - (activeStats?.ratio ?? 0))}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Investment Cash Flow (New Chart) ─── */}
      <Card className="bg-white/5 border-white/10 shadow-2xl overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-teal-400" /> Net Investment Cash Flow
          </CardTitle>
          <CardDescription>Calculation: Total Passive Income - (Loan + Tax Expenses)</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px] pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={[
                { 
                  name: "Portfolio Performance", 
                  "Passive Income": activeStats?.income.passive, 
                  "Loan + Tax": activeStats?.debtAndTax,
                  "Net Return": activeStats?.netPassive 
                }
              ]} 
              layout="vertical"
              margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-white/5" />
              <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px' }}
                formatter={(val: any) => val?.toLocaleString()}
              />
              <Legend />
              <Bar dataKey="Passive Income" fill="#10b981" barSize={30} radius={[0, 4, 4, 0]} />
              <Bar dataKey="Loan + Tax" fill="#ef4444" barSize={30} radius={[0, 4, 4, 0]} />
              <Bar dataKey="Net Return" fill="#06b6d4" barSize={30} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ─── Performance Trend (Only for FY) ─── */}
      {viewMode === "fy" && (
        <Card className="bg-white/5 border-white/10 shadow-2xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl">Financial Performance Trend</CardTitle>
              <CardDescription>Visualizing cash flow dynamics for the financial year {selectedYear}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="h-[400px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dashboardData?.fy.trend} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-white/5" />
                <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val/1000).toFixed(0)}k`} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px', backdropFilter: 'blur(10px)' }}
                  formatter={(val: any) => val?.toLocaleString()}
                />
                <Legend verticalAlign="top" height={36}/>
                <Bar dataKey="Income" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                <Bar dataKey="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={40} />
                <Line type="monotone" dataKey="Gain/Loss" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
