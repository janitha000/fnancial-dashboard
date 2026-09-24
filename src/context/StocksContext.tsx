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
  type StockDailyPoint,
  type StockCapitalTransaction,
} from "@/actions/stocks";

interface StocksContextType {
  snapshots: StockSnapshot[];
  dividends: StockDividend[];
  transactions: StockTransaction[];
  realizedGains: StockRealizedGain[];
  dividendGains: StockDividendGain[];
  dailyPoints: StockDailyPoint[];
  monthlyDailyInputs: Record<string, string>;
  capitalTransactions: StockCapitalTransaction[];
  monthlyBaseCosts: Record<string, number>;
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
  saveDailyPoints: (points: StockDailyPoint[], monthKey?: string, rawJson?: string) => Promise<void>;
  addCapitalTransaction: (tx: Omit<StockCapitalTransaction, "id">) => Promise<void>;
  deleteCapitalTransaction: (id: string) => Promise<void>;
  saveMonthlyBaseCost: (monthKey: string, cost: number | null) => Promise<void>;
}

const StocksContext = createContext<StocksContextType | undefined>(undefined);

export function StocksProvider({ children }: { children: ReactNode }) {
  const [snapshots, setSnapshots] = useState<StockSnapshot[]>([]);
  const [dividends, setDividends] = useState<StockDividend[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [realizedGains, setRealizedGains] = useState<StockRealizedGain[]>([]);
  const [dividendGains, setDividendGains] = useState<StockDividendGain[]>([]);
  const [dailyPoints, setDailyPoints] = useState<StockDailyPoint[]>([]);
  const [monthlyDailyInputs, setMonthlyDailyInputs] = useState<Record<string, string>>({});
  const [capitalTransactions, setCapitalTransactions] = useState<StockCapitalTransaction[]>([]);
  const [monthlyBaseCosts, setMonthlyBaseCosts] = useState<Record<string, number>>({});
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
        setDailyPoints(data.dailyPoints || []);
        setMonthlyDailyInputs(data.monthlyDailyInputs || {});
        setCapitalTransactions(data.capitalTransactions || []);
        setMonthlyBaseCosts(data.monthlyBaseCosts || {});
      } catch (e) {
        console.error("Failed to load stock data", e);
      } finally {
        setIsLoaded(true);
      }
    }
    load();
  }, []);

  const persist = async (
    records: StockSnapshot[] = snapshots,
    divs: StockDividend[] = dividends,
    trans: StockTransaction[] = transactions,
    gains: StockRealizedGain[] = realizedGains,
    dGains: StockDividendGain[] = dividendGains,
    dPoints: StockDailyPoint[] = dailyPoints,
    mInputs: Record<string, string> = monthlyDailyInputs,
    cTrans: StockCapitalTransaction[] = capitalTransactions,
    bCosts: Record<string, number> = monthlyBaseCosts
  ) => {
    await saveStockData({
      snapshots: records,
      dividends: divs,
      transactions: trans,
      realizedGains: gains,
      dividendGains: dGains,
      dailyPoints: dPoints,
      monthlyDailyInputs: mInputs,
      capitalTransactions: cTrans,
      monthlyBaseCosts: bCosts,
    });
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
    await persist(updated, dividends, transactions, realizedGains, dividendGains, dailyPoints, monthlyDailyInputs, capitalTransactions);
  };

  const deleteSnapshot = async (id: string) => {
    const updated = snapshots.filter((s) => s.id !== id);
    setSnapshots(updated);
    await persist(updated, dividends, transactions, realizedGains, dividendGains, dailyPoints, monthlyDailyInputs, capitalTransactions);
  };

  const addDividend = async (dividend: Omit<StockDividend, "id">) => {
    const newDiv: StockDividend = { ...dividend, id: crypto.randomUUID() };
    const updated = [...dividends, newDiv];
    setDividends(updated);
    await persist(snapshots, updated, transactions, realizedGains, dividendGains, dailyPoints, monthlyDailyInputs, capitalTransactions);
  };

  const deleteDividend = async (id: string) => {
    const updated = dividends.filter((d) => d.id !== id);
    setDividends(updated);
    await persist(snapshots, updated, transactions, realizedGains, dividendGains, dailyPoints, monthlyDailyInputs, capitalTransactions);
  };

  const addTransaction = async (transaction: Omit<StockTransaction, "id">) => {
    const newTrans: StockTransaction = { ...transaction, id: crypto.randomUUID() };
    const updated = [...transactions, newTrans];
    setTransactions(updated);
    await persist(snapshots, dividends, updated, realizedGains, dividendGains, dailyPoints, monthlyDailyInputs, capitalTransactions);
  };

  const deleteTransaction = async (id: string) => {
    const updated = transactions.filter((t) => t.id !== id);
    setTransactions(updated);
    await persist(snapshots, dividends, updated, realizedGains, dividendGains, dailyPoints, monthlyDailyInputs, capitalTransactions);
  };

  const addRealizedGain = async (gain: Omit<StockRealizedGain, "id">) => {
    const newGain: StockRealizedGain = { ...gain, id: crypto.randomUUID() };
    const updated = [...realizedGains, newGain];
    setRealizedGains(updated);
    await persist(snapshots, dividends, transactions, updated, dividendGains, dailyPoints, monthlyDailyInputs, capitalTransactions);
  };

  const deleteRealizedGain = async (id: string) => {
    const updated = realizedGains.filter((g) => g.id !== id);
    setRealizedGains(updated);
    await persist(snapshots, dividends, transactions, updated, dividendGains, dailyPoints, monthlyDailyInputs, capitalTransactions);
  };

  const addDividendGain = async (gain: Omit<StockDividendGain, "id">) => {
    const newGain: StockDividendGain = { ...gain, id: crypto.randomUUID() };
    const updated = [...dividendGains, newGain];
    setDividendGains(updated);
    await persist(snapshots, dividends, transactions, realizedGains, updated, dailyPoints, monthlyDailyInputs, capitalTransactions);
  };

  const deleteDividendGain = async (id: string) => {
    const updated = dividendGains.filter((g) => g.id !== id);
    setDividendGains(updated);
    await persist(snapshots, dividends, transactions, realizedGains, updated, dailyPoints, monthlyDailyInputs, capitalTransactions);
  };

  const saveDailyPoints = async (newPoints: StockDailyPoint[], monthKey?: string, rawJson?: string) => {
    const map = new Map<string, number>();
    dailyPoints.forEach((p) => map.set(p.date, p.portfolio_value));
    newPoints.forEach((p) => map.set(p.date, p.portfolio_value));

    const updatedPoints: StockDailyPoint[] = Array.from(map.entries())
      .map(([date, portfolio_value]) => ({ date, portfolio_value }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const updatedInputs = { ...monthlyDailyInputs };
    if (monthKey && rawJson !== undefined) {
      updatedInputs[monthKey] = rawJson;
    }

    setDailyPoints(updatedPoints);
    setMonthlyDailyInputs(updatedInputs);
    await persist(snapshots, dividends, transactions, realizedGains, dividendGains, updatedPoints, updatedInputs, capitalTransactions);
  };

  const addCapitalTransaction = async (tx: Omit<StockCapitalTransaction, "id">) => {
    const newTx: StockCapitalTransaction = { ...tx, id: crypto.randomUUID() };
    const updated = [...capitalTransactions, newTx].sort((a, b) => a.date.localeCompare(b.date));
    setCapitalTransactions(updated);
    await persist(snapshots, dividends, transactions, realizedGains, dividendGains, dailyPoints, monthlyDailyInputs, updated);
  };

  const deleteCapitalTransaction = async (id: string) => {
    const updated = capitalTransactions.filter((t) => t.id !== id);
    setCapitalTransactions(updated);
    await persist(snapshots, dividends, transactions, realizedGains, dividendGains, dailyPoints, monthlyDailyInputs, updated);
  };

  const saveMonthlyBaseCost = async (monthKey: string, cost: number | null) => {
    const updated = { ...monthlyBaseCosts };
    if (cost === null || isNaN(cost)) {
      delete updated[monthKey];
    } else {
      updated[monthKey] = cost;
    }
    setMonthlyBaseCosts(updated);
    await persist(
      snapshots,
      dividends,
      transactions,
      realizedGains,
      dividendGains,
      dailyPoints,
      monthlyDailyInputs,
      capitalTransactions,
      updated
    );
  };

  return (
    <StocksContext.Provider
      value={{
        snapshots,
        dividends,
        transactions,
        realizedGains,
        dividendGains,
        dailyPoints,
        monthlyDailyInputs,
        capitalTransactions,
        monthlyBaseCosts,
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
        saveDailyPoints,
        addCapitalTransaction,
        deleteCapitalTransaction,
        saveMonthlyBaseCost,
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
