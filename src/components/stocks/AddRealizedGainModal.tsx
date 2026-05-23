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

export function AddRealizedGainModal() {
  const { addRealizedGain } = useStocks();
  const [open, setOpen] = useState(false);

  const [stock, setStock] = useState("");
  const [buyDate, setBuyDate] = useState("");
  const [buyAmount, setBuyAmount] = useState("");
  const [buyQuantity, setBuyQuantity] = useState("");
  const [sellDate, setSellDate] = useState("");
  const [sellAmount, setSellAmount] = useState("");
  const [sellQuantity, setSellQuantity] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stock || !buyDate || !buyAmount || !buyQuantity || !sellDate || !sellAmount || !sellQuantity) {
      alert("Please fill in all fields.");
      return;
    }

    const buyAmtNum = parseFloat(buyAmount);
    const buyQtyNum = parseInt(buyQuantity, 10);
    const sellAmtNum = parseFloat(sellAmount);
    const sellQtyNum = parseInt(sellQuantity, 10);

    if (isNaN(buyAmtNum) || isNaN(buyQtyNum) || isNaN(sellAmtNum) || isNaN(sellQtyNum)) {
      alert("Please enter valid numbers for amount and quantity.");
      return;
    }

    try {
      await addRealizedGain({
        stock,
        buyDate,
        buyAmount: buyAmtNum,
        buyQuantity: buyQtyNum,
        sellDate,
        sellAmount: sellAmtNum,
        sellQuantity: sellQtyNum,
      });
      setOpen(false);
      
      // Reset
      setStock("");
      setBuyDate("");
      setBuyAmount("");
      setBuyQuantity("");
      setSellDate("");
      setSellAmount("");
      setSellQuantity("");
    } catch (err) {
      alert("Failed to add realized gain.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* @ts-expect-error - local wrapper might not export asChild correctly */}
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-4 rounded-xl shadow-lg shadow-emerald-500/20">
          <Plus className="w-4 h-4 mr-2" /> Add Realized Gain
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-black/90 border border-white/10 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">Record Realized Gain</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter the details of your closed trade.
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
            <h4 className="text-sm font-bold text-blue-400">Buy Details</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Earliest Buy Date</label>
                <Input
                  type="date"
                  value={buyDate}
                  onChange={(e) => setBuyDate(e.target.value)}
                  className="bg-black/50 border-white/10"
                  required
                />
              </div>
              <div />
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Total Buy Amount</label>
                <Input
                  type="number"
                  step="0.01"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  placeholder="Total Cost"
                  className="bg-black/50 border-white/10"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Buy Quantity</label>
                <Input
                  type="number"
                  value={buyQuantity}
                  onChange={(e) => setBuyQuantity(e.target.value)}
                  placeholder="Shares"
                  className="bg-black/50 border-white/10"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 bg-white/5 p-3 rounded-xl border border-white/10">
            <h4 className="text-sm font-bold text-rose-400">Sell Details</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Sell Date</label>
                <Input
                  type="date"
                  value={sellDate}
                  onChange={(e) => setSellDate(e.target.value)}
                  className="bg-black/50 border-white/10"
                  required
                />
              </div>
              <div />
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Total Sell Proceeds</label>
                <Input
                  type="number"
                  step="0.01"
                  value={sellAmount}
                  onChange={(e) => setSellAmount(e.target.value)}
                  placeholder="Total Value"
                  className="bg-black/50 border-white/10"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Sell Quantity</label>
                <Input
                  type="number"
                  value={sellQuantity}
                  onChange={(e) => setSellQuantity(e.target.value)}
                  placeholder="Shares"
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
