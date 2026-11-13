import { setSelection, forecastKey } from '../kv.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function cleanCoin(raw) {
  let c = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  c = c.replace(/USDT$/, '').replace(/USD$/, '');
  return /^[A-Z]{2,10}$/.test(c) ? c : null;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const coin = cleanCoin(body.coin);
    if (!coin) return Response.json({ error: 'Koin tidak valid. Gunakan simbol seperti BTC, ETH, atau SOL.' }, { status: 400 });
    const selection = await setSelection({ coin });
    return Response.json({ ok: true, coin, selection, forecastKey: forecastKey(coin) });
  } catch (e) {
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
