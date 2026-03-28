"use client";

import React, { useState } from "react";
import Papa from "papaparse";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useFinance, MonthlyRecord } from "@/context/FinanceContext";

export default function DataPage() {
  const { data, setData } = useFinance();
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        try {
          // A very basic parser mapping for demonstration
          // Real mapping logic would depend on exact user CSV columns
          const parsedData: MonthlyRecord[] = result.data.map((row: any) => ({
            month: row["Month"] || "Unknown",
            incomeFd: parseFloat(row["Income_FD"]) || 0,
            incomeUsdFd: parseFloat(row["Income_USD_FD"]) || 0,
            incomeSalary: parseFloat(row["Salary"]) || 0,
            incomeEquity: parseFloat(row["Equity"]) || 0,
            incomeDividends: parseFloat(row["Dividends"]) || 0,
            incomeStocks: parseFloat(row["Income_Stocks"]) || 0,

            expenseCosts: parseFloat(row["Monthly_Costs"]) || 0,
            expenseLoans: parseFloat(row["Loans"]) || 0,

            taxJanitha: parseFloat(row["Tax_Janitha"]) || 0,
            taxVindya: parseFloat(row["Tax_Vindya"]) || 0,

            assetNdb: parseFloat(row["Asset_NDB"]) || 0,
            assetSavings: parseFloat(row["Savings"]) || 0,
            assetLkrFd: parseFloat(row["LKR_FD"]) || 0,
            assetUsdFd: parseFloat(row["Asset_USD_FD"]) || 0,
            assetCalUt: parseFloat(row["CAL_UT"]) || 0,
            assetTbill: parseFloat(row["T_Bills"]) || 0,
            assetStocks: parseFloat(row["Asset_Stocks"]) || 0,
          }));

          setData(parsedData);
          setError(null);
        } catch (err) {
          setError("Failed to parse CSV to the required schema.");
          console.error(err);
        }
      },
      error: (error) => {
        setError(error.message);
      },
    });
  };

  const loadDummyData = () => {
    // Generate dummy data based on user constraints
    const dummy: MonthlyRecord[] = [];
    const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
    let currentWealth = 10000000; // Starting baseline 10 million

    months.forEach((month) => {
      const salary = 800000 + Math.random() * 50000;
      const costs = 480000 + Math.random() * 40000; // Hover around 500k target
      const stockReturns = (Math.random() - 0.2) * 50000;
      currentWealth += (salary - costs + stockReturns);
      
      dummy.push({
        month,
        incomeFd: 50000,
        incomeUsdFd: 40000,
        incomeSalary: salary,
        incomeEquity: 15000,
        incomeDividends: 10000,
        incomeStocks: stockReturns > 0 ? stockReturns : 0,

        expenseCosts: costs,
        expenseLoans: 50000,

        taxJanitha: 85000,
        taxVindya: 45000,

        assetNdb: 1500000,
        assetSavings: 800000,
        assetLkrFd: 3000000,
        assetUsdFd: 2000000,
        assetCalUt: 1000000,
        assetTbill: 2500000,
        assetStocks: 1200000 + (stockReturns > 0 ? stockReturns : 0),
      });
    });

    setData(dummy);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data Management</h1>
        <p className="text-muted-foreground">Upload your annual financial CSV or load sample data to test the dashboard.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV Metadata</CardTitle>
            <CardDescription>
              We will map custom headers later. For now, testing generic extraction.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input type="file" accept=".csv" onChange={handleFileUpload} />
            {error && <p className="text-destructive text-sm font-medium">{error}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Try with Sample Data</CardTitle>
            <CardDescription>
              For immediate testing, load a realistic generated dataset representing a full year.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={loadDummyData}>Load 2025/2026 Sample Data</Button>
          </CardContent>
        </Card>
      </div>

      {data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Parsed Data Preview ({data.length} records)</CardTitle>
            <CardDescription>First few records of your current dataset.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Total Income</TableHead>
                    <TableHead>Total Expenses</TableHead>
                    <TableHead>Total Tax</TableHead>
                    <TableHead>Net Worth Assets</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.slice(0, 5).map((row, idx) => {
                    const totalIncome = row.incomeFd + row.incomeUsdFd + row.incomeSalary + row.incomeEquity + row.incomeDividends + row.incomeStocks;
                    const totalExpenses = row.expenseCosts + row.expenseLoans;
                    const totalTax = row.taxJanitha + row.taxVindya;
                    const totalWealth = row.assetNdb + row.assetSavings + row.assetLkrFd + row.assetUsdFd + row.assetCalUt + row.assetTbill + row.assetStocks;
                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{row.month}</TableCell>
                        <TableCell>{totalIncome.toLocaleString()} LKR</TableCell>
                        <TableCell>{totalExpenses.toLocaleString()} LKR</TableCell>
                        <TableCell>{totalTax.toLocaleString()} LKR</TableCell>
                        <TableCell>{totalWealth.toLocaleString()} LKR</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
