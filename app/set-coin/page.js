'use client';
import { useEffect, useState } from 'react';

const COINS = [
  { coin: 'BTC', name: 'Bitcoin' },
  { coin: 'ETH', name: 'Ethereum' },
  { coin: 'SOL', name: 'Solana' },
  { coin: 'XRP', name: 'XRP' },
  { coin: 'DOGE', name: 'Dogecoin' },
  { coin: 'ADA', name: 'Cardano' },
  { coin: 'BNB', name: 'BNB' },
  { coin: 'LTC', name: 'Litecoin' },
  { coin: 'LINK', name: 'Chainlink' },
  { coin: 'AVAX', name: 'Avalanche' },
];

const STOCKS = [
  { coin: 'NVDA', name: 'NVIDIA' },
  { coin: 'META', name: 'Meta' },
  { coin: 'AAPL', name: 'Apple' },
  { coin: 'MSFT', name: 'Microsoft' },
  { coin: 'TSLA', name: 'Tesla' },
  { coin: 'AMZN', name: 'Amazon' },
  { coin: 'GOOGL', name: 'Alphabet' },
  { coin: 'AMD', name: 'AMD' },
  { coin: 'NFLX', name: 'Netflix' },
  { coin: 'GSPC', name: 'S&P 500' },
  { coin: 'IXIC', name: 'Nasdaq' },
];
const STOCK_COINS = new Set(STOCKS.map(s => s.coin));
const isStock = (c) => STOCK_COINS.has(c);

const INTERVALS = ['15m', '1h', '4h', '1d'];
const PRED_LENS = [6, 12, 24, 48];
const HISTORY_LENS = [24, 48, 96];
const INTERVAL_MINUTES = { '15m': 15, '1h': 60, '4h': 240, '1d': 1440 };
function spanLabel(points, interval) {
  const total = (points || 0) * (INTERVAL_MINUTES[interval] || 60);
  if (total < 60) return `${total}m`;
  const h = total / 60;
  if (h < 24) return `${Number.isInteger(h) ? h : h.toFixed(1).replace(/\.0$/, '')}h`;
  const d = h / 24;
  return `${Number.isInteger(d) ? d : d.toFixed(1).replace(/\.0$/, '')}d`;
}

export default function SetCoin() {
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState('');
  const [market, setMarket] = useState('crypto');
  const [cfgInterval, setCfgInterval] = useState('1h');
  const [cfgPredLen, setCfgPredLen] = useState(24);
  const [cfgHistLen, setCfgHistLen] = useState(48);
  const [cfgMsg, setCfgMsg] = useState('');
  useEffect(() => {
    const m = localStorage.getItem('pred-market');
    if (m === 'stocks' || m === 'crypto') setMarket(m);
  }, []);
  // Beralih pasar Kripto / Saham AS. Pindah ke saham mengatur interval ke 1d
  // (harian, default untuk saham) lewat /api/set-config yang sudah ada.
  const switchMarket = async (m) => {
    if (m === market) return;
    setMarket(m);
    localStorage.setItem('pred-market', m);
    if (m === 'stocks') {
      const config = { interval: '1d', pred_len: cfgPredLen, history_len: cfgHistLen };
      setCfgInterval('1d');
      setCfgMsg('Mengatur interval ke 1d (harian) untuk saham…');
      try {
        const r = await fetch('/api/set-config', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(config) });
        const j = await r.json();
        if (j.ok) setCfgMsg('Interval diatur ke 1d (harian) untuk saham — disimpan ke KV.');
        else setCfgMsg(`Galat: ${j.error}`);
      } catch (e) { setCfgMsg(`Galat: ${e?.message || e}`); }
    }
  };
  const sendConfig = async () => {
    const config = { interval: cfgInterval, pred_len: cfgPredLen, history_len: cfgHistLen };
    setCfgMsg('Menyimpan pengaturan ke KV…');
    const r = await fetch('/api/set-config', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(config) });
    const j = await r.json();
    if (j.ok) setCfgMsg(`Selesai: interval ${cfgInterval}, aktual ${cfgHistLen} titik (${spanLabel(cfgHistLen, cfgInterval)}), prediksi ${cfgPredLen} titik (${spanLabel(cfgPredLen, cfgInterval)}) disimpan ke KV. Skrip Kronos akan menjalankan ulang prakiraan baru dengan pengaturan ini.`);
    else setCfgMsg(`Galat: ${j.error}`);
  };
  const send = async (c) => {
    const clean = c.toUpperCase().replace(/[^A-Z]/g, '');
    if (!clean) return;
    setMsg(`Menyimpan ${clean}…`);
    const r = await fetch('/api/set-coin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ coin: clean }) });
    const j = await r.json();
    if (j.ok) { setMsg(`Selesai: ${clean} disimpan. Skrip Kronos akan beralih ke ${clean} dan mengirim prakiraannya ke KV.`); const m = isStock(clean) ? 'stocks' : 'crypto'; setMarket(m); localStorage.setItem('pred-market', m); }
    else setMsg(`Galat: ${j.error}`);
  };
  return (
    <>
      <nav className="nav"><div className="nav-inner">
        <div className="brand">OORT<span> • </span>PREDIKSI KOIN</div>
        <div className="nav-links"><a href="/">Beranda</a><a href="/set-coin">Atur Koin</a></div>
      </div></nav>
      <div className="wrap">
        <h1>Atur <span style={{ color: '#f59e0b' }}>aset</span></h1>
        <p className="sub">Pilih koin atau saham AS, atau ketik simbol apa pun — koin yang terdaftar di Binance US (misalnya PEPE, SUI, NEAR) atau saham AS (misalnya NVDA, AAPL, GSPC). Mengaturnya akan menyimpan pilihan ke KV (Upstash). Skrip Python membaca pilihan itu tiap 30 detik, dan pada setiap perubahan mulai memprediksi aset baru. Harga saham diambil dari Yahoo Finance.</p>
        <div className="controls">
          <input value={input} onChange={e => setInput(e.target.value.toUpperCase())} placeholder="mis. BTC atau NVDA" style={{ width: 180 }} />
          <button className="btn" onClick={() => send(input)}>Simpan pilihan</button>
        </div>
        <div className="controls">
          <button className={`chip ${market === 'crypto' ? 'active' : ''}`} onClick={() => switchMarket('crypto')}>🪙 Kripto</button>
          <button className={`chip ${market === 'stocks' ? 'active' : ''}`} onClick={() => switchMarket('stocks')}>📈 Saham AS</button>
        </div>
        <div className="controls">
          {market === 'stocks'
            ? STOCKS.map(s => <button key={s.coin} className="chip" onClick={() => send(s.coin)}>{s.coin} — {s.name}</button>)
            : COINS.map(c => <button key={c.coin} className="chip" onClick={() => send(c.coin)}>{c.coin} — {c.name}</button>)}
        </div>
        {msg && <p style={{ color: '#fcd34d', lineHeight: 1.6 }}>{msg}</p>}
        <h1 style={{ marginTop: 32 }}>Pengaturan <span style={{ color: '#38bdf8' }}>jangka waktu</span></h1>
        <p className="sub">Interval candle, seberapa banyak riwayat aktual yang ditampilkan, dan seberapa jauh ke depan diprediksi. Mengubah ini akan menyimpan pilihan ke KV (tersimpan); lookback tetap 200 candle.</p>
        <div className="controls" style={{ flexWrap: 'wrap' }}>
          <label style={{ color: '#e2e8f0', fontSize: 14 }}>Interval candle
            <select value={cfgInterval} onChange={e => setCfgInterval(e.target.value)} style={{ display: 'block', marginTop: 4, padding: '8px 10px', borderRadius: 10, background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155' }}>
              {INTERVALS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <label style={{ color: '#e2e8f0', fontSize: 14 }}>Aktual ditampilkan
            <select value={cfgHistLen} onChange={e => setCfgHistLen(Number(e.target.value))} style={{ display: 'block', marginTop: 4, padding: '8px 10px', borderRadius: 10, background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155' }}>
              {HISTORY_LENS.map(v => <option key={v} value={v}>{v} titik ({spanLabel(v, cfgInterval)})</option>)}
            </select>
          </label>
          <label style={{ color: '#e2e8f0', fontSize: 14 }}>Prediksi ke depan
            <select value={cfgPredLen} onChange={e => setCfgPredLen(Number(e.target.value))} style={{ display: 'block', marginTop: 4, padding: '8px 10px', borderRadius: 10, background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155' }}>
              {PRED_LENS.map(v => <option key={v} value={v}>{v} titik ({spanLabel(v, cfgInterval)})</option>)}
            </select>
          </label>
          <button className="btn" onClick={sendConfig} style={{ alignSelf: 'end' }}>Terapkan pengaturan</button>
        </div>
        {cfgMsg && <p style={{ color: '#fcd34d', lineHeight: 1.6 }}>{cfgMsg}</p>}
        <div className="note">Setelah mengatur koin atau saham, kembali ke <a href="/">beranda</a> — halaman akan beralih ke aset itu, atau buka <a href={`/?coin=${input || 'BTC'}`}>beranda dengan aset Anda</a>. Prakiraan selalu disimpan di kunci <b>kronos:forecast: + simbol</b>, mis. kronos:forecast:BTC, kronos:forecast:NVDA.</div>
      </div>
    </>
  );
}
