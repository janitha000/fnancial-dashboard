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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] -z-10 animate-pulse pointer-events-none"></div>
      
      <Card className="w-full max-w-md bg-background/60 backdrop-blur-3xl border-white/10 shadow-2xl animate-in zoom-in-95 duration-500">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-extrabold tracking-tight">Janitha's Vault</CardTitle>
          <CardDescription className="text-base mt-2">Enter your secure PIN to access your financial data.</CardDescription>
        </CardHeader>
        <CardContent className="mt-4">
          <form onSubmit={handleSubmit} className="space-y-6">
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
                className="text-center text-3xl tracking-[1em] font-mono h-16 bg-background/50 border-white/10 focus-visible:ring-primary/50"
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20 text-sm font-medium animate-in slide-in-from-top-2">
                <ShieldAlert className="w-4 h-4" />
                {error}
              </div>
            )}
            <Button type="submit" className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/20" disabled={loading || pin.length < 4}>
              {loading ? "Verifying..." : "Unlock Dashboard"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
