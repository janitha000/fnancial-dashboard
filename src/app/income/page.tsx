"use client";

import React from "react";
import { IncomeDashboard } from "@/components/income/IncomeDashboard";
import { Wallet } from "lucide-react";

export default function IncomePage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
          <Wallet className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Income Streams</h1>
          <p className="text-muted-foreground italic">Comprehensive tracking of salary and passive earnings.</p>
        </div>
      </div>

      <IncomeDashboard />
    </div>
  );
}
