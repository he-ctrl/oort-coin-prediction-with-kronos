'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

const POPULAR = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'BNB', 'LTC'];
const STOCKS = [
  { coin: 'NVDA', label: 'NVDA' },
  { coin: 'META', label: 'META' },
  { coin: 'AAPL', label: 'AAPL' },
  { coin: 'MSFT', label: 'MSFT' },
  { coin: 'TSLA', label: 'TSLA' },
  { coin: 'AMZN', label: 'AMZN' },
  { coin: 'GOOGL', label: 'GOOGL' },
  { coin: 'AMD', label: 'AMD' },
  { coin: 'NFLX', label: 'NFLX' },
  { coin: 'GSPC', label: 'S&P 500' },
  { coin: 'IXIC', label: 'Nasdaq' },
];
const STOCK_COINS = new Set(STOCKS.map(s => s.coin));
const isStock = (c) => STOCK_COINS.has(c);
const assetLabel = (c) => {
  if (!isStock(c)) return `${c} / USDT`;
  if (c === 'GSPC') return 'S&P 500';
  if (c === 'IXIC') return 'Nasdaq';
  return `${c} / USD`;
};
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

function fmt(n, digits = 2) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtAxis(v) {
  if (v == null || isNaN(v)) return '—';
  const a = Math.abs(v);
  const digits = a < 1 ? 4 : a < 10 ? 3 : 2;
  return Number(v).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function LineChart({ history, predictions }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(null);
  const W = 1000, H = 360, PL = 80, PR = 20, PT = 20, PB = 36;
  // Build ONE indexed array and slice it — never use indexOf on copied
  // objects (that was the bug: indexOf always returned -1, so every point
  // collapsed to the same x and the lines were invisible).
  const all = [...history.map(p => ({ ...p, kind: 'history' })), ...predictions.map(p => ({ ...p, kind: 'pred' }))];
  const histPts = all.slice(0, history.length);
  const predPts = all.slice(history.length);
  // Prediction line starts at the last actual point, so the two lines join.
  const predLinePts = histPts.length && predPts.length ? [histPts[histPts.length - 1], ...predPts] : predPts;
  const predStartIdx = histPts.length ? histPts.length - 1 : 0;
  const chart = useMemo(() => {
    if (all.length < 2) return null;
    const prices = all.map(p => p.close);
    let min = Math.min(...prices), max = Math.max(...prices);
    if (max === min) { max = min * 1.01 + 0.001; }
    const pad = (max - min) * 0.12; min -= pad; max += pad;
    const x = (i) => PL + (i / (all.length - 1)) * (W - PL - PR);
    const y = (v) => PT + (1 - (v - min) / (max - min)) * (H - PT - PB);
    const pathFor = (pts, startIdx) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(startIdx + i).toFixed(1)},${y(p.close).toFixed(1)}`).join(' ');
    return { min, max, x, y, pathFor };
  }, [history, predictions]);
  if (!chart) return <p style={{ color: '#94a3b8' }}>Menunggu prediksi untuk aset ini… atur aset di bawah, skrip Kronos akan mengirim prakiraan ke KV.</p>;
  const onMove = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width * W;
    let best = 0, bestD = 1e9;
    all.forEach((p, i) => { const d = Math.abs(chart.x(i) - px); if (d < bestD) { bestD = d; best = i; } });
    setHover(all[best]);
  };
  const splitX = histPts.length ? chart.x(histPts.length - 1) : null;
  return (
    <div>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} width="100%" onMouseMove={onMove} onMouseLeave={() => setHover(null)} style={{ display: 'block' }}>
        {[0, 0.25, 0.5, 0.75, 1].map(f => {
          const v = chart.min + (chart.max - chart.min) * f;
          const yy = chart.y(v);
          return <g key={f}><line x1={PL} x2={W - PR} y1={yy} y2={yy} stroke="#1f2937" /><text x={PL - 8} y={yy + 4} fill="#94a3b8" fontSize="12" textAnchor="end">${fmtAxis(v)}</text></g>;
        })}
        {splitX != null && predPts.length > 0 && (
          <g><line x1={splitX} x2={splitX} y1={PT} y2={H - PB} stroke="#f59e0b" strokeDasharray="3 3" opacity="0.6" /><text x={splitX + 6} y={PT + 14} fill="#fbbf24" fontSize="13" fontWeight="700">Prediksi →</text></g>
        )}
        {histPts.length > 1 && <path d={chart.pathFor(histPts, 0)} fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
        {predLinePts.length > 1 && <path d={chart.pathFor(predLinePts, predStartIdx)} fill="none" stroke="#fbbf24" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />}
        {predPts.map((p, i) => (
          <circle key={p.t + i} cx={chart.x(histPts.length + i)} cy={chart.y(p.close)} r="4" fill="#fbbf24" stroke="#111827" strokeWidth="1" />
        ))}
        {hover && (() => { const i = all.indexOf(hover); return <g><circle cx={chart.x(i)} cy={chart.y(hover.close)} r="7" fill={hover.kind === 'pred' ? '#fbbf24' : '#38bdf8'} stroke="#fff" strokeWidth="1.5" /><line x1={chart.x(i)} x2={chart.x(i)} y1={PT} y2={H - PB} stroke="#475569" strokeDasharray="3 3" /></g>; })()}
      </svg>
      {hover && <p style={{ color: '#e2e8f0' }}>{hover.kind === 'pred' ? 'Prediksi' : 'Aktual'} — {hover.t} — <b>${fmt(hover.close)}</b></p>}
      {!predPts.length && <p style={{ color: '#fbbf24' }}>Belum ada titik prediksi untuk aset ini — skrip Kronos mengirim prakiraan baru setiap 10 menit, atau tekan “Perbarui prakiraan sekarang”.</p>}
    </div>
  );
}


function LiveChart({ series }) {
  const W = 1000, H = 220, PL = 70, PR = 20, PT = 16, PB = 30;
  if (series.length < 2) return <p style={{ color: '#94a3b8' }}>Menghubungkan ke feed harga live… (diperbarui setiap 5 detik)</p>;
  const prices = series.map(s => s.price);
  let min = Math.min(...prices), max = Math.max(...prices);
  if (max === min) max = min + 1;
  const pad = (max - min) * 0.1 || 1; min -= pad; max += pad;
  const x = (i) => PL + (i / (series.length - 1)) * (W - PL - PR);
  const y = (v) => PT + (1 - (v - min) / (max - min)) * (H - PT - PB);
  const path = series.map((s, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(s.price).toFixed(1)}`).join(' ');
  const last = series[series.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      {[0, 0.5, 1].map(f => {
        const v = min + (max - min) * f; const yy = y(v);
        return <g key={f}><line x1={PL} x2={W - PR} y1={yy} y2={yy} stroke="#1f2937" /><text x={PL - 8} y={yy + 4} fill="#94a3b8" fontSize="12" textAnchor="end">${fmt(v)}</text></g>;
      })}
      <path d={path} fill="none" stroke="#22c55e" strokeWidth="2.5" />
      <circle cx={x(series.length - 1)} cy={y(last.price)} r="6" fill="#22c55e" />
    </svg>
  );
}

export default function Home() {
  const [coin, setCoin] = useState('BTC');
  const [market, setMarket] = useState('crypto');
  const [input, setInput] = useState('BTC');
  const [pred, setPred] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [setMsg, setSetMsg] = useState('');
  const [notice, setNotice] = useState('');
  const [live, setLive] = useState(null);
  const [liveSeries, setLiveSeries] = useState([]);
  const [liveErr, setLiveErr] = useState('');
  const [cfgInterval, setCfgInterval] = useState('1h');
  const [cfgPredLen, setCfgPredLen] = useState(24);
  const [cfgHistLen, setCfgHistLen] = useState(48);
  const [cfgMsg, setCfgMsg] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = (params.get('coin') || localStorage.getItem('pred-coin') || 'BTC').toUpperCase().replace(/[^A-Z]/g, '');
    if (q) { setCoin(q); setInput(q); }
    const m = localStorage.getItem('pred-market');
    if (m === 'stocks' || m === 'crypto') setMarket(m);
    else if (q && STOCK_COINS.has(q)) setMarket('stocks');
    try {
      const saved = JSON.parse(localStorage.getItem('pred-config') || '{}');
      if (INTERVALS.includes(saved.interval)) setCfgInterval(saved.interval);
      if (PRED_LENS.includes(Number(saved.pred_len))) setCfgPredLen(Number(saved.pred_len));
      if (HISTORY_LENS.includes(Number(saved.history_len))) setCfgHistLen(Number(saved.history_len));
    } catch {}
  }, []);

  // Prakiraan dibaca dari KV lewat HTTP (bukan SSE/MQTT lagi): skrip menulis
  // prakiraan baru ke kronos:forecast:{coin} tiap 10 menit atau saat pilihan
  // berubah; halaman ini memeriksa tiap 60 detik.
  useEffect(() => {
    if (!coin) return;
    localStorage.setItem('pred-coin', coin);
    let stopped = false;
    const fetchPred = async () => {
      try {
        const r = await fetch(`/api/forecast?coin=${coin}`, { cache: 'no-store' });
        if (!r.ok) { if (!stopped) setStatus('error'); return; }
        const m = await r.json();
        if (stopped || !m.predictions) return;
        setPred(m);
        setStatus('connected');
        if (INTERVALS.includes(m.interval)) setCfgInterval(m.interval);
        if (PRED_LENS.includes(Number(m.pred_len))) setCfgPredLen(Number(m.pred_len));
        if (HISTORY_LENS.includes(Number(m.history_len))) setCfgHistLen(Number(m.history_len));
      } catch { if (!stopped) setStatus('error'); }
    };
    fetchPred();
    const id = setInterval(fetchPred, 60000);
    return () => { stopped = true; clearInterval(id); };
  }, [coin]);

  // Mendeteksi pilihan aset yang diubah dari tempat lain (mis. halaman
  // /set-coin) lewat kunci kronos:selection, lalu beralih otomatis.
  useEffect(() => {
    let stopped = false;
    const checkSelection = async () => {
      try {
        const r = await fetch('/api/selection', { cache: 'no-store' });
        const s = await r.json();
        if (stopped || !s.coin || s.coin === coin) return;
        setNotice(`Pilihan aset berubah menjadi ${s.coin}. Beralih…`);
        setTimeout(() => { if (!stopped) { setCoin(s.coin); setInput(s.coin); } }, 800);
      } catch {}
    };
    const id = setInterval(checkSelection, 60000);
    return () => { stopped = true; clearInterval(id); };
  }, [coin]);

  useEffect(() => {
    if (!coin) return;
    setLive(null); setLiveSeries([]); setLiveErr('');
    let stopped = false;
    const poll = async () => {
      try {
        const r = await fetch(`/api/price?coin=${coin}`, { cache: 'no-store' });
        const j = await r.json();
        if (stopped || !j.price) { if (!stopped && j.error) setLiveErr(j.error); return; }
        setLive(j);
        setLiveSeries(s => [...s.slice(-119), { t: j.at, price: j.price }]);
      } catch (e) { if (!stopped) setLiveErr(String(e?.message || e)); }
    };
    poll();
    const id = setInterval(poll, isStock(coin) ? 30000 : 5000);
    return () => { stopped = true; clearInterval(id); };
  }, [coin]);

  const refreshForecast = async () => {
    setSetMsg('Meminta prakiraan baru — skrip Kronos akan menjalankan ulang untuk ' + coin + '…');
    await setCoinApi(coin);
  };

  const setCoinApi = async (c) => {
    const clean = c.toUpperCase().replace(/[^A-Z]/g, '');
    if (!clean) return;
    setSetMsg('Menyimpan pilihan…');
    const r = await fetch('/api/set-coin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ coin: clean }) });
    const j = await r.json();
    if (j.ok) { setSetMsg(`Disimpan: ${clean} — skrip Kronos sekarang akan memprediksi ${clean} dan mengirim prakiraannya ke KV.`); setCoin(clean); setInput(clean); const m = isStock(clean) ? 'stocks' : 'crypto'; setMarket(m); localStorage.setItem('pred-market', m); }
    else setSetMsg(`Galat: ${j.error}`);
  };

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
        if (j.ok) { localStorage.setItem('pred-config', JSON.stringify(config)); setCfgMsg('Interval diatur ke 1d (harian) untuk saham — disimpan ke KV.'); }
        else setCfgMsg(`Galat: ${j.error}`);
      } catch (e) { setCfgMsg(`Galat: ${e?.message || e}`); }
    }
  };

  const applyConfig = async () => {
    const config = { interval: cfgInterval, pred_len: cfgPredLen, history_len: cfgHistLen };
    setCfgMsg('Menyimpan pengaturan ke KV…');
    try {
      const r = await fetch('/api/set-config', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(config) });
      const j = await r.json();
      if (j.ok) {
        localStorage.setItem('pred-config', JSON.stringify(config));
        setCfgMsg(`Selesai: interval ${cfgInterval}, aktual ${cfgHistLen} titik (${spanLabel(cfgHistLen, cfgInterval)}), prediksi ${cfgPredLen} titik (${spanLabel(cfgPredLen, cfgInterval)}) disimpan ke KV. Skrip Kronos akan menjalankan ulang prakiraan baru dengan pengaturan ini.`);
      } else setCfgMsg(`Galat: ${j.error}`);
    } catch (e) { setCfgMsg(`Galat: ${e?.message || e}`); }
  };

  const history = pred?.history || [];
  const predictions = pred?.predictions || [];
  const current = pred?.current_price;
  const lastPred = predictions.length ? predictions[predictions.length - 1].close : null;
  const change = current && lastPred ? ((lastPred - current) / current * 100) : null;
  const effInterval = pred?.interval || cfgInterval;
  const effPredLen = predictions.length || cfgPredLen;
  const effHistLen = history.length || cfgHistLen;

  return (
    <>
      <nav className="nav"><div className="nav-inner">
        <div className="brand">OORT<span> • </span>PREDIKSI KOIN</div>
        <div className="nav-links"><a href="/">Beranda</a><a href="/set-coin">Atur Koin</a></div>
      </div></nav>
      <div className="wrap">
        <p className="status"><span className={`dot ${status === 'connected' ? '' : 'off'}`} />HTTP (KV): {status} — prakiraan <b>kronos:forecast:{coin}</b> + pilihan <b>kronos:selection</b></p>
        <h1>Prediksi Pasar <span>dengan Kronos</span></h1>
        <p className="sub">Kronos (NeoQuasar/Kronos-mini, model dasar untuk candle keuangan) memprakirakan {effPredLen} harga penutupan berikutnya dari 200 candle terakhir {market === 'stocks' ? 'di Yahoo Finance (saham AS)' : 'di Binance US (kripto)'}, pada interval yang Anda atur di bawah. Ini adalah prakiraan model, bukan saran keuangan.</p>
        {notice && <p style={{ background: '#422006', padding: '12px 16px', borderRadius: 12 }}>{notice}</p>}

        <div className="controls">
          <input value={input} onChange={e => setInput(e.target.value.toUpperCase())} placeholder="BTC" style={{ width: 140 }} />
          <button className="btn" onClick={() => setCoinApi(input)}>Atur koin</button>
          <a className="btn btn-ghost" href="/set-coin">Halaman atur koin</a>
          <button className="btn btn-ghost" onClick={refreshForecast}>↻ Perbarui prakiraan sekarang</button>
        </div>
        <div className="controls">
          <button className={`chip ${market === 'crypto' ? 'active' : ''}`} onClick={() => switchMarket('crypto')}>🪙 Kripto</button>
          <button className={`chip ${market === 'stocks' ? 'active' : ''}`} onClick={() => switchMarket('stocks')}>📈 Saham AS</button>
        </div>
        <div className="controls">
          {market === 'stocks'
            ? STOCKS.map(s => <button key={s.coin} className={`chip ${coin === s.coin ? 'active' : ''}`} onClick={() => setCoinApi(s.coin)}>{s.label}</button>)
            : POPULAR.map(c => <button key={c} className={`chip ${coin === c ? 'active' : ''}`} onClick={() => setCoinApi(c)}>{c}</button>)}
        </div>
        {setMsg && <p style={{ color: '#fcd34d' }}>{setMsg}</p>}

        <div className="chart-box">
          <h3 style={{ margin: '0 0 8px' }}>⏱ Pengaturan Jangka Waktu</h3>
          <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 0 }}>Mengubah ini akan menyimpan pilihan ke KV (Upstash, tersimpan) dan skrip Kronos akan menjalankan ulang prakiraan baru dengan pengaturan baru. Lookback tetap 200 candle.</p>
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
            <button className="btn" onClick={applyConfig} style={{ alignSelf: 'end' }}>Terapkan pengaturan</button>
          </div>
          {cfgMsg && <p style={{ color: '#fcd34d', lineHeight: 1.6 }}>{cfgMsg}</p>}
          <p style={{ color: '#94a3b8', fontSize: 13 }}>Pengaturan prakiraan saat ini: interval <b>{effInterval}</b> • aktual <b>{effHistLen} titik ({spanLabel(effHistLen, effInterval)})</b> • prediksi <b>{effPredLen} titik ({spanLabel(effPredLen, effInterval)})</b></p>
        </div>

        <div className="cards">
          <div className="card"><span>{isStock(coin) ? 'Saham / Indeks' : 'Koin'}</span><b>{assetLabel(coin)}</b></div>
          <div className="card"><span>Harga live (diperbarui setiap {isStock(coin) ? '30' : '5'} detik)</span><b style={{ color: live && liveSeries.length > 1 && live.price >= liveSeries[liveSeries.length - 2].price ? '#22c55e' : '#ef4444' }}>${fmt(live?.price ?? current)}</b><span> {live ? `lewat ${live.source}` : 'dari prakiraan terakhir'}</span></div>
          <div className="card"><span>Titik prediksi terakhir (+{spanLabel(effPredLen, effInterval)})</span><b>${fmt(lastPred)}</b></div>
          <div className="card"><span>Perubahan prediksi</span><b style={{ color: change >= 0 ? '#22c55e' : '#ef4444' }}>{change == null ? '—' : `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`}</b></div>
        </div>

        <div className="chart-box">
          <div className="legend"><span><i style={{ background: '#38bdf8' }} />Aktual (terakhir {effHistLen} × {effInterval} = {spanLabel(effHistLen, effInterval)})</span><span><i style={{ background: '#f59e0b' }} />Prediksi Kronos (berikutnya {effPredLen} × {effInterval} = {spanLabel(effPredLen, effInterval)}, garis putus-putus)</span></div>
          <LineChart history={history} predictions={predictions} />
          <p style={{ color: '#94a3b8', fontSize: 13 }}>Model: {pred?.model || 'NeoQuasar/Kronos-mini'} • Interval: {effInterval} • Lookback: 200 candle • Aktual: {history.length} titik • Prediksi: {predictions.length} titik • Prakiraan terakhir: {pred?.at || '—'} • Arahkan kursor ke garis untuk memeriksa titik.</p>
        </div>

        <div className="chart-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ margin: 0 }}>🔴 LIVE — harga {coin}, realtime</h3>
            <span className="status"><span className={`dot ${live ? '' : 'off'}`} />{live ? `Pembaruan terakhir: ${new Date(live.at).toLocaleTimeString()}` : 'Menghubungkan…'}</span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: 13 }}>{isStock(coin) ? 'Memeriksa /api/price setiap 30 detik (Yahoo Finance). Saham hanya diperdagangkan Senin–Jumat pada jam bursa AS — di luar jam bursa, harga yang tampil adalah penutupan terakhir, itu normal.' : 'Memeriksa /api/price setiap 5 detik (ticker publik Binance US, cadangan Kraken).'} Garis ini bergerak live, sedangkan grafik di atas menampilkan prakiraan Kronos (diperbarui setiap prakiraan baru masuk KV — skrip menulis tiap 10 menit atau saat pilihan berubah).</p>
          {liveErr && <p style={{ color: '#fca5a5' }}>Galat feed live: {liveErr}</p>}
          <LiveChart series={liveSeries} />
          <p style={{ color: '#e2e8f0' }}>Live: <b>${fmt(live?.price)}</b>{liveSeries.length > 1 && <> • perubahan sejak sesi ini dimulai: <b style={{ color: live.price >= liveSeries[0].price ? '#22c55e' : '#ef4444' }}>{((live.price - liveSeries[0].price) / liveSeries[0].price * 100).toFixed(3)}%</b></>}</p>
        </div>

        <div className="note">
          <b>Cara kerja:</b> Anda mengatur aset di halaman ini atau di /set-coin → situs menyimpannya ke kunci KV <b>kronos:selection</b> (Upstash) → skrip Python di sandbox membaca pilihan itu tiap 30 detik, mengambil OHLCV aset tersebut (kripto dari Binance US, saham AS dari Yahoo Finance), menjalankan Kronos, dan mengirim prakiraan ke kunci <b>kronos:forecast:{coin}</b> → halaman ini memeriksa prakiraan itu tiap 60 detik dan menggambar grafik garis. Jika pilihan berubah, skrip otomatis beralih aset. Pengaturan jangka waktu bekerja dengan cara yang sama lewat kunci pilihan yang sama (interval, titik aktual, titik prediksi); lookback tetap 200 candle. Tidak ada MQTT — semuanya lewat HTTP.
        </div>
      </div>
      <footer className="footer">Prediksi Koin &amp; Saham AS Oort dengan Kronos • Next.js + HTTP (Upstash KV) + Kronos-mini • Harga kripto: Binance US, harga saham: Yahoo Finance • Prakiraan bukan saran keuangan</footer>
    </>
  );
}
