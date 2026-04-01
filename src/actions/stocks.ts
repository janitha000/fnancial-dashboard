"use server";

import { kv } from "@vercel/kv";

// ─── Types ────────────────────────────────────────────────────────────────────

/** One row from the broker's XLSX export */
export type StockHolding = {
  security: string;
  quantity: number;
  clearedBalance: number;
  availableBalance: number;
  unsettledBuy: number;
  unsettledSell: number;
  holdingPctQty: number;
  avgPrice: number;
  besPrice: number;
  totalCost: number;
  tradedPrice: number;
  marketValue: number;
  holdingPctValue: number;
  salesCommission: number;
  salesProceeds: number;
  unrealizedGainLoss: number;
  unrealizedGainLossPct: number;
  unrealizedTodayGainLoss: number;
};

/** One month-end portfolio snapshot */
export type StockSnapshot = {
  id: string;
  financialYear: string;  // e.g. "2025/2026"
  month: string;          // e.g. "Apr"
  totalCost: number;
  portfolioValue: number;
  moneyOut: number;       // cash taken out / income withdrawn
  holdings: StockHolding[];
};

export type StockDividend = {
  id: string;
  security: string;
  amount: number;
  financialYear: string;
  month: string;
};

export type StocksDBState = {
  snapshots: StockSnapshot[];
  dividends: StockDividend[];
};

// ─── KV Persistence ──────────────────────────────────────────────────────────

const DB_KEY = "financial_dashboard_stocks_v1";

export async function getStockData(): Promise<StocksDBState> {
  try {
    const data = await kv.get<StocksDBState | StockSnapshot[]>(DB_KEY);
    if (!data) return { snapshots: [], dividends: [] };
    if (Array.isArray(data)) {
      return { snapshots: data, dividends: [] };
    }
    return { snapshots: data.snapshots || [], dividends: data.dividends || [] };
  } catch (error) {
    console.error("Failed to fetch stock data from KV", error);
    return { snapshots: [], dividends: [] };
  }
}

export async function saveStockData(data: StocksDBState) {
  try {
    await kv.set(DB_KEY, data);
    return { success: true };
  } catch (error) {
    console.error("Failed to save stock data to KV", error);
    return { success: false, error: String(error) };
  }
}
