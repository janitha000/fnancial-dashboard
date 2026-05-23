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
  type StockRealizedGain,
  type StockDividendGain,
} from "@/actions/stocks";

interface StocksContextType {
  snapshots: StockSnapshot[];
  dividends: StockDividend[];
  transactions: StockTransaction[];
  realizedGains: StockRealizedGain[];
  dividendGains: StockDividendGain[];
  isLoaded: boolean;
  upsertSnapshot: (snapshot: Omit<StockSnapshot, "id">) => Promise<void>;
  deleteSnapshot: (id: string) => Promise<void>;
  addDividend: (dividend: Omit<StockDividend, "id">) => Promise<void>;
  deleteDividend: (id: string) => Promise<void>;
  addTransaction: (transaction: Omit<StockTransaction, "id">) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addRealizedGain: (gain: Omit<StockRealizedGain, "id">) => Promise<void>;
  deleteRealizedGain: (id: string) => Promise<void>;
  addDividendGain: (gain: Omit<StockDividendGain, "id">) => Promise<void>;
  deleteDividendGain: (id: string) => Promise<void>;
}

const StocksContext = createContext<StocksContextType | undefined>(undefined);

export function StocksProvider({ children }: { children: ReactNode }) {
  const [snapshots, setSnapshots] = useState<StockSnapshot[]>([]);
  const [dividends, setDividends] = useState<StockDividend[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [realizedGains, setRealizedGains] = useState<StockRealizedGain[]>([]);
  const [dividendGains, setDividendGains] = useState<StockDividendGain[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getStockData();
        setSnapshots(data.snapshots);
        setDividends(data.dividends);
        setTransactions(data.transactions || []);
        setRealizedGains(data.realizedGains || []);
        setDividendGains(data.dividendGains || []);
      } catch (e) {
        console.error("Failed to load stock data", e);
      } finally {
        setIsLoaded(true);
      }
    }
    load();
  }, []);

  const persist = async (records: StockSnapshot[], divs: StockDividend[] = dividends, trans: StockTransaction[] = transactions, gains: StockRealizedGain[] = realizedGains, dGains: StockDividendGain[] = dividendGains) => {
    await saveStockData({ snapshots: records, dividends: divs, transactions: trans, realizedGains: gains, dividendGains: dGains });
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
    await persist(updated, dividends, transactions, realizedGains);
  };

  const deleteSnapshot = async (id: string) => {
    const updated = snapshots.filter((s) => s.id !== id);
    setSnapshots(updated);
    await persist(updated, dividends, transactions, realizedGains);
  };

  const addDividend = async (dividend: Omit<StockDividend, "id">) => {
    const newDiv: StockDividend = { ...dividend, id: crypto.randomUUID() };
    const updated = [...dividends, newDiv];
    setDividends(updated);
    await persist(snapshots, updated, transactions, realizedGains);
  };

  const deleteDividend = async (id: string) => {
    const updated = dividends.filter((d) => d.id !== id);
    setDividends(updated);
    await persist(snapshots, updated, transactions, realizedGains);
  };

  const addTransaction = async (transaction: Omit<StockTransaction, "id">) => {
    const newTrans: StockTransaction = { ...transaction, id: crypto.randomUUID() };
    const updated = [...transactions, newTrans];
    setTransactions(updated);
    await persist(snapshots, dividends, updated, realizedGains);
  };

  const deleteTransaction = async (id: string) => {
    const updated = transactions.filter((t) => t.id !== id);
    setTransactions(updated);
    await persist(snapshots, dividends, updated, realizedGains);
  };

  const addRealizedGain = async (gain: Omit<StockRealizedGain, "id">) => {
    const newGain: StockRealizedGain = { ...gain, id: crypto.randomUUID() };
    const updated = [...realizedGains, newGain];
    setRealizedGains(updated);
    await persist(snapshots, dividends, transactions, updated);
  };

  const deleteRealizedGain = async (id: string) => {
    const updated = realizedGains.filter((g) => g.id !== id);
    setRealizedGains(updated);
    await persist(snapshots, dividends, transactions, updated, dividendGains);
  };

  const addDividendGain = async (gain: Omit<StockDividendGain, "id">) => {
    const newGain: StockDividendGain = { ...gain, id: crypto.randomUUID() };
    const updated = [...dividendGains, newGain];
    setDividendGains(updated);
    await persist(snapshots, dividends, transactions, realizedGains, updated);
  };

  const deleteDividendGain = async (id: string) => {
    const updated = dividendGains.filter((g) => g.id !== id);
    setDividendGains(updated);
    await persist(snapshots, dividends, transactions, realizedGains, updated);
  };

  return (
    <StocksContext.Provider
      value={{
        snapshots,
        dividends,
        transactions,
        realizedGains,
        dividendGains,
        isLoaded,
        upsertSnapshot,
        deleteSnapshot,
        addDividend,
        deleteDividend,
        addTransaction,
        deleteTransaction,
        addRealizedGain,
        deleteRealizedGain,
        addDividendGain,
        deleteDividendGain,
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
