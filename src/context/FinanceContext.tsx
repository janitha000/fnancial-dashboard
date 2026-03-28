"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export interface MonthlyRecord {
  month: string;
  // Income
  incomeFd: number;
  incomeUsdFd: number;
  incomeSalary: number;
  incomeEquity: number;
  incomeDividends: number;
  incomeStocks: number;
  // Expenses
  expenseCosts: number;
  expenseLoans: number;
  // Taxes
  taxJanitha: number;
  taxVindya: number;
  // Assets
  assetNdb: number;
  assetSavings: number;
  assetLkrFd: number;
  assetUsdFd: number;
  assetCalUt: number;
  assetTbill: number;
  assetStocks: number;
}

interface FinanceContextType {
  data: MonthlyRecord[];
  setData: (data: MonthlyRecord[]) => void;
  // Derived quick access summary
  hasData: boolean;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<MonthlyRecord[]>([]);

  const value = {
    data,
    setData,
    hasData: data.length > 0,
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error("useFinance must be used within a FinanceProvider");
  }
  return context;
}
