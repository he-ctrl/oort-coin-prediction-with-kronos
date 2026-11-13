export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function cleanCoin(raw) {
  let c = String(raw || 'BTC').toUpperCase().replace(/[^A-Z0-9]/g, '');
  c = c.replace(/USDT$/, '').replace(/USD$/, '');
  return /^[A-Z]{2,10}$/.test(c) ? c : 'BTC';
}

const KRAKEN = { BTC: 'XBTUSD', ETH: 'ETHUSD', SOL: 'SOLUSD', XRP: 'XRPUSD', DOGE: 'DOGEUSD', ADA: 'ADAUSD', BNB: 'BNBUSD', LTC: 'LTCUSD', LINK: 'LINKUSD', AVAX: 'AVAXUSD' };

// Saham AS: simbol Yahoo Finance (indeks memakai ^, di-encode di URL).
const STOCKS = { NVDA: 'NVDA', META: 'META', AAPL: 'AAPL', MSFT: 'MSFT', TSLA: 'TSLA', AMZN: 'AMZN', GOOGL: 'GOOGL', AMD: 'AMD', NFLX: 'NFLX', GSPC: '%5EGSPC', IXIC: '%5EIXIC' };

async function fetchYahoo(coin) {
  const yahoo = STOCKS[coin];
  const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${yahoo}?range=1d&interval=1d`, { cache: 'no-store', signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'Mozilla/5.0' } });
  const j = await r.json();
  const result = j?.chart?.result?.[0];
  let price = result?.meta?.regularMarketPrice;
  if (price == null) {
    const closes = result?.indicators?.quote?.[0]?.close || [];
    for (let i = closes.length - 1; i >= 0; i--) { if (closes[i] != null) { price = closes[i]; break; } }
  }
  if (!price) throw new Error('Yahoo: no price');
  return parseFloat(price);
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const coin = cleanCoin(searchParams.get('coin'));
  const at = new Date().toISOString();
  // Saham AS: Yahoo Finance chart API (tanpa key).
  if (STOCKS[coin]) {
    try {
      const price = await fetchYahoo(coin);
      const symbol = coin === 'GSPC' ? '^GSPC' : coin === 'IXIC' ? '^IXIC' : coin;
      return Response.json({ coin, symbol, price, source: 'yahoo', at });
    } catch (e) {
      return Response.json({ coin, symbol: coin, error: String(e?.message || e), at }, { status: 502 });
    }
  }
  const symbol = `${coin}USDT`;
  // Primary: Binance US public ticker (no key). Fallback: Kraken public ticker.
  try {
    const r = await fetch(`https://api.binance.us/api/v3/ticker/price?symbol=${symbol}`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    const j = await r.json();
    if (j.price) return Response.json({ coin, symbol, price: parseFloat(j.price), source: 'binance.us', at });
    throw new Error('Binance US: no price');
  } catch (e) {
    try {
      const pair = KRAKEN[coin];
      if (!pair) throw e;
      const r = await fetch(`https://api.kraken.com/0/public/Ticker?pair=${pair}`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
      const j = await r.json();
      const key = Object.keys(j.result || {})[0];
      const price = parseFloat(j.result[key].c[0]);
      if (price) return Response.json({ coin, symbol: pair, price, source: 'kraken', at });
    } catch {}
    return Response.json({ coin, symbol, error: String(e?.message || e), at }, { status: 502 });
  }
}
