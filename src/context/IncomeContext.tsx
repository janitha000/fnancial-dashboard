"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { getIncomeData, saveIncomeData, type IncomeRecord } from "@/actions/income";

interface IncomeContextType {
  incomeRecords: IncomeRecord[];
  isLoaded: boolean;
  addIncome: (record: Omit<IncomeRecord, "id">) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
}

const IncomeContext = createContext<IncomeContextType | undefined>(undefined);

export function IncomeProvider({ children }: { children: ReactNode }) {
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getIncomeData();
        setIncomeRecords(data);
      } catch (e) {
        console.error("Failed to load income data", e);
      } finally {
        setIsLoaded(true);
      }
    }
    load();
  }, []);

  const persist = async (records: IncomeRecord[]) => {
    await saveIncomeData(records);
  };

  const addIncome = async (record: Omit<IncomeRecord, "id">) => {
    const newRecord: IncomeRecord = { ...record, id: crypto.randomUUID() };
    const updated = [...incomeRecords, newRecord];
    setIncomeRecords(updated);
    await persist(updated);
  };

  const deleteIncome = async (id: string) => {
    const updated = incomeRecords.filter((r) => r.id !== id);
    setIncomeRecords(updated);
    await persist(updated);
  };

  return (
    <IncomeContext.Provider
      value={{
        incomeRecords,
        isLoaded,
        addIncome,
        deleteIncome,
      }}
    >
      {children}
    </IncomeContext.Provider>
  );
}

export function useIncome() {
  const ctx = useContext(IncomeContext);
  if (!ctx) throw new Error("useIncome must be used within an IncomeProvider");
  return ctx;
}
