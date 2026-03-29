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
import { useExpenses, CombinedExpense } from "@/context/ExpenseContext";
import { useTax, FINANCIAL_YEAR_MONTHS, currentFinancialYear, currentFinancialMonth } from "@/context/TaxContext";
import { AddExpenseModal } from "./AddExpenseModal";
import { Trash2, TrendingDown, TrendingUp, Wallet, Receipt, CreditCard, Landmark, ChevronLeft, ChevronRight } from "lucide-react";

export function ExpenseDashboard() {
  const { getMonthlyExpenses, getFYExpenses, deleteExpense, manualExpenses } = useExpenses();
  const { availableYears } = useTax();

  const [selectedYear, setSelectedYear] = useState(currentFinancialYear());
  const [selectedMonth, setSelectedMonth] = useState<(typeof FINANCIAL_YEAR_MONTHS)[number]>(currentFinancialMonth());
  const [viewMode, setViewMode] = useState<"monthly" | "fy">("monthly");

  // Colors for categories
  const COLORS: Record<string, string> = {
    Household: "#6366f1", // Indigo
    Vehicle: "#f59e0b",   // Amber
    Loan: "#10b981",      // Emerald
    OD: "#ef4444",        // Red
    Tax: "#a855f7",       // Purple
  };

  const handlePrevMonth = () => {
    const currentIndex = FINANCIAL_YEAR_MONTHS.indexOf(selectedMonth as any);
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
    const currentIndex = FINANCIAL_YEAR_MONTHS.indexOf(selectedMonth as any);
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

  // ─── Monthly Data ───────────────────────────────────────────────────────────
  const monthlyExpenses = useMemo(() => {
    return getMonthlyExpenses(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, getMonthlyExpenses, manualExpenses]);

  const monthlySummary = useMemo(() => {
    const categories = monthlyExpenses.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);

    const total = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
    const manualTotal = monthlyExpenses.filter(e => !e.isAutomatic).reduce((sum, e) => sum + e.amount, 0);
    const autoTotal = total - manualTotal;

    return { total, manualTotal, autoTotal, categories };
  }, [monthlyExpenses]);

  const pieData = useMemo(() => {
    return Object.entries(monthlySummary.categories).map(([name, value]) => ({
      name,
      value,
    }));
  }, [monthlySummary]);

  // ─── FY Data ────────────────────────────────────────────────────────────────
  const fyExpenses = useMemo(() => {
    const data = getFYExpenses(selectedYear);
    return FINANCIAL_YEAR_MONTHS.map((m) => {
      const perCategory: any = { month: m };
      data[m].forEach((e) => {
        perCategory[e.category] = (perCategory[e.category] || 0) + e.amount;
      });
      return perCategory;
    });
  }, [selectedYear, getFYExpenses, manualExpenses]);

  const fySummary = useMemo(() => {
    const data = getFYExpenses(selectedYear);
    const allExpenses = Object.values(data).flat();
    const total = allExpenses.reduce((sum, e) => sum + e.amount, 0);
    const manualTotal = allExpenses.filter(e => !e.isAutomatic).reduce((sum, e) => sum + e.amount, 0);
    const autoTotal = total - manualTotal;
    return { total, manualTotal, autoTotal };
  }, [selectedYear, getFYExpenses, manualExpenses]);

  return (
    <div className="space-y-6">
      {/* ─── Header Controls ─── */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between p-4 bg-card/40 backdrop-blur-md rounded-2xl border border-white/10">
        <div className="flex items-center gap-4">
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

          <div className="h-8 w-px bg-white/10 hidden md:block" />

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
              Financial Year
            </Button>
          </div>
        </div>

        <AddExpenseModal />
      </div>

      {/* ─── Summary Cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border-white/10 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Wallet className="h-24 w-24" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-blue-400">Total Outgoings</CardDescription>
            <CardTitle className="text-4xl font-black text-white/90">
              {viewMode === "monthly" 
                ? monthlySummary.total.toLocaleString() 
                : fyExpenses.reduce((s, m) => s + Object.values(m).reduce((a: any, b: any) => typeof b === 'number' ? a + b : a, 0), 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Total of all manual and automated expenses</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-white/10 overflow-hidden relative group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Receipt className="h-24 w-24" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-400">Manual Expenses</CardDescription>
            <CardTitle className="text-3xl font-black text-white/90">
                {viewMode === "monthly" ? monthlySummary.manualTotal.toLocaleString() : fySummary.manualTotal.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Entries made by you</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-white/10 overflow-hidden relative group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Landmark className="h-24 w-24" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-purple-400">Automatic Expenses</CardDescription>
            <CardTitle className="text-3xl font-black text-white/90">
                 {viewMode === "monthly" ? monthlySummary.autoTotal.toLocaleString() : fySummary.autoTotal.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Loans, Taxes, and Managed costs</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Visualizations ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>{viewMode === "monthly" ? `${selectedMonth} Breakdown` : `Financial Year ${selectedYear} Trends`}</CardTitle>
            <CardDescription>Visualizing expense distribution across categories</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            {viewMode === "monthly" ? (
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={140}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.name] || "#8884d8"} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px', backdropFilter: 'blur(10px)' }}
                      formatter={(value: any) => value?.toLocaleString() || "0"}
                    />
                  </PieChart>
               </ResponsiveContainer>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fyExpenses} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-white/5" />
                        <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val/1000).toFixed(0)}k`} />
                        <Tooltip 
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px' }}
                            formatter={(val: any) => val?.toLocaleString() || "0"}
                        />
                        <Legend iconType="circle" />
                        {Object.keys(COLORS).map((category) => (
                            <Bar 
                              key={category} 
                              dataKey={category} 
                              stackId="a" 
                              fill={COLORS[category]} 
                              radius={[0, 0, 0, 0]} 
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Ledger Table (Only for Monthly for now) ─── */}
      {viewMode === "monthly" && (
        <Card>
          <CardHeader>
            <CardTitle>Expense Ledger</CardTitle>
            <CardDescription>Detailed breakdown of monthly outgoings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount (LKR)</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyExpenses.map((expense) => (
                    <TableRow key={expense.id} className="group transition-colors">
                      <TableCell>
                        <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[expense.category] }} />
                            {expense.category}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-medium">{expense.description}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight uppercase ${expense.isAutomatic ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                            {expense.isAutomatic ? "Auto" : "Manual"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold tracking-tighter">
                        {expense.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {!expense.isAutomatic && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => deleteExpense(expense.id)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {monthlyExpenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground italic">
                        No expenses recorded for this month.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
