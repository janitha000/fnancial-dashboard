import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStocks } from "@/context/StocksContext";
import { Plus } from "lucide-react";

export function AddDividendGainModal() {
  const { addDividendGain, dividendGains } = useStocks();
  const [open, setOpen] = useState(false);

  const [stock, setStock] = useState("");
  const [dividendReceivedDate, setDividendReceivedDate] = useState("");
  const [dividendAmount, setDividendAmount] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [additionalAmount, setAdditionalAmount] = useState("");

  const existingStockRecords = dividendGains
    .filter(g => g.stock.toUpperCase() === stock.trim().toUpperCase())
    .sort((a, b) => new Date(b.dividendReceivedDate).getTime() - new Date(a.dividendReceivedDate).getTime());
  
  const existingTotalAmount = existingStockRecords.length > 0 ? existingStockRecords[0].totalAmount : 0;
  const isExistingStock = existingTotalAmount > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isExistingStockSubmit = existingTotalAmount > 0;

    if (!stock || !dividendReceivedDate || !dividendAmount || (!isExistingStockSubmit && !totalAmount)) {
      alert("Please fill in all required fields.");
      return;
    }

    const divAmtNum = parseFloat(dividendAmount);
    const finalTotalAmt = isExistingStockSubmit 
      ? existingTotalAmount + (parseFloat(additionalAmount) || 0)
      : parseFloat(totalAmount);

    if (isNaN(divAmtNum) || isNaN(finalTotalAmt)) {
      alert("Please enter valid numbers for amounts.");
      return;
    }

    try {
      await addDividendGain({
        stock: stock.toUpperCase().trim(),
        dividendReceivedDate,
        dividendAmount: divAmtNum,
        totalAmount: finalTotalAmt,
      });
      setOpen(false);
      
      // Reset
      setStock("");
      setDividendReceivedDate("");
      setDividendAmount("");
      setTotalAmount("");
      setAdditionalAmount("");
    } catch (err) {
      alert("Failed to add dividend gain.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* @ts-expect-error - local wrapper might not export asChild correctly */}
      <DialogTrigger asChild>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-4 rounded-xl shadow-lg shadow-indigo-500/20">
          <Plus className="w-4 h-4 mr-2" /> Add Dividend Gain
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-black/90 border border-white/10 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">Record Dividend Gain</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter the details of your received dividend to calculate yields.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-2">
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 block">Stock Symbol / Name</label>
            <Input
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="e.g. COMB.N0000"
              className="bg-white/5 border-white/10 uppercase"
              required
            />
          </div>

          <div className="space-y-3 bg-white/5 p-3 rounded-xl border border-white/10">
            <h4 className="text-sm font-bold text-indigo-400">Yield Details</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Dividend Date</label>
                <Input
                  type="date"
                  value={dividendReceivedDate}
                  onChange={(e) => setDividendReceivedDate(e.target.value)}
                  className="bg-black/50 border-white/10"
                  required
                />
              </div>
              {isExistingStock ? (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Previous Invested Amount</label>
                    <Input
                      type="text"
                      value={existingTotalAmount.toLocaleString()}
                      className="bg-black/20 border-white/5 text-muted-foreground"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Additional Investment (Optional, negative for partial sell)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={additionalAmount}
                      onChange={(e) => setAdditionalAmount(e.target.value)}
                      placeholder="e.g. 500 or -200"
                      className="bg-black/50 border-white/10"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Total Invested Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="Total Cost"
                    className="bg-black/50 border-white/10"
                    required
                  />
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Dividend Amount</label>
                <Input
                  type="number"
                  step="0.01"
                  value={dividendAmount}
                  onChange={(e) => setDividendAmount(e.target.value)}
                  placeholder="Dividend Received"
                  className="bg-black/50 border-white/10"
                  required
                />
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full font-bold">
            Save Record
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
