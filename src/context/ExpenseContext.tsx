"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import { getExpenseData, saveExpenseData, type ExpenseRecord, type ExpenseCategory } from "@/actions/expenses";
import { useLoan, getVehicleLoanMetrics } from "./LoanContext";
import { useTax, FINANCIAL_YEAR_MONTHS } from "./TaxContext";

interface ExpenseContextType {
  manualExpenses: ExpenseRecord[];
  isLoaded: boolean;
  addExpense: (expense: Omit<ExpenseRecord, "id">) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  getMonthlyExpenses: (fy: string, month: string) => CombinedExpense[];
  getFYExpenses: (fy: string) => Record<string, CombinedExpense[]>;
}

export interface CombinedExpense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  isAutomatic: boolean;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export function ExpenseProvider({ children }: { children: ReactNode }) {
  const [manualExpenses, setManualExpenses] = useState<ExpenseRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const { vehicleLoans, overdraftLoans } = useLoan();
  const { taxRecords } = useTax();

  const HOUSEHOLD_AUTO_AMOUNT = 500000;

  useEffect(() => {
    async function load() {
      try {
        const data = await getExpenseData();
        setManualExpenses(data);
      } catch (e) {
        console.error("Failed to load expense data", e);
      } finally {
        setIsLoaded(true);
      }
    }
    load();
  }, []);

  const persist = async (records: ExpenseRecord[]) => {
    await saveExpenseData(records);
  };

  const addExpense = async (expense: Omit<ExpenseRecord, "id">) => {
    const newRecord: ExpenseRecord = { ...expense, id: crypto.randomUUID() };
    const updated = [...manualExpenses, newRecord];
    setManualExpenses(updated);
    await persist(updated);
  };

  const deleteExpense = async (id: string) => {
    const updated = manualExpenses.filter((r) => r.id !== id);
    setManualExpenses(updated);
    await persist(updated);
  };

  const getMonthlyExpenses = (fy: string, month: string): CombinedExpense[] => {
    const combined: CombinedExpense[] = [];

    // 1. Manual Expenses
    manualExpenses
      .filter((e) => e.financialYear === fy && e.month === month)
      .forEach((e) => {
        combined.push({
          id: e.id,
          category: e.category,
          amount: e.amount,
          description: e.description || `Manual ${e.category}`,
          isAutomatic: false,
        });
      });

    // 2. Automatic Household
    combined.push({
      id: `auto-household-${fy}-${month}`,
      category: "Household",
      amount: HOUSEHOLD_AUTO_AMOUNT,
      description: "Automatic Household Expense",
      isAutomatic: true,
    });

    // 3. Automatic Loans (Vehicle)
    vehicleLoans.forEach((loan) => {
      const targetDate = getFirstDayOfMonth(fy, month);
      const startDate = new Date(loan.dateOfLoan);
      
      // 3a. Handle Settlement Logic
      if (loan.settled) {
        const settleDate = new Date(loan.settled.settleDate);
        
        // If settled before this month, stop all expenses for this loan
        if (isDateBeforeMonth(settleDate, fy, month)) {
          return;
        }
        
        // If settled IN this month, add settlement amount and stop EMI
        if (isDateInMonth(settleDate, fy, month)) {
          combined.push({
            id: `auto-loan-settle-${loan.id}-${fy}-${month}`,
            category: "Loan",
            amount: loan.settled.settleAmount,
            description: `Loan Settlement: ${loan.name}`,
            isAutomatic: true,
          });
          return; // Skip EMI for this month
        }
      }

      // 3b. Normal EMI Logic (only if not settled)
      const diffTime = targetDate.getTime() - startDate.getTime();
      const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.4375));
      
      if (diffMonths >= 0 && diffMonths < loan.duration) {
         combined.push({
            id: `auto-loan-${loan.id}-${fy}-${month}`,
            category: "Loan",
            amount: loan.monthlyPayment,
            description: `Auto EMI: ${loan.name}`,
            isAutomatic: true,
         });
      }
    });

    // 4. Automatic OD (Settlements + Interest)
    overdraftLoans.forEach((loan) => {
      loan.settlements.forEach((s) => {
        if (isDateInMonth(new Date(s.date), fy, month)) {
          combined.push({
            id: `auto-od-set-${s.id}`,
            category: "OD",
            amount: s.amount,
            description: `OD Settlement: ${loan.name}`,
            isAutomatic: true,
          });
        }
      });
      loan.interestAccruals?.forEach((a) => {
        if (isDateInMonth(new Date(a.date), fy, month)) {
          combined.push({
            id: `auto-od-int-${a.id}`,
            category: "OD",
            amount: a.amount,
            description: `OD Interest: ${loan.name}`,
            isAutomatic: true,
          });
        }
      });
    });

    // 5. Automatic Taxes
    taxRecords
      .filter((r) => r.financialYear === fy && r.month === month)
      .forEach((r) => {
        combined.push({
          id: `auto-tax-${r.id}`,
          category: "Tax",
          amount: r.taxPaid,
          description: `Tax: ${r.user} (${r.incomeType})`,
          isAutomatic: true,
        });
      });

    return combined;
  };

  const getFYExpenses = (fy: string): Record<string, CombinedExpense[]> => {
    const fyData: Record<string, CombinedExpense[]> = {};
    FINANCIAL_YEAR_MONTHS.forEach((month) => {
      fyData[month] = getMonthlyExpenses(fy, month);
    });
    return fyData;
  };

  return (
    <ExpenseContext.Provider
      value={{
        manualExpenses,
        isLoaded,
        addExpense,
        deleteExpense,
        getMonthlyExpenses,
        getFYExpenses,
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpenses() {
  const ctx = useContext(ExpenseContext);
  if (!ctx) throw new Error("useExpenses must be used within an ExpenseProvider");
  return ctx;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFirstDayOfMonth(fy: string, monthName: string): Date {
  // fy is "2024/2025"
  // months 0-8 (Apr-Dec) are in startYear
  // months 9-11 (Jan-Mar) are in endYear
  const [startYearStr, endYearStr] = fy.split("/");
  const startYear = parseInt(startYearStr);
  const endYear = parseInt(endYearStr);

  const monthIdx = FINANCIAL_YEAR_MONTHS.indexOf(monthName as any);
  const year = monthIdx <= 8 ? startYear : endYear;
  
  // Map "Apr" -> 3 (index in JS Date is 0-indexed where Apr is 3)
  const calendarMonthMap: Record<string, number> = {
    "Jan": 0, "Feb": 1, "Mar": 2, "Apr": 3, "May": 4, "Jun": 5,
    "Jul": 6, "Aug": 7, "Sep": 8, "Oct": 9, "Nov": 10, "Dec": 11
  };
  
  return new Date(year, calendarMonthMap[monthName], 1);
}

function isDateInMonth(date: Date, fy: string, monthName: string): boolean {
  const target = getFirstDayOfMonth(fy, monthName);
  return date.getMonth() === target.getMonth() && date.getFullYear() === target.getFullYear();
}

function isDateBeforeMonth(date: Date, fy: string, monthName: string): boolean {
  const target = getFirstDayOfMonth(fy, monthName);
  if (date.getFullYear() < target.getFullYear()) return true;
  if (date.getFullYear() === target.getFullYear() && date.getMonth() < target.getMonth()) return true;
  return false;
}
