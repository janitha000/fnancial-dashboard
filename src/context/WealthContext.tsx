"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getWealthData, saveWealthData } from "@/actions/wealth";

export type WealthRecord = {
  category: string;
  subCategory: string;
  amount: number;
};

export type WealthMonth = {
  id: string; // Format: "YYYY-MM"
  year: string;
  month: string;
  records: WealthRecord[];
};

export const sortWealthMonths = (a: WealthMonth, b: WealthMonth) => {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (a.year !== b.year) {
    return a.year.localeCompare(b.year);
  }
  const idxA = MONTHS.indexOf(a.month);
  const idxB = MONTHS.indexOf(b.month);
  
  // If financial year (e.g. 2025/2026), Apr to Dec are indices 3-11, Jan to Mar are 0-2 (next calendar year logically)
  const scoreA = a.year.includes('/') ? ((idxA >= 3) ? idxA - 3 : idxA + 9) : idxA;
  const scoreB = b.year.includes('/') ? ((idxB >= 3) ? idxB - 3 : idxB + 9) : idxB;
  
  return scoreA - scoreB;
};

interface WealthContextType {
  wealthMonths: WealthMonth[];
  addMonthData: (year: string, month: string, records: WealthRecord[]) => Promise<void>;
  deleteMonthData: (id: string) => Promise<void>;
  hasWealthData: boolean;
  isLoaded: boolean;
}

const WealthContext = createContext<WealthContextType | undefined>(undefined);

export function WealthProvider({ children }: { children: ReactNode }) {
  const [wealthMonths, setWealthMonths] = useState<WealthMonth[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from Vercel KV on mount instead of localStorage
  useEffect(() => {
    async function loadDB() {
      try {
        const data = await getWealthData();
        setWealthMonths(data);
      } catch (e) {
        console.error("Failed to load DB", e);
      } finally {
        setIsLoaded(true);
      }
    }
    loadDB();
  }, []);

  const addMonthData = async (year: string, month: string, records: WealthRecord[]) => {
    const id = `${year}-${month}`;
    let newArray: WealthMonth[] = [];
    
    // Optimistic UI update
    setWealthMonths((prev) => {
      const filtered = prev.filter((m) => m.id !== id);
      const newMonth: WealthMonth = { id, year, month, records };
      
      const updated = [...filtered, newMonth];
      updated.sort(sortWealthMonths); // Correct chronological FY order
      
      newArray = updated;
      return updated;
    });

    // Sync payload to database behind the scenes
    await saveWealthData(newArray);
  };

  const deleteMonthData = async (id: string) => {
    let newArray: WealthMonth[] = [];
    
    setWealthMonths((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      newArray = updated;
      return updated;
    });

    // Sync to database
    await saveWealthData(newArray);
  };

  const value = {
    wealthMonths,
    addMonthData,
    deleteMonthData,
    hasWealthData: wealthMonths.length > 0,
    isLoaded
  };

  return <WealthContext.Provider value={value}>{children}</WealthContext.Provider>;
}

export function useWealth() {
  const context = useContext(WealthContext);
  if (context === undefined) {
    throw new Error("useWealth must be used within a WealthProvider");
  }
  return context;
}
