"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileJson, CheckCircle2, AlertCircle } from "lucide-react";
import { useStocks } from "@/context/StocksContext";
import {
  FINANCIAL_YEAR_MONTHS,
  generateFinancialYears,
} from "@/context/TaxContext";
import type { StockDailyPoint } from "@/actions/stocks";

interface InputDailyJsonModalProps {
  currentFY?: string;
  currentMonth?: string;
  trigger?: React.ReactNode;
}

export function InputDailyJsonModal({
  currentFY = "2026/2027",
  currentMonth = "Aug",
  trigger,
}: InputDailyJsonModalProps) {
  const { monthlyDailyInputs, saveDailyPoints } = useStocks();
  const availableYears = generateFinancialYears(4);

  const [open, setOpen] = useState(false);
  const [selectedFY, setSelectedFY] = useState(currentFY);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const monthKey = `${selectedFY}-${selectedMonth}`;
  const [rawText, setRawText] = useState(monthlyDailyInputs[monthKey] || "");
  const [parsedPreview, setParsedPreview] = useState<{ count: number; start: string; end: string } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const parsePoints = (text: string): StockDailyPoint[] | null => {
    const trimmed = text.trim();
    if (!trimmed) return [];

    const validPoints: StockDailyPoint[] = [];

    const addPoint = (rawDate: any, rawVal: any) => {
      let dateStr = String(rawDate ?? "").trim();
      const val = typeof rawVal === "number" ? rawVal : parseFloat(String(rawVal));

      if (dateStr && !isNaN(val)) {
        // Normalize DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD
        const dmyMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (dmyMatch) {
          const [_, d, m, y] = dmyMatch;
          dateStr = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
        }
        validPoints.push({ date: dateStr, portfolio_value: val });
      }
    };

    // 1. Try standard / adjusted JSON parsing
    try {
      // Remove trailing commas after object properties or list items:
      let jsonStr = trimmed.replace(/,\s*([\]}])/g, "$1").replace(/,\s*$/, "");
      
      // If it doesn't start with [ or {
      if (!jsonStr.startsWith("[") && !jsonStr.startsWith("{")) {
        jsonStr = `[${jsonStr}]`;
      } else if (jsonStr.startsWith("{")) {
        // Test if wrapping in [...] parses as an array of objects
        try {
          const wrapped = `[${jsonStr}]`;
          const testArray = JSON.parse(wrapped);
          if (Array.isArray(testArray) && testArray.length > 1 && testArray.every((item) => typeof item === "object")) {
            jsonStr = wrapped;
          }
        } catch {
          // keep jsonStr as is
        }
      }

      const parsed = JSON.parse(jsonStr);
      let rawArray: any[] = [];
      if (Array.isArray(parsed)) {
        rawArray = parsed;
      } else if (parsed && Array.isArray(parsed.points)) {
        rawArray = parsed.points;
      } else if (parsed && typeof parsed === "object") {
        if (parsed.date !== undefined && (parsed.portfolio_value !== undefined || parsed.value !== undefined)) {
          rawArray = [parsed];
        } else {
          rawArray = Object.entries(parsed).map(([date, val]) => ({
            date,
            portfolio_value: typeof val === "number" ? val : parseFloat(String(val)),
          }));
        }
      }

      rawArray.forEach((item) => {
        if (item && typeof item === "object") {
          addPoint(item.date, item.portfolio_value ?? item.value);
        }
      });

      if (validPoints.length > 0) {
        const map = new Map<string, number>();
        validPoints.forEach((p) => map.set(p.date, p.portfolio_value));
        return Array.from(map.entries())
          .map(([date, portfolio_value]) => ({ date, portfolio_value }))
          .sort((a, b) => a.date.localeCompare(b.date));
      }
    } catch {
      // Proceed to regex fallback
    }

    // 2. Regex fallback for loose / unquoted formats
    const objectRegex = /\{[^{}]*?(?:"date"|'date'|date)\s*:\s*["']?([^"',\s}]+)["']?[^{}]*?(?:"portfolio_value"|'portfolio_value'|portfolio_value|"value"|'value'|value)\s*:\s*([0-9.]+)[^{}]*?\}/gi;
    const reverseRegex = /\{[^{}]*?(?:"portfolio_value"|'portfolio_value'|portfolio_value|"value"|'value'|value)\s*:\s*([0-9.]+)[^{}]*?(?:"date"|'date'|date)\s*:\s*["']?([^"',\s}]+)["']?[^{}]*?\}/gi;

    let match;
    while ((match = objectRegex.exec(trimmed)) !== null) {
      addPoint(match[1], match[2]);
    }

    if (validPoints.length === 0) {
      while ((match = reverseRegex.exec(trimmed)) !== null) {
        addPoint(match[2], match[1]);
      }
    }

    if (validPoints.length > 0) {
      const map = new Map<string, number>();
      validPoints.forEach((p) => map.set(p.date, p.portfolio_value));
      return Array.from(map.entries())
        .map(([date, portfolio_value]) => ({ date, portfolio_value }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    return null;
  };

  const handleTextChange = (text: string) => {
    setRawText(text);
    if (!text.trim()) {
      setParseError(null);
      setParsedPreview(null);
      return;
    }

    const pts = parsePoints(text);
    if (pts === null) {
      setParseError("Invalid format. Please check your JSON objects.");
      setParsedPreview(null);
    } else if (pts.length === 0) {
      setParseError("No valid points found with 'date' and 'portfolio_value'.");
      setParsedPreview(null);
    } else {
      setParseError(null);
      setParsedPreview({
        count: pts.length,
        start: pts[0].date,
        end: pts[pts.length - 1].date,
      });
    }
  };

  const handleMonthChange = (fy: string, m: string) => {
    setSelectedFY(fy);
    setSelectedMonth(m);
    const key = `${fy}-${m}`;
    const existing = monthlyDailyInputs[key] || "";
    setRawText(existing);
    handleTextChange(existing);
  };

  const handleClear = () => {
    setRawText("");
    handleTextChange("");
  };

  const handleSave = async () => {
    const pts = parsePoints(rawText);
    if (!pts || pts.length === 0) return;

    setSaving(true);
    try {
      await saveDailyPoints(pts, monthKey, rawText);
      setOpen(false);
    } catch (e) {
      console.error(e);
      setParseError("Failed to save data.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o);
      if (o) {
        handleMonthChange(currentFY, currentMonth);
      }
    }}>
      {/* @ts-expect-error - local wrapper might not export asChild correctly */}
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            className="border-primary/20 bg-primary/10 hover:bg-primary/20 text-primary font-semibold h-10 px-3"
          >
            <FileJson className="w-4 h-4 mr-2" />
            Input Daily JSON
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-card border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <FileJson className="w-5 h-5 text-primary" />
            Input Monthly Daily Portfolio Values
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Month selector */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Financial Year</Label>
              <Select
                value={selectedFY}
                onValueChange={(v) => { if (v) handleMonthChange(v, selectedMonth); }}
              >
                <SelectTrigger className="border-white/10 bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((fy) => (
                    <SelectItem key={fy} value={fy}>{fy}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Month</Label>
              <Select
                value={selectedMonth}
                onValueChange={(v) => { if (v) handleMonthChange(selectedFY, v); }}
              >
                <SelectTrigger className="border-white/10 bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FINANCIAL_YEAR_MONTHS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* JSON Textarea */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label className="text-xs text-muted-foreground">Daily Portfolio Values Payload</Label>
              <span className="text-[11px] text-white/40">
                Format: {"{ \"date\": \"...\", \"portfolio_value\": ... }"}
              </span>
            </div>
            <textarea
              rows={11}
              className="w-full font-mono text-xs p-3 rounded-lg bg-background/80 border border-white/15 focus:outline-none focus:border-primary text-white resize-y leading-relaxed"
              placeholder={`{\n  "date": "2025-09-17",\n  "portfolio_value": 225594.72\n},\n{\n  "date": "2025-09-18",\n  "portfolio_value": 229451.04\n},\n{\n  "date": "2025-09-19",\n  "portfolio_value": 229451.04\n}`}
              value={rawText}
              onChange={(e) => handleTextChange(e.target.value)}
            />
          </div>

          {parseError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {parsedPreview && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                Detected <strong>{parsedPreview.count} daily records</strong> from{" "}
                <strong>{parsedPreview.start}</strong> to <strong>{parsedPreview.end}</strong>.
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-row justify-between items-center w-full sm:justify-between">
          <div>
            {rawText && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={saving}
                className="text-xs text-white/50 hover:text-red-400 hover:bg-red-500/10"
              >
                Clear Text
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !parsedPreview || parsedPreview.count === 0}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {saving ? "Saving..." : "Save Daily Points"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
