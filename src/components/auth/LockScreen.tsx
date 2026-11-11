"use client";

import React, { useState } from "react";
import { verifyPin } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";

export function LockScreen() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setLoading(true);
    setError("");

    const isValid = await verifyPin(pin);
    if (!isValid) {
      setError("Incorrect PIN. Access Denied.");
      setPin("");
      setLoading(false);
    } else {
      // Reload hard to fetch the layout components bypassing the old cache
      window.location.reload(); 
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#14171c]">
      <Card className="w-full max-w-md bg-[#1c2026] border border-[rgba(255,255,255,0.07)] rounded-[10px] shadow-none animate-in zoom-in-95 duration-300">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 bg-[#38bdf8]/10 rounded-full flex items-center justify-center mb-3 border border-[#38bdf8]/20">
            <Lock className="w-6 h-6 text-[#38bdf8]" />
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight text-[#f1f5f9]">Janitha's Vault</CardTitle>
          <CardDescription className="text-sm mt-1 text-[#94a3b8]">Enter your secure PIN to access your financial data.</CardDescription>
        </CardHeader>
        <CardContent className="mt-4">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Input 
                autoFocus
                type="password" 
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="──────" 
                className="text-center text-3xl tracking-[1em] font-mono h-14 bg-[#14171c] border-[rgba(255,255,255,0.07)] text-[#f1f5f9] focus-visible:ring-[#38bdf8]/40"
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-[#ef4444] bg-[rgba(239,68,68,0.12)] p-3 rounded-[8px] border border-[rgba(239,68,68,0.2)] text-xs font-mono animate-in slide-in-from-top-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            <Button type="submit" className="w-full h-11 text-base font-semibold bg-[#38bdf8] text-[#0f172a] hover:bg-[#38bdf8]/90" disabled={loading || pin.length < 4}>
              {loading ? "Verifying..." : "Unlock Dashboard"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
