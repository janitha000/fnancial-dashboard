"use server";

import { kv } from "@vercel/kv";

export type ExpenseCategory = "Household" | "Vehicle" | "Loan" | "OD" | "Tax";

export type ExpenseRecord = {
  id: string;
  financialYear: string; // e.g. "2024/2025"
  month: string;         // e.g. "Apr"
  amount: number;
  category: ExpenseCategory;
  description?: string;
};

const DB_KEY = "financial_dashboard_expenses_v1";

export async function getExpenseData(): Promise<ExpenseRecord[]> {
  try {
    const data = await kv.get<ExpenseRecord[]>(DB_KEY);
    return data || [];
  } catch (error) {
    console.error("Failed to fetch expense data from KV", error);
    return [];
  }
}

export async function saveExpenseData(data: ExpenseRecord[]) {
  try {
    await kv.set(DB_KEY, data);
    return { success: true };
  } catch (error) {
    console.error("Failed to save expense data to KV", error);
    return { success: false, error: String(error) };
  }
}
