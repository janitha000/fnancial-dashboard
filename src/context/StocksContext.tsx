"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  getStockData,
  saveStockData,
  type StockSnapshot,
  type StockDividend,
  type StockTransaction,
} from "@/actions/stocks";

interface StocksContextType {
  snapshots: StockSnapshot[];
  dividends: StockDividend[];
  transactions: StockTransaction[];
  isLoaded: boolean;
  upsertSnapshot: (snapshot: Omit<StockSnapshot, "id">) => Promise<void>;
  deleteSnapshot: (id: string) => Promise<void>;
  addDividend: (dividend: Omit<StockDividend, "id">) => Promise<void>;
  deleteDividend: (id: string) => Promise<void>;
  addTransaction: (transaction: Omit<StockTransaction, "id">) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}

const StocksContext = createContext<StocksContextType | undefined>(undefined);

export function StocksProvider({ children }: { children: ReactNode }) {
  const [snapshots, setSnapshots] = useState<StockSnapshot[]>([]);
  const [dividends, setDividends] = useState<StockDividend[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getStockData();
        setSnapshots(data.snapshots);
        setDividends(data.dividends);
        setTransactions(data.transactions || []);
      } catch (e) {
        console.error("Failed to load stock data", e);
      } finally {
        setIsLoaded(true);
      }
    }
    load();
  }, []);

  const persist = async (records: StockSnapshot[], divs: StockDividend[] = dividends, trans: StockTransaction[] = transactions) => {
    await saveStockData({ snapshots: records, dividends: divs, transactions: trans });
  };

  const upsertSnapshot = async (snapshot: Omit<StockSnapshot, "id">) => {
    const existing = snapshots.find(
      (s) => s.financialYear === snapshot.financialYear && s.month === snapshot.month
    );
    let updated: StockSnapshot[];
    if (existing) {
      updated = snapshots.map((s) =>
        s.id === existing.id ? { ...snapshot, id: existing.id } : s
      );
    } else {
      const newSnap: StockSnapshot = { ...snapshot, id: crypto.randomUUID() };
      updated = [...snapshots, newSnap];
    }
    setSnapshots(updated);
    await persist(updated, dividends);
  };

  const deleteSnapshot = async (id: string) => {
    const updated = snapshots.filter((s) => s.id !== id);
    setSnapshots(updated);
    await persist(updated, dividends);
  };

  const addDividend = async (dividend: Omit<StockDividend, "id">) => {
    const newDiv: StockDividend = { ...dividend, id: crypto.randomUUID() };
    const updated = [...dividends, newDiv];
    setDividends(updated);
    await persist(snapshots, updated);
  };

  const deleteDividend = async (id: string) => {
    const updated = dividends.filter((d) => d.id !== id);
    setDividends(updated);
    await persist(snapshots, updated, transactions);
  };

  const addTransaction = async (transaction: Omit<StockTransaction, "id">) => {
    const newTrans: StockTransaction = { ...transaction, id: crypto.randomUUID() };
    const updated = [...transactions, newTrans];
    setTransactions(updated);
    await persist(snapshots, dividends, updated);
  };

  const deleteTransaction = async (id: string) => {
    const updated = transactions.filter((t) => t.id !== id);
    setTransactions(updated);
    await persist(snapshots, dividends, updated);
  };

  return (
    <StocksContext.Provider
      value={{
        snapshots,
        dividends,
        transactions,
        isLoaded,
        upsertSnapshot,
        deleteSnapshot,
        addDividend,
        deleteDividend,
        addTransaction,
        deleteTransaction,
      }}
    >
      {children}
    </StocksContext.Provider>
  );
}

export function useStocks() {
  const ctx = useContext(StocksContext);
  if (!ctx) throw new Error("useStocks must be used within a StocksProvider");
  return ctx;
}
