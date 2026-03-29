"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { getLoanData, saveLoanData } from "@/actions/loans";

// ─── Types ────────────────────────────────────────────────────────────────────

export type VehicleLoanSettlement = {
  settleDate: string;
  settleAmount: number;
};

export type VehicleLoan = {
  id: string;
  name: string;
  amount: number;         // principal
  interestRate: number;   // % per annum
  duration: number;       // in months
  monthlyPayment: number;
  dateOfLoan: string;     // ISO date string (YYYY-MM-DD)
  settled?: VehicleLoanSettlement;
};

export type OverdraftSettlement = {
  id: string;
  date: string;
  amount: number;
};

export type OverdraftDrawdown = {
  id: string;
  date: string;
  amount: number;
};

export type InterestAccrual = {
  id: string;
  date: string;
  amount: number;
};

export type OverdraftLoan = {
  id: string;
  name: string;
  overdraftLimit: number;  // maximum credit line
  startDate: string;       // ISO date string
  drawdowns: OverdraftDrawdown[];
  settlements: OverdraftSettlement[];
  interestAccruals: InterestAccrual[];
};

export type LoanData = {
  vehicleLoans: VehicleLoan[];
  overdraftLoans: OverdraftLoan[];
};

// ─── Computed helpers ──────────────────────────────────────────────────────────

export function getVehicleLoanMetrics(loan: VehicleLoan, asOf: Date = new Date()) {
  const start = new Date(loan.dateOfLoan);

  // months elapsed since loan start (clamped to duration)
  const msPerMonth = 1000 * 60 * 60 * 24 * 30.4375;
  const rawMonths = Math.floor((asOf.getTime() - start.getTime()) / msPerMonth);
  const monthsElapsed = Math.max(0, Math.min(rawMonths, loan.duration));

  const totalPayable = loan.monthlyPayment * loan.duration;
  const alreadyPaid = loan.settled
    ? loan.monthlyPayment * Math.floor(
        (new Date(loan.settled.settleDate).getTime() - start.getTime()) / msPerMonth
      )
    : loan.monthlyPayment * monthsElapsed;

  // Amortization-based remaining capital
  const monthlyRate = loan.interestRate / 100 / 12;
  let balance = loan.amount;
  const iterations = loan.settled
    ? Math.max(0, Math.min(
        Math.floor((new Date(loan.settled.settleDate).getTime() - start.getTime()) / msPerMonth),
        loan.duration
      ))
    : monthsElapsed;

  let totalInterestPaid = 0;
  for (let i = 0; i < iterations; i++) {
    const interestThisMonth = balance * monthlyRate;
    const principalThisMonth = loan.monthlyPayment - interestThisMonth;
    totalInterestPaid += interestThisMonth;
    balance = Math.max(0, balance - principalThisMonth);
  }

  const remainingCapital = loan.settled ? loan.settled.settleAmount : balance;
  const percentPaid = totalPayable > 0 ? (alreadyPaid / totalPayable) * 100 : 0;
  const totalInterest = totalPayable - loan.amount;

  return {
    monthsElapsed,
    alreadyPaid,
    remainingCapital,
    percentPaid: Math.min(100, percentPaid),
    totalInterestPaid,
    totalInterest,
    totalPayable,
    isSettled: !!loan.settled,
  };
}

export function getOverdraftLoanMetrics(loan: OverdraftLoan) {
  const totalTaken = loan.drawdowns.reduce((sum, d) => sum + d.amount, 0);
  const totalSettled = loan.settlements.reduce((sum, s) => sum + s.amount, 0);
  const totalInterestAccrued = (loan.interestAccruals ?? []).reduce((sum, a) => sum + a.amount, 0);
  const outstanding = Math.max(0, totalTaken - totalSettled);
  const remainingODAvailable = Math.max(0, loan.overdraftLimit - outstanding);
  const percentUsed = loan.overdraftLimit > 0 ? Math.min(100, (outstanding / loan.overdraftLimit) * 100) : 0;

  return {
    totalTaken,
    totalSettled,
    totalInterestAccrued,
    outstanding,
    remainingODAvailable,
    percentUsed,
  };
}

export type AmortizationRow = {
  month: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
};

export function buildAmortizationSchedule(loan: VehicleLoan): AmortizationRow[] {
  const monthlyRate = loan.interestRate / 100 / 12;
  const rows: AmortizationRow[] = [];
  let balance = loan.amount;

  for (let month = 1; month <= loan.duration; month++) {
    const interest = balance * monthlyRate;
    const principal = Math.min(loan.monthlyPayment - interest, balance);
    balance = Math.max(0, balance - principal);

    rows.push({
      month,
      payment: loan.monthlyPayment,
      interest,
      principal,
      balance,
    });

    if (balance <= 0) break;
  }

  return rows;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface LoanContextType {
  vehicleLoans: VehicleLoan[];
  overdraftLoans: OverdraftLoan[];
  isLoaded: boolean;
  // Vehicle
  addVehicleLoan: (loan: Omit<VehicleLoan, "id">) => Promise<void>;
  settleVehicleLoan: (id: string, settlement: VehicleLoanSettlement) => Promise<void>;
  deleteVehicleLoan: (id: string) => Promise<void>;
  // Overdraft
  addOverdraftLoan: (loan: Omit<OverdraftLoan, "id" | "drawdowns" | "settlements" | "interestAccruals">) => Promise<void>;
  addOverdraftDrawdown: (loanId: string, drawdown: Omit<OverdraftDrawdown, "id">) => Promise<void>;
  deleteOverdraftDrawdown: (loanId: string, drawdownId: string) => Promise<void>;
  addOverdraftSettlement: (loanId: string, settlement: Omit<OverdraftSettlement, "id">) => Promise<void>;
  deleteOverdraftSettlement: (loanId: string, settlementId: string) => Promise<void>;
  addOverdraftInterest: (loanId: string, accrual: Omit<InterestAccrual, "id">) => Promise<void>;
  deleteOverdraftInterest: (loanId: string, accrualId: string) => Promise<void>;
  deleteOverdraftLoan: (id: string) => Promise<void>;
}

const LoanContext = createContext<LoanContextType | undefined>(undefined);

export function LoanProvider({ children }: { children: ReactNode }) {
  const [vehicleLoans, setVehicleLoans] = useState<VehicleLoan[]>([]);
  const [overdraftLoans, setOverdraftLoans] = useState<OverdraftLoan[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getLoanData();
        // Migrate old overdraft shape: amount → overdraftLimit, missing arrays
        const migratedOD = (data.overdraftLoans || []).map((l: OverdraftLoan & { amount?: number }) => ({
          ...l,
          overdraftLimit: l.overdraftLimit ?? l.amount ?? 0,
          drawdowns: l.drawdowns ?? [],
          settlements: l.settlements ?? [],
          interestAccruals: l.interestAccruals ?? [],
        }));
        setVehicleLoans(data.vehicleLoans || []);
        setOverdraftLoans(migratedOD);
      } catch (e) {
        console.error("Failed to load loan data", e);
      } finally {
        setIsLoaded(true);
      }
    }
    load();
  }, []);

  const persist = async (vl: VehicleLoan[], ol: OverdraftLoan[]) => {
    await saveLoanData({ vehicleLoans: vl, overdraftLoans: ol });
  };

  const addVehicleLoan = async (loan: Omit<VehicleLoan, "id">) => {
    const newLoan: VehicleLoan = { ...loan, id: crypto.randomUUID() };
    const updated = [...vehicleLoans, newLoan];
    setVehicleLoans(updated);
    await persist(updated, overdraftLoans);
  };

  const settleVehicleLoan = async (id: string, settlement: VehicleLoanSettlement) => {
    const updated = vehicleLoans.map((l) =>
      l.id === id ? { ...l, settled: settlement } : l
    );
    setVehicleLoans(updated);
    await persist(updated, overdraftLoans);
  };

  const deleteVehicleLoan = async (id: string) => {
    const updated = vehicleLoans.filter((l) => l.id !== id);
    setVehicleLoans(updated);
    await persist(updated, overdraftLoans);
  };

  const addOverdraftLoan = async (loan: Omit<OverdraftLoan, "id" | "drawdowns" | "settlements" | "interestAccruals">) => {
    const newLoan: OverdraftLoan = { ...loan, id: crypto.randomUUID(), drawdowns: [], settlements: [], interestAccruals: [] };
    const updated = [...overdraftLoans, newLoan];
    setOverdraftLoans(updated);
    await persist(vehicleLoans, updated);
  };

  const addOverdraftDrawdown = async (
    loanId: string,
    drawdown: Omit<OverdraftDrawdown, "id">
  ) => {
    const updated = overdraftLoans.map((l) =>
      l.id === loanId
        ? { ...l, drawdowns: [...l.drawdowns, { ...drawdown, id: crypto.randomUUID() }] }
        : l
    );
    setOverdraftLoans(updated);
    await persist(vehicleLoans, updated);
  };

  const deleteOverdraftDrawdown = async (loanId: string, drawdownId: string) => {
    const updated = overdraftLoans.map((l) =>
      l.id === loanId
        ? { ...l, drawdowns: l.drawdowns.filter((d) => d.id !== drawdownId) }
        : l
    );
    setOverdraftLoans(updated);
    await persist(vehicleLoans, updated);
  };

  const addOverdraftSettlement = async (
    loanId: string,
    settlement: Omit<OverdraftSettlement, "id">
  ) => {
    const updated = overdraftLoans.map((l) =>
      l.id === loanId
        ? { ...l, settlements: [...l.settlements, { ...settlement, id: crypto.randomUUID() }] }
        : l
    );
    setOverdraftLoans(updated);
    await persist(vehicleLoans, updated);
  };

  const deleteOverdraftSettlement = async (loanId: string, settlementId: string) => {
    const updated = overdraftLoans.map((l) =>
      l.id === loanId
        ? { ...l, settlements: l.settlements.filter((s) => s.id !== settlementId) }
        : l
    );
    setOverdraftLoans(updated);
    await persist(vehicleLoans, updated);
  };

  const addOverdraftInterest = async (
    loanId: string,
    accrual: Omit<InterestAccrual, "id">
  ) => {
    const updated = overdraftLoans.map((l) =>
      l.id === loanId
        ? { ...l, interestAccruals: [...(l.interestAccruals ?? []), { ...accrual, id: crypto.randomUUID() }] }
        : l
    );
    setOverdraftLoans(updated);
    await persist(vehicleLoans, updated);
  };

  const deleteOverdraftInterest = async (loanId: string, accrualId: string) => {
    const updated = overdraftLoans.map((l) =>
      l.id === loanId
        ? { ...l, interestAccruals: (l.interestAccruals ?? []).filter((a) => a.id !== accrualId) }
        : l
    );
    setOverdraftLoans(updated);
    await persist(vehicleLoans, updated);
  };

  const deleteOverdraftLoan = async (id: string) => {
    const updated = overdraftLoans.filter((l) => l.id !== id);
    setOverdraftLoans(updated);
    await persist(vehicleLoans, updated);
  };

  return (
    <LoanContext.Provider
      value={{
        vehicleLoans,
        overdraftLoans,
        isLoaded,
        addVehicleLoan,
        settleVehicleLoan,
        deleteVehicleLoan,
        addOverdraftLoan,
        addOverdraftDrawdown,
        deleteOverdraftDrawdown,
        addOverdraftSettlement,
        deleteOverdraftSettlement,
        addOverdraftInterest,
        deleteOverdraftInterest,
        deleteOverdraftLoan,
      }}
    >
      {children}
    </LoanContext.Provider>
  );
}

export function useLoan() {
  const ctx = useContext(LoanContext);
  if (!ctx) throw new Error("useLoan must be used within a LoanProvider");
  return ctx;
}
