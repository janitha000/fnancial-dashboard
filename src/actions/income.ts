"use server";

import { kv } from "@vercel/kv";

export type IncomeUser = "Janitha" | "Vindya";
export type IncomeType = "Salary" | "Passive Income";
export type PassiveCategory = 
  | "LKR FD" 
  | "USD FD" 
  | "UT - Income Fund" 
  | "UT - Equity Fund" 
  | "TBill" 
  | "Dividends" 
  | "Stock Market" 
  | "NDB Wealth";

export type IncomeRecord = {
  id: string;
  user: IncomeUser;
  financialYear: string;
  month: string;
  type: IncomeType;
  category?: PassiveCategory;
  amount: number;
  description?: string;
};

const DB_KEY = "financial_dashboard_income_v2"; // Using v2 to avoid conflicts with old CSV data if any

export async function getIncomeData(): Promise<IncomeRecord[]> {
  try {
    const data = await kv.get<IncomeRecord[]>(DB_KEY);
    return data || [];
  } catch (error) {
    console.error("Failed to fetch income data from KV", error);
    return [];
  }
}

export async function saveIncomeData(data: IncomeRecord[]) {
  try {
    await kv.set(DB_KEY, data);
    return { success: true };
  } catch (error) {
    console.error("Failed to save income data to KV", error);
    return { success: false, error: String(error) };
  }
}
