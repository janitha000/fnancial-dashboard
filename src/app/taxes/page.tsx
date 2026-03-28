"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFinance } from "@/context/FinanceContext";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import { Receipt } from "lucide-react";

const COLORS = ['#8884d8', '#82ca9d'];

export default function TaxesPage() {
  const { data, hasData } = useFinance();

  const chartData = useMemo(() => {
    return data.map(d => ({
      month: d.month,
      Janitha: d.taxJanitha,
      Vindya: d.taxVindya,
    }));
  }, [data]);

  const totalBreakdown = useMemo(() => {
    let jTotal = 0;
    let vTotal = 0;
    data.forEach(d => {
      jTotal += d.taxJanitha;
      vTotal += d.taxVindya;
    });
    return [
      { name: "Janitha's Tax", value: jTotal },
      { name: "Vindya's Tax", value: vTotal }
    ];
  }, [data]);

  if (!hasData) {
    return <div className="p-8 text-center text-muted-foreground">Please upload data from the Data Management page first.</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Receipt className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tax Records</h1>
          <p className="text-muted-foreground">Monthly breakdown of taxes paid by individuals.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Monthly Tax Payments</CardTitle>
            <CardDescription>Comparison of monthly tax deductions</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val/1000).toFixed(0)}k`} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))'}} />
                <Legend />
                <Bar dataKey="Janitha" stackId="a" fill="#8884d8" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Vindya" stackId="a" fill="#82ca9d" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Total Contribution</CardTitle>
            <CardDescription>Share of total tax paid over the year</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={totalBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {totalBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => value.toLocaleString() + ' LKR'}
                    contentStyle={{backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))'}}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tax Ledger</CardTitle>
          <CardDescription>Detailed monthly records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Janitha</TableHead>
                  <TableHead className="text-right">Vindya</TableHead>
                  <TableHead className="text-right font-bold">Total Household Tax</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, idx) => {
                  const total = row.taxJanitha + row.taxVindya;
                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{row.month}</TableCell>
                      <TableCell className="text-right">{row.taxJanitha.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{row.taxVindya.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold text-destructive">{total.toLocaleString()}</TableCell>
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
