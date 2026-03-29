"use client";

import React from "react";
import { ExpenseDashboard } from "@/components/expenses/ExpenseDashboard";
import { CreditCard } from "lucide-react";

export default function ExpensesPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-xl shadow-primary/5">
          <CreditCard className="h-8 w-8 text-primary shadow-glow" />
        </div>
        <div>
          <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white to-white/60">
            Expense Tracker
          </h1>
          <p className="text-muted-foreground text-lg font-medium">
            Dynamic tracking of automated fixed costs and manual outgoings.
          </p>
        </div>
      </div>

      <ExpenseDashboard />
    </div>
  );
}
