"use server";

import { kv } from "@vercel/kv";
import type { LoanData } from "@/context/LoanContext";

const DB_KEY = "financial_dashboard_loans_v1";

export async function getLoanData(): Promise<LoanData> {
  try {
    const data = await kv.get<LoanData>(DB_KEY);
    return data || { vehicleLoans: [], overdraftLoans: [] };
  } catch (error) {
    console.error("Failed to fetch loan data from KV", error);
    return { vehicleLoans: [], overdraftLoans: [] };
  }
}

export async function saveLoanData(data: LoanData) {
  try {
    await kv.set(DB_KEY, data);
    return { success: true };
  } catch (error) {
    console.error("Failed to save loan data to KV", error);
    return { success: false, error: String(error) };
  }
}
