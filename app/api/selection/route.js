import { getSelection } from '../kv.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/selection — membaca pilihan aset + jangka waktu saat ini dari KV
// (kunci kronos:selection). Dipakai halaman utama untuk mendeteksi pilihan
// yang diubah dari tempat lain (mis. halaman /set-coin).
export async function GET() {
  try {
    const selection = await getSelection();
    return Response.json(selection);
  } catch (e) {
    return Response.json({ error: String(e?.message || e) }, { status: 502 });
  }
}
