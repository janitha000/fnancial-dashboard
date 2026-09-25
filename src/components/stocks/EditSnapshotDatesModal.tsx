"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Check, Clock, RotateCcw } from "lucide-react";
import { useStocks } from "@/context/StocksContext";
import type { StockSnapshot } from "@/actions/stocks";

interface EditSnapshotDatesModalProps {
  snapshot: StockSnapshot;
  trigger?: React.ReactNode;
}

function getDefaultSnapshotDates(financialYear: string, month: string): { startDate: string; endDate: string } {
  const [sYearStr, eYearStr] = financialYear.split("/");
  const startYear = parseInt(sYearStr, 10) || new Date().getFullYear();
  const endYear = parseInt(eYearStr, 10) || startYear + 1;
  const monthMap: Record<string, number> = {
    Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
    Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
  };
  const mNum = monthMap[month] || 4;
  const year = ["Jan", "Feb", "Mar"].includes(month) ? endYear : startYear;
  const mStr = String(mNum).padStart(2, "0");
  const lastDay = new Date(year, mNum, 0).getDate();
  const lastDayStr = String(lastDay).padStart(2, "0");
  return {
    startDate: `${year}-${mStr}-01`,
    endDate: `${year}-${mStr}-${lastDayStr}`,
  };
}

export function EditSnapshotDatesModal({ snapshot, trigger }: EditSnapshotDatesModalProps) {
  const { updateSnapshotDates } = useStocks();
  const [open, setOpen] = useState(false);

  const defaults = getDefaultSnapshotDates(snapshot.financialYear, snapshot.month);
  const [startDate, setStartDate] = useState(snapshot.startDate || defaults.startDate);
  const [endDate, setEndDate] = useState(snapshot.endDate || defaults.endDate);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      const def = getDefaultSnapshotDates(snapshot.financialYear, snapshot.month);
      setStartDate(snapshot.startDate || def.startDate);
      setEndDate(snapshot.endDate || def.endDate);
      setSuccess(false);
    }
  }, [open, snapshot]);

  const handleResetDefaults = () => {
    const def = getDefaultSnapshotDates(snapshot.financialYear, snapshot.month);
    setStartDate(def.startDate);
    setEndDate(def.endDate);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSnapshotDates(snapshot.id, startDate, endDate);
      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
      }, 600);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* @ts-expect-error - local wrapper might not export asChild correctly */}
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 border-white/10 bg-white/5 hover:bg-white/10 text-white"
          >
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span>Edit Dates</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md bg-card border-white/10 text-white shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Edit Snapshot Period Dates</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {snapshot.month} {snapshot.financialYear} Snapshot
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-2">
          <div className="p-3 rounded-xl bg-background/50 border border-white/5 space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Financial Year: <strong className="text-white">{snapshot.financialYear}</strong></span>
              <span>Month: <strong className="text-white">{snapshot.month}</strong></span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="edit-start-date" className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3 text-primary/70" />
                  <span>Start Date</span>
                </Label>
                <Input
                  id="edit-start-date"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-background/80 border-white/10 text-white text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-end-date" className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-400/70" />
                  <span>End Date (As of)</span>
                </Label>
                <Input
                  id="edit-end-date"
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-background/80 border-white/10 text-white text-xs h-9"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-white/40">Default: 1st of month to end of month</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetDefaults}
                className="h-6 text-[11px] text-white/60 hover:text-white px-2"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset Defaults
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-white/10 text-white hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {success ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Dates</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
