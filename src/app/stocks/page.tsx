"use client";

import React from "react";
import { StocksDashboard } from "@/components/stocks/StocksDashboard";
import { BarChart2 } from "lucide-react";

export default function StocksPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-xl shadow-primary/5">
          <BarChart2 className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white to-white/60">
            Stock Portfolio
          </h1>
          <p className="text-muted-foreground text-lg font-medium">
            Track month-end snapshots, unrealized gains, and income withdrawn.
          </p>
        </div>
      </div>

      <StocksDashboard />
    </div>
  );
}
