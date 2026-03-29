"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import { getTaxData, saveTaxData } from "@/actions/taxes";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaxUser = "Janitha" | "Vindya";
export type IncomeType = "Salary" | "Passive Income";
export type PassiveCategory = "LKR FD" | "UT" | "TBill" | "NDB Wealth";

export const FINANCIAL_YEAR_MONTHS = [
  "Apr", "May", "Jun", "Jul", "Aug", "Sep",
  "Oct", "Nov", "Dec", "Jan", "Feb", "Mar",
] as const;

export type TaxRecord = {
  id: string;
  user: TaxUser;
  financialYear: string;   // e.g. "2025/2026"
  month: string;           // e.g. "Apr"
  incomeType: IncomeType;
  passiveCategory?: PassiveCategory;
  totalIncome: number;
  taxPaid: number;
};

// ─── Financial year helpers ───────────────────────────────────────────────────

/** Returns the current financial year string, e.g. "2025/2026" (Apr-based) */
export function currentFinancialYear(): string {
  const now = new Date();
  const m = now.getMonth(); // 0-indexed, Apr = 3
  const y = now.getFullYear();
  return m >= 3 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

/** Generate a list of FY options, newest first */
export function generateFinancialYears(count = 4): string[] {
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  const startYear = m >= 3 ? y : y - 1;
  return Array.from({ length: count }, (_, i) => {
    const base = startYear - i;
    return `${base}/${base + 1}`;
  });
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface TaxContextType {
  taxRecords: TaxRecord[];
  isLoaded: boolean;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  availableYears: string[];
  addTaxRecord: (record: Omit<TaxRecord, "id">) => Promise<void>;
  deleteTaxRecord: (id: string) => Promise<void>;
}

const TaxContext = createContext<TaxContextType | undefined>(undefined);

export function TaxProvider({ children }: { children: ReactNode }) {
  const [taxRecords, setTaxRecords] = useState<TaxRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>(currentFinancialYear());

  useEffect(() => {
    async function load() {
      try {
        const data = await getTaxData();
        setTaxRecords(data);
      } catch (e) {
        console.error("Failed to load tax data", e);
      } finally {
        setIsLoaded(true);
      }
    }
    load();
  }, []);

  const availableYears = useMemo(() => {
    const fromRecords = Array.from(new Set(taxRecords.map((r) => r.financialYear)));
    const defaults = generateFinancialYears(4);
    const merged = Array.from(new Set([...defaults, ...fromRecords]));
    merged.sort((a, b) => b.localeCompare(a)); // newest first
    return merged;
  }, [taxRecords]);

  const persist = async (records: TaxRecord[]) => {
    await saveTaxData(records);
  };

  const addTaxRecord = async (record: Omit<TaxRecord, "id">) => {
    const newRecord: TaxRecord = { ...record, id: crypto.randomUUID() };
    const updated = [...taxRecords, newRecord];
    setTaxRecords(updated);
    await persist(updated);
  };

  const deleteTaxRecord = async (id: string) => {
    const updated = taxRecords.filter((r) => r.id !== id);
    setTaxRecords(updated);
    await persist(updated);
  };

  return (
    <TaxContext.Provider
      value={{
        taxRecords,
        isLoaded,
        selectedYear,
        setSelectedYear,
        availableYears,
        addTaxRecord,
        deleteTaxRecord,
      }}
    >
      {children}
    </TaxContext.Provider>
  );
}

export function useTax() {
  const ctx = useContext(TaxContext);
  if (!ctx) throw new Error("useTax must be used within a TaxProvider");
  return ctx;
}
