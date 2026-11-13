import { kvGet, forecastKey } from '../kv.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function cleanCoin(raw) {
  let c = String(raw || 'BTC').toUpperCase().replace(/[^A-Z0-9]/g, '');
  c = c.replace(/USDT$/, '').replace(/USD$/, '');
  return /^[A-Z]{2,10}$/.test(c) ? c : 'BTC';
}

// GET /api/forecast?coin=NVDA — membaca prakiraan terbaru dari KV
// (kunci kronos:forecast:{simbol}), yang ditulis skrip Kronos lewat HTTP.
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const coin = cleanCoin(searchParams.get('coin'));
  try {
    const raw = await kvGet(forecastKey(coin));
    if (!raw) {
      return Response.json({ coin, error: 'Belum ada prakiraan untuk aset ini — skrip Kronos akan mengirimnya (tiap 10 menit atau saat pilihan berubah).' }, { status: 404 });
    }
    try {
      return Response.json(JSON.parse(raw));
    } catch {
      return Response.json({ coin, raw });
    }
  } catch (e) {
    return Response.json({ coin, error: String(e?.message || e) }, { status: 502 });
  }
}
