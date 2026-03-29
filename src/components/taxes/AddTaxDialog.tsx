"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTax, generateFinancialYears, FINANCIAL_YEAR_MONTHS, TaxUser, IncomeType, PassiveCategory } from "@/context/TaxContext";

interface AddTaxDialogProps {
  open: boolean;
  onClose: () => void;
}

const PASSIVE_CATEGORIES: PassiveCategory[] = ["LKR FD", "UT", "TBill", "NDB Wealth"];

export function AddTaxDialog({ open, onClose }: AddTaxDialogProps) {
  const { addTaxRecord, selectedYear } = useTax();
  const fyOptions = generateFinancialYears(4);

  const [user, setUser] = useState<TaxUser>("Janitha");
  const [financialYear, setFinancialYear] = useState<string>(selectedYear);
  const [month, setMonth] = useState<string>("");
  const [incomeType, setIncomeType] = useState<IncomeType>("Salary");
  const [passiveCategory, setPassiveCategory] = useState<PassiveCategory>("LKR FD");
  const [totalIncome, setTotalIncome] = useState<string>("");
  const [taxPaid, setTaxPaid] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!month) e.month = "Select a month";
    if (!totalIncome || isNaN(Number(totalIncome)) || Number(totalIncome) < 0)
      e.totalIncome = "Enter a valid income amount";
    if (!taxPaid || isNaN(Number(taxPaid)) || Number(taxPaid) < 0)
      e.taxPaid = "Enter a valid tax amount";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await addTaxRecord({
        user,
        financialYear,
        month,
        incomeType,
        ...(incomeType === "Passive Income" ? { passiveCategory } : {}),
        totalIncome: Number(totalIncome),
        taxPaid: Number(taxPaid),
      });
      // Reset form
      setUser("Janitha");
      setFinancialYear(selectedYear);
      setMonth("");
      setIncomeType("Salary");
      setPassiveCategory("LKR FD");
      setTotalIncome("");
      setTaxPaid("");
      setErrors({});
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md bg-card border-white/10">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add Tax Record</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* User */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tax-user">User</Label>
              <Select value={user} onValueChange={(v) => v && setUser(v as TaxUser)}>
                <SelectTrigger id="tax-user" className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Janitha">Janitha</SelectItem>
                  <SelectItem value="Vindya">Vindya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Financial Year */}
            <div className="space-y-1.5">
              <Label htmlFor="tax-fy">Financial Year</Label>
              <Select value={financialYear} onValueChange={(v) => v && setFinancialYear(v)}>
                <SelectTrigger id="tax-fy" className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fyOptions.map((fy) => (
                    <SelectItem key={fy} value={fy}>{fy}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Month */}
          <div className="space-y-1.5">
            <Label htmlFor="tax-month">Month</Label>
            <Select value={month} onValueChange={(v) => v && setMonth(v)}>
              <SelectTrigger id="tax-month" className={`bg-background/50 ${errors.month ? "border-destructive" : ""}`}>
                <SelectValue placeholder="Select month…" />
              </SelectTrigger>
              <SelectContent>
                {FINANCIAL_YEAR_MONTHS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.month && <p className="text-xs text-destructive">{errors.month}</p>}
          </div>

          {/* Income Type */}
          <div className="space-y-1.5">
            <Label htmlFor="tax-income-type">Income Type</Label>
            <Select value={incomeType} onValueChange={(v) => v && setIncomeType(v as IncomeType)}>
              <SelectTrigger id="tax-income-type" className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Salary">Salary</SelectItem>
                <SelectItem value="Passive Income">Passive Income</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Passive Category — conditional */}
          {incomeType === "Passive Income" && (
            <div className="space-y-1.5">
              <Label htmlFor="tax-passive-cat">Passive Income Category</Label>
              <Select value={passiveCategory} onValueChange={(v) => v && setPassiveCategory(v as PassiveCategory)}>
                <SelectTrigger id="tax-passive-cat" className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PASSIVE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Total Income & Tax Paid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tax-total-income">Total Income (LKR)</Label>
              <Input
                id="tax-total-income"
                type="number"
                min="0"
                placeholder="0"
                value={totalIncome}
                onChange={(e) => setTotalIncome(e.target.value)}
                className={`bg-background/50 ${errors.totalIncome ? "border-destructive" : ""}`}
              />
              {errors.totalIncome && <p className="text-xs text-destructive">{errors.totalIncome}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tax-paid">Tax Paid (LKR)</Label>
              <Input
                id="tax-paid"
                type="number"
                min="0"
                placeholder="0"
                value={taxPaid}
                onChange={(e) => setTaxPaid(e.target.value)}
                className={`bg-background/50 ${errors.taxPaid ? "border-destructive" : ""}`}
              />
              {errors.taxPaid && <p className="text-xs text-destructive">{errors.taxPaid}</p>}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-primary hover:bg-primary/90">
            {saving ? "Saving…" : "Add Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
