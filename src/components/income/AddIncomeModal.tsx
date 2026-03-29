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
import { useIncome } from "@/context/IncomeContext";
import { useTax, FINANCIAL_YEAR_MONTHS, currentFinancialYear } from "@/context/TaxContext";
import { IncomeUser, IncomeType, PassiveCategory } from "@/actions/income";

export function AddIncomeModal() {
  const { addIncome } = useIncome();
  const { availableYears } = useTax();
  const [isOpen, setIsOpen] = useState(false);

  // Form State
  const [user, setUser] = useState<IncomeUser>("Janitha");
  const [type, setType] = useState<IncomeType>("Salary");
  const [category, setCategory] = useState<PassiveCategory>("LKR FD");
  const [fy, setFy] = useState(currentFinancialYear());
  const [month, setMonth] = useState(FINANCIAL_YEAR_MONTHS[0]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;

    await addIncome({
      user,
      type,
      category: type === "Passive Income" ? category : undefined,
      financialYear: fy,
      month,
      amount: Number(amount),
      description,
    });

    // Reset and close
    setAmount("");
    setDescription("");
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 gap-2">
        <PlusCircle className="h-4 w-4" />
        Add Income
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-card border-white/10 text-card-foreground">
        <DialogHeader>
          <DialogTitle>Add Income Record</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="user">User</Label>
              <Select value={user} onValueChange={(v: any) => setUser(v)}>
                <SelectTrigger id="user" className="bg-background/50 border-white/10">
                  <SelectValue placeholder="Select User" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Janitha">Janitha</SelectItem>
                  <SelectItem value="Vindya">Vindya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger id="type" className="bg-background/50 border-white/10">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Salary">Salary</SelectItem>
                  <SelectItem value="Passive Income">Passive Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {type === "Passive Income" && (
            <div className="space-y-2">
              <Label htmlFor="category">Passive Category</Label>
              <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                <SelectTrigger id="category" className="bg-background/50 border-white/10">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LKR FD">LKR FD</SelectItem>
                  <SelectItem value="USD FD">USD FD</SelectItem>
                  <SelectItem value="UT - Income Fund">UT - Income Fund</SelectItem>
                  <SelectItem value="UT - Equity Fund">UT - Equity Fund</SelectItem>
                  <SelectItem value="TBill">TBill</SelectItem>
                  <SelectItem value="Dividends">Dividends</SelectItem>
                  <SelectItem value="Stock Market">Stock Market</SelectItem>
                  <SelectItem value="NDB Wealth">NDB Wealth</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fy">Financial Year</Label>
              <Select value={fy} onValueChange={(v) => { if (v) setFy(v); }}>
                <SelectTrigger id="fy" className="bg-background/50 border-white/10">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <Select value={month} onValueChange={(v: any) => setMonth(v)}>
                <SelectTrigger id="month" className="bg-background/50 border-white/10">
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  {FINANCIAL_YEAR_MONTHS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              placeholder="e.g. Monthly salary adjustment"
              className="bg-background/50 border-white/10"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="submit" className="w-full">Save Income</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
