"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFinance } from "@/context/FinanceContext";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Wallet } from "lucide-react";

export default function IncomePage() {
  const { data, hasData } = useFinance();

  const chartData = useMemo(() => {
    return data.map(d => ({
      month: d.month,
      "Local Income": d.incomeFd + d.incomeSalary + d.incomeEquity + d.incomeDividends + d.incomeStocks,
      "Foreign Income": d.incomeUsdFd,
    }));
  }, [data]);

  if (!hasData) {
    return <div className="p-8 text-center text-muted-foreground">Please upload data from the Data Management page first.</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Wallet className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Income Breakdown</h1>
          <p className="text-muted-foreground">Detailed view of local vs. foreign income streams.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Income Trends</CardTitle>
          <CardDescription>Monthly comparison of local versus foreign (USD FD) income</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorLocal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorForeign" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
              <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))'}} />
              <Legend />
              <Area type="monotone" dataKey="Local Income" stroke="#8884d8" fillOpacity={1} fill="url(#colorLocal)" />
              <Area type="monotone" dataKey="Foreign Income" stroke="#82ca9d" fillOpacity={1} fill="url(#colorForeign)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Income Ledger</CardTitle>
          <CardDescription>Tabular view of all monthly income sources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Salary</TableHead>
                  <TableHead className="text-right">LKR FD</TableHead>
                  <TableHead className="text-right">USD FD</TableHead>
                  <TableHead className="text-right">Equity</TableHead>
                  <TableHead className="text-right">Dividends</TableHead>
                  <TableHead className="text-right">Stocks</TableHead>
                  <TableHead className="text-right font-bold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, idx) => {
                  const total = row.incomeSalary + row.incomeFd + row.incomeUsdFd + row.incomeEquity + row.incomeDividends + row.incomeStocks;
                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{row.month}</TableCell>
                      <TableCell className="text-right">{row.incomeSalary.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{row.incomeFd.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{row.incomeUsdFd.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{row.incomeEquity.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{row.incomeDividends.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{row.incomeStocks.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold text-primary">{total.toLocaleString()}</TableCell>
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
