"use client";

import { useState } from "react";
import { Plus, Car, CreditCard, X } from "lucide-react";
import { useLoan } from "@/context/LoanContext";

type LoanType = "vehicle" | "overdraft" | "credit_card" | null;

export function AddLoanForm() {
  const { addVehicleLoan, addOverdraftLoan, addCreditCardLoan } = useLoan();
  const [open, setOpen] = useState(false);
  const [loanType, setLoanType] = useState<LoanType>(null);
  const [loading, setLoading] = useState(false);

  // Vehicle fields
  const [vName, setVName] = useState("");
  const [vAmount, setVAmount] = useState("");
  const [vRate, setVRate] = useState("");
  const [vDuration, setVDuration] = useState("");
  const [vMonthly, setVMonthly] = useState("");
  const [vDate, setVDate] = useState("");

  // Overdraft fields
  const [oName, setOName] = useState("");
  const [oAmount, setOAmount] = useState("");
  const [oDate, setODate] = useState("");

  const autoCalcMonthly = () => {
    const P = parseFloat(vAmount);
    const r = parseFloat(vRate) / 100 / 12;
    const n = parseInt(vDuration);
    if (!P || !r || !n) return;
    const payment = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    setVMonthly(payment.toFixed(2));
  };

  // Credit Card fields
  const [cName, setCName] = useState("");
  const [cAmount, setCAmount] = useState("");
  const [cRate, setCRate] = useState("");
  const [cDuration, setCDuration] = useState("");
  const [cMonthly, setCMonthly] = useState("");
  const [cDate, setCDate] = useState("");

  const autoCalcCCMonthly = () => {
    const P = parseFloat(cAmount);
    const rRate = parseFloat(cRate);
    const r = rRate / 100 / 12;
    const n = parseInt(cDuration);
    if (!P || isNaN(rRate) || !n) return;
    let payment = 0;
    if (r === 0) {
      payment = P / n;
    } else {
      payment = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    }
    setCMonthly(payment.toFixed(2));
  };

  const resetAndClose = () => {
    setOpen(false);
    setLoanType(null);
    setVName(""); setVAmount(""); setVRate(""); setVDuration(""); setVMonthly(""); setVDate("");
    setOName(""); setOAmount(""); setODate("");
    setCName(""); setCAmount(""); setCRate(""); setCDuration(""); setCMonthly(""); setCDate("");
  };

  const handleSubmitVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await addVehicleLoan({
      name: vName,
      amount: parseFloat(vAmount),
      interestRate: parseFloat(vRate),
      duration: parseInt(vDuration),
      monthlyPayment: parseFloat(vMonthly),
      dateOfLoan: vDate,
    });
    setLoading(false);
    resetAndClose();
  };

  const handleSubmitCreditCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await addCreditCardLoan({
      name: cName,
      amount: parseFloat(cAmount),
      interestRate: parseFloat(cRate),
      duration: parseInt(cDuration),
      monthlyPayment: parseFloat(cMonthly),
      dateOfLoan: cDate,
    });
    setLoading(false);
    resetAndClose();
  };

  const handleSubmitOverdraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await addOverdraftLoan({
      name: oName,
      overdraftLimit: parseFloat(oAmount),
      startDate: oDate,
    });
    setLoading(false);
    resetAndClose();
  };

  const inputClass =
    "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/60 transition";
  const labelClass = "block text-xs text-muted-foreground mb-1 uppercase tracking-wide";

  return (
    <div className="mb-8">
      {!open ? (
        <button
          id="add-loan-btn"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary font-semibold text-sm transition-all duration-200 hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4" />
          Add Loan
        </button>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-foreground">Add New Loan</h3>
            <button onClick={resetAndClose} className="text-muted-foreground hover:text-foreground transition">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Type chooser */}
          {!loanType && (
            <div className="grid grid-cols-2 gap-3">
              <button
                id="choose-vehicle-loan"
                onClick={() => setLoanType("vehicle")}
                className="flex flex-col items-center gap-3 p-5 rounded-xl border border-white/10 bg-white/5 hover:bg-primary/10 hover:border-primary/40 transition-all duration-200 group"
              >
                <div className="p-3 rounded-full bg-blue-500/15 group-hover:bg-blue-500/25 transition">
                  <Car className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">Vehicle Loan</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Fixed monthly repayments</p>
                </div>
              </button>
              <button
                id="choose-overdraft-loan"
                onClick={() => setLoanType("overdraft")}
                className="flex flex-col items-center gap-3 p-5 rounded-xl border border-white/10 bg-white/5 hover:bg-primary/10 hover:border-primary/40 transition-all duration-200 group"
              >
                <div className="p-3 rounded-full bg-orange-500/15 group-hover:bg-orange-500/25 transition">
                  <CreditCard className="h-6 w-6 text-orange-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">Overdraft</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Flexible settlements</p>
                </div>
              </button>
              <button
                id="choose-credit-card-loan"
                onClick={() => setLoanType("credit_card")}
                className="flex flex-col items-center gap-3 p-5 rounded-xl border border-white/10 bg-white/5 hover:bg-primary/10 hover:border-primary/40 transition-all duration-200 group col-span-2 sm:col-span-1"
              >
                <div className="p-3 rounded-full bg-purple-500/15 group-hover:bg-purple-500/25 transition">
                  <CreditCard className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">CC Installment</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Fixed EMI or 0% interest</p>
                </div>
              </button>
            </div>
          )}

          {/* Vehicle Loan Form */}
          {loanType === "vehicle" && (
            <form onSubmit={handleSubmitVehicle} className="space-y-4">
              <button
                type="button"
                onClick={() => setLoanType(null)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
              >
                ← Back
              </button>
              <div className="flex items-center gap-2 mb-3">
                <Car className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-semibold text-blue-400">Vehicle Loan</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Loan Name / Description</label>
                  <input id="v-name" className={inputClass} placeholder="e.g. Toyota Prius" value={vName} onChange={e => setVName(e.target.value)} required />
                </div>
                <div>
                  <label className={labelClass}>Principal Amount (Rs.)</label>
                  <input id="v-amount" type="number" min="0" step="0.01" className={inputClass} placeholder="0.00" value={vAmount} onChange={e => setVAmount(e.target.value)} required />
                </div>
                <div>
                  <label className={labelClass}>Interest Rate (% p.a.)</label>
                  <input id="v-rate" type="number" min="0" step="0.01" className={inputClass} placeholder="0.00" value={vRate} onChange={e => setVRate(e.target.value)} required />
                </div>
                <div>
                  <label className={labelClass}>Duration (months)</label>
                  <input id="v-duration" type="number" min="1" className={inputClass} placeholder="60" value={vDuration} onChange={e => setVDuration(e.target.value)} required />
                </div>
                <div>
                  <label className={labelClass}>Monthly Payment (Rs.)</label>
                  <div className="flex gap-2">
                    <input id="v-monthly" type="number" min="0" step="0.01" className={inputClass} placeholder="0.00" value={vMonthly} onChange={e => setVMonthly(e.target.value)} required />
                    <button
                      type="button"
                      onClick={autoCalcMonthly}
                      className="px-3 py-2 text-xs rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-muted-foreground whitespace-nowrap transition"
                    >
                      Auto
                    </button>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Date of Loan</label>
                  <input id="v-date" type="date" className={inputClass} value={vDate} onChange={e => setVDate(e.target.value)} required />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetAndClose} className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm text-muted-foreground transition">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/80 text-sm font-semibold text-white transition disabled:opacity-50">
                  {loading ? "Saving…" : "Add Vehicle Loan"}
                </button>
              </div>
            </form>
          )}

          {/* Overdraft Form */}
          {loanType === "overdraft" && (
            <form onSubmit={handleSubmitOverdraft} className="space-y-4">
              <button
                type="button"
                onClick={() => setLoanType(null)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
              >
                ← Back
              </button>
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-4 w-4 text-orange-400" />
                <span className="text-sm font-semibold text-orange-400">Overdraft Loan</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Loan Name / Description</label>
                  <input id="o-name" className={inputClass} placeholder="e.g. Business Overdraft" value={oName} onChange={e => setOName(e.target.value)} required />
                </div>
                <div>
                  <label className={labelClass}>OD Limit / Max Amount (Rs.)</label>
                  <input id="o-amount" type="number" min="0" step="0.01" className={inputClass} placeholder="0.00" value={oAmount} onChange={e => setOAmount(e.target.value)} required />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Start Date</label>
                  <input id="o-date" type="date" className={inputClass} value={oDate} onChange={e => setODate(e.target.value)} required />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetAndClose} className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm text-muted-foreground transition">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-orange-500/80 hover:bg-orange-500 text-sm font-semibold text-white transition disabled:opacity-50">
                  {loading ? "Saving…" : "Add Overdraft"}
                </button>
              </div>
            </form>
          )}

          {/* Credit Card Form */}
          {loanType === "credit_card" && (
            <form onSubmit={handleSubmitCreditCard} className="space-y-4">
              <button
                type="button"
                onClick={() => setLoanType(null)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
              >
                ← Back
              </button>
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-semibold text-purple-400">Credit Card Installment</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Installment Name / Description</label>
                  <input id="c-name" className={inputClass} placeholder="e.g. iPhone Installment" value={cName} onChange={e => setCName(e.target.value)} required />
                </div>
                <div>
                  <label className={labelClass}>Full Amount (Rs.)</label>
                  <input id="c-amount" type="number" min="0" step="0.01" className={inputClass} placeholder="0.00" value={cAmount} onChange={e => setCAmount(e.target.value)} required />
                </div>
                <div>
                  <label className={labelClass}>Interest Rate (% p.a.)</label>
                  <input id="c-rate" type="number" min="0" step="0.01" className={inputClass} placeholder="0.00 (can be 0)" value={cRate} onChange={e => setCRate(e.target.value)} required />
                </div>
                <div>
                  <label className={labelClass}>Duration (installments/months)</label>
                  <input id="c-duration" type="number" min="1" className={inputClass} placeholder="12" value={cDuration} onChange={e => setCDuration(e.target.value)} required />
                </div>
                <div>
                  <label className={labelClass}>Monthly Payment (Rs.)</label>
                  <div className="flex gap-2">
                    <input id="c-monthly" type="number" min="0" step="0.01" className={inputClass} placeholder="0.00" value={cMonthly} onChange={e => setCMonthly(e.target.value)} required />
                    <button
                      type="button"
                      onClick={autoCalcCCMonthly}
                      className="px-3 py-2 text-xs rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-muted-foreground whitespace-nowrap transition"
                    >
                      Auto
                    </button>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Date of Purchase</label>
                  <input id="c-date" type="date" className={inputClass} value={cDate} onChange={e => setCDate(e.target.value)} required />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetAndClose} className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm text-muted-foreground transition">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-purple-500/80 hover:bg-purple-500 text-sm font-semibold text-white transition disabled:opacity-50">
                  {loading ? "Saving…" : "Add Credit Card Installment"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
