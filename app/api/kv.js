// Upstash KV (Vercel KV) lewat REST — tempat penyimpanan bersama antara
// situs ini dan skrip Python di sandbox. Tidak ada MQTT: skrip membaca
// pilihan dari kronos:selection dan menulis prakiraan ke
// kronos:forecast:{simbol}; situs membaca/menulis kunci yang sama lewat HTTP.
export const SELECTION_KEY = 'kronos:selection';
export const forecastKey = (coin) => `kronos:forecast:${coin}`;
const DEFAULT_SELECTION = { coin: 'BTC', interval: '1h', pred_len: 24, history_len: 48 };

function kvConfig() {
  const url = (process.env.KV_REST_API_URL || '').replace(/\/$/, '');
  const token = process.env.KV_REST_API_TOKEN || '';
  if (!url || !token) throw new Error('KV_REST_API_URL / KV_REST_API_TOKEN belum diatur di environment Vercel.');
  return { url, token };
}

export async function kvGet(key) {
  const { url, token } = kvConfig();
  const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  const j = await r.json();
  return j?.result ?? null;
}

export async function kvSet(key, value) {
  const { url, token } = kvConfig();
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['SET', key, value]),
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  const j = await r.json();
  if (j?.result !== 'OK') throw new Error(`KV SET gagal: ${JSON.stringify(j)}`);
}

export async function getSelection() {
  const raw = await kvGet(SELECTION_KEY);
  if (!raw) return { ...DEFAULT_SELECTION };
  try {
    const s = JSON.parse(raw);
    return { ...DEFAULT_SELECTION, ...s };
  } catch {
    return { ...DEFAULT_SELECTION };
  }
}

// Menggabungkan perubahan ke pilihan yang tersimpan, lalu menulisnya kembali.
// refresh_at selalu diperbarui supaya skrip segera menjalankan ulang prakiraan.
export async function setSelection(patch) {
  const cur = await getSelection();
  const next = { ...cur, ...patch, refresh_at: new Date().toISOString() };
  await kvSet(SELECTION_KEY, JSON.stringify(next));
  return next;
}
