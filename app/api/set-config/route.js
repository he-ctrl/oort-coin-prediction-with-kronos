import { setSelection } from '../kv.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const INTERVALS = ['15m', '1h', '4h', '1d'];
const PRED_LENS = [6, 12, 24, 48];
const HISTORY_LENS = [24, 48, 96];

export async function POST(req) {
  try {
    const body = await req.json();
    const interval = INTERVALS.includes(body.interval) ? body.interval : null;
    const pred_len = PRED_LENS.includes(Number(body.pred_len)) ? Number(body.pred_len) : null;
    const history_len = HISTORY_LENS.includes(Number(body.history_len)) ? Number(body.history_len) : null;
    if (!interval || !pred_len || !history_len) {
      return Response.json({ error: 'Pengaturan tidak valid. Interval harus 15m/1h/4h/1d, prediksi 6/12/24/48 titik, aktual 24/48/96 titik.' }, { status: 400 });
    }
    const selection = await setSelection({ interval, pred_len, history_len });
    return Response.json({ ok: true, ...selection });
  } catch (e) {
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
