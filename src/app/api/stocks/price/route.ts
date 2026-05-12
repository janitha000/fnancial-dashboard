import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const bodyJson = await request.json();
    const symbols: string[] = bodyJson.symbols || (bodyJson.symbol ? [bodyJson.symbol] : []);

    if (symbols.length === 0) {
      return NextResponse.json({ error: "No symbol provided" }, { status: 400 });
    }

    const fetchPrice = async (sym: string) => {
      const cleanSymbol = String(sym).trim();
      const body = new URLSearchParams({ symbol: cleanSymbol });

      const response = await fetch("https://www.cse.lk/api/companyInfoSummery", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0",
          "Referer": "https://www.cse.lk",
        },
        body,
      });

      const text = await response.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        return { symbol: sym, price: null, changePercent: null };
      }

      let price = null;
      let changePercent = null;

      if (json?.reqSymbolInfo?.lastTradedPrice !== undefined) {
        price = parseFloat(json.reqSymbolInfo.lastTradedPrice);
      }
      if (json?.reqSymbolInfo?.changePercentage !== undefined) {
        changePercent = parseFloat(json.reqSymbolInfo.changePercentage);
      }

      return { symbol: sym, price, changePercent };
    };

    const results = await Promise.all(symbols.map(fetchPrice));

    // Support legacy single symbol response
    if (bodyJson.symbol && !bodyJson.symbols) {
      return NextResponse.json({ price: results[0].price, changePercent: results[0].changePercent });
    }

    // Support new batch response
    const pricesMap: Record<string, { price: number | null, changePercent: number | null }> = {};
    results.forEach(r => {
      pricesMap[r.symbol] = { price: r.price, changePercent: r.changePercent };
    });

    return NextResponse.json({ prices: pricesMap });
  } catch (error: any) {
    console.error(`Fetch failed: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
