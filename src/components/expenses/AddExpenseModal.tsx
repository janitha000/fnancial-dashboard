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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle } from "lucide-react";
import { useExpenses } from "@/context/ExpenseContext";
import { useTax, FINANCIAL_YEAR_MONTHS, currentFinancialYear, generateFinancialYears } from "@/context/TaxContext";
import { ExpenseCategory } from "@/actions/expenses";

export function AddExpenseModal() {
  const { addExpense } = useExpenses();
  const { availableYears } = useTax();
  const [isOpen, setIsOpen] = useState(false);

  // Form State
  const [fy, setFy] = useState(currentFinancialYear());
  const [month, setMonth] = useState(FINANCIAL_YEAR_MONTHS[0]);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("Household");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;

    await addExpense({
      financialYear: fy,
      month: month,
      amount: Number(amount),
      category,
      description,
    });

    // Reset and close
    setAmount("");
    setDescription("");
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger>
        <Button className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-card border-white/10 text-card-foreground">
        <DialogHeader>
          <DialogTitle>Add Manual Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fy">Financial Year</Label>
              <Select value={fy} onValueChange={(v) => { if (v) setFy(v); }}>
                <SelectTrigger id="fy" className="bg-background/50 border-white/10">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <Select value={month} onValueChange={(v) => { if (v) setMonth(v as any); }}>
                <SelectTrigger id="month" className="bg-background/50 border-white/10">
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  {FINANCIAL_YEAR_MONTHS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={(v) => { if (v) setCategory(v as any); }}>
              <SelectTrigger id="category" className="bg-background/50 border-white/10">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Household">Household</SelectItem>
                <SelectItem value="Vehicle">Vehicle</SelectItem>
                <SelectItem value="Loan">Loan</SelectItem>
                <SelectItem value="OD">OD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (LKR)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="bg-background/50 border-white/10"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Electricity bill"
              className="bg-background/50 border-white/10"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="submit" className="w-full">Save Expense</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
