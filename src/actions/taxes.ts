"use server";

import { kv } from "@vercel/kv";
import type { TaxRecord } from "@/context/TaxContext";

const DB_KEY = "financial_dashboard_taxes_v1";

export async function getTaxData(): Promise<TaxRecord[]> {
  try {
    const data = await kv.get<TaxRecord[]>(DB_KEY);
    return data || [];
  } catch (error) {
    console.error("Failed to fetch tax data from KV", error);
    return [];
  }
}

export async function saveTaxData(data: TaxRecord[]) {
  try {
    await kv.set(DB_KEY, data);
    return { success: true };
  } catch (error) {
    console.error("Failed to save tax data to KV", error);
    return { success: false, error: String(error) };
  }
}
