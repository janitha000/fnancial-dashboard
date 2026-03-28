"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFinance } from "@/context/FinanceContext";
import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CreditCard } from "lucide-react";

export default function ExpensesPage() {
  const { data, hasData } = useFinance();
  const TARGET_MONTHLY_COST = 500000;

  const chartData = useMemo(() => {
    return data.map(d => ({
      month: d.month,
      "Monthly Costs": d.expenseCosts,
      "Loan Repayments": d.expenseLoans,
    }));
  }, [data]);

  if (!hasData) {
    return <div className="p-8 text-center text-muted-foreground">Please upload data from the Data Management page first.</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <CreditCard className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expense Tracker</h1>
          <p className="text-muted-foreground">Tracking monthly costs and loan repayments against targets.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Costs vs 500k Target</CardTitle>
          <CardDescription>Monthly expense comparison revealing target overruns</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
              <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val/1000).toFixed(0)}k`} />
              <Tooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))'}} />
              <Legend />
              <ReferenceLine y={TARGET_MONTHLY_COST} label={{ position: 'top', value: '500k Target', fill: '#ef4444', fontSize: 12 }} stroke="#ef4444" strokeDasharray="3 3" />
              <Bar dataKey="Monthly Costs" stackId="a" fill="#f59e0b" radius={[0, 0, 4, 4]} />
              <Bar dataKey="Loan Repayments" stackId="a" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

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
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Monthly Costs</TableHead>
                  <TableHead className="text-right">Vs Target</TableHead>
                  <TableHead className="text-right">Loan Repayments</TableHead>
                  <TableHead className="text-right font-bold">Total Expenses</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, idx) => {
                  const variance = row.expenseCosts - TARGET_MONTHLY_COST;
                  const isOver = variance > 0;
                  const total = row.expenseCosts + row.expenseLoans;

                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{row.month}</TableCell>
                      <TableCell className="text-right">{row.expenseCosts.toLocaleString()}</TableCell>
                      <TableCell className={`text-right font-medium ${isOver ? 'text-destructive' : 'text-emerald-500'}`}>
                        {isOver ? '+' : ''}{variance.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">{row.expenseLoans.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold">{total.toLocaleString()}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
