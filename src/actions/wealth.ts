"use server";

import { kv } from "@vercel/kv";
import type { WealthMonth } from "@/context/WealthContext";

const DB_KEY = "financial_dashboard_wealth_v1";

export async function getWealthData(): Promise<WealthMonth[]> {
  try {
    const data = await kv.get<WealthMonth[]>(DB_KEY);
    return data || [];
  } catch (error) {
    console.error("Failed to fetch wealth data from KV", error);
    return [];
  }
}

export async function saveWealthData(data: WealthMonth[]) {
  try {
    await kv.set(DB_KEY, data);
    return { success: true };
  } catch (error) {
    console.error("Failed to save wealth data to KV", error);
    return { success: false, error: String(error) };
  }
}
