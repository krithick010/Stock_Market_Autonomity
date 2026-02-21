import React, { useMemo } from 'react';

const C = {
  green: '#00ff88',
  red: '#ff3b5c',
  cyan: '#00d4ff',
  amber: '#ffb800',
  purple: '#a855f7',
  muted: '#5a6478',
  text: '#c9d1e0',
};

function fmt(v, d = 2) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return Number(v).toFixed(d);
}

function pctChange(a, b) {
  if (!a || !b) return null;
  return ((b - a) / a) * 100;
}

export default function MarketPanel({ priceHistory, systemRisk, crashActive }) {
  const stats = useMemo(() => {
    if (!priceHistory?.length) return null;

    const first = priceHistory[0];
    const last = priceHistory[priceHistory.length - 1];
    const closes = priceHistory.map(b => b.Close).filter(Boolean);
    const highs = priceHistory.map(b => b.High ?? b.Close).filter(Boolean);
    const lows = priceHistory.map(b => b.Low ?? b.Close).filter(Boolean);
    const volumes = priceHistory.map(b => b.Volume).filter(Boolean);
    const volatilities = priceHistory.map(b => b.Volatility).filter(Boolean);

    const high = Math.max(...highs);
    const low = Math.min(...lows);
    const open = first.Open ?? first.Close;
    const close = last.Close;
    const change = pctChange(open, close);
    const avgVol = volumes.length ? volumes.reduce((a, b) => a + b, 0) / volumes.length : null;
    const avgVolatility = volatilities.length ? volatilities.reduce((a, b) => a + b, 0) / volatilities.length : null;
    const lastVolatility = last.Volatility;

    return {
      open, close, high, low, change,
      sma20: last.SMA20, sma50: last.SMA50,
      bbUp: last.BB_UP, bbLow: last.BB_LOW, bbMid: last.BB_MID,
      avgVol, lastVolatility, avgVolatility,
      bars: priceHistory.length,
      simPrice: last.SimulatedPrice,
      startDate: first.Datetime,
      endDate: last.Datetime,
    };
  }, [priceHistory]);

  if (!stats) {
    return (
      <div className="card">
        <h2>◎ Market Overview</h2>
        <p style={{ color: C.muted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
          Initialize a simulation to see market data.
        </p>
      </div>
    );
  }

  const up = (stats.change ?? 0) >= 0;

  return (
    <>
      {/* Price Summary */}
      <div className="card" style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>◎ Market Overview</h2>
          {crashActive && (
            <span style={{
              padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700,
              background: 'rgba(255,59,92,0.15)', color: C.red, border: '1px solid rgba(255,59,92,0.3)',
              fontFamily: "'JetBrains Mono', monospace",
            }}>⚠ CRASH ACTIVE</span>
          )}
        </div>

        {/* Big price + change */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
          <span style={{
            fontSize: 32, fontWeight: 700, color: '#edf0f7',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            ₹{fmt(stats.close)}
          </span>
          <span style={{
            fontSize: 14, fontWeight: 600, color: up ? C.green : C.red,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {up ? '▲' : '▼'} {fmt(Math.abs(stats.change))}%
          </span>
        </div>

        {/* Range bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.muted, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>
            <span>Low ₹{fmt(stats.low)}</span>
            <span>Session Range</span>
            <span>High ₹{fmt(stats.high)}</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', position: 'relative' }}>
            {(() => {
              const range = stats.high - stats.low;
              const pos = range > 0 ? ((stats.close - stats.low) / range) * 100 : 50;
              return (
                <>
                  <div style={{
                    position: 'absolute', left: 0, top: 0, height: '100%',
                    width: `${pos}%`, borderRadius: 2,
                    background: `linear-gradient(90deg, ${C.red}44, ${C.green}44)`,
                  }} />
                  <div style={{
                    position: 'absolute', top: -3, left: `${pos}%`, transform: 'translateX(-50%)',
                    width: 10, height: 10, borderRadius: '50%',
                    background: up ? C.green : C.red,
                    boxShadow: `0 0 6px ${up ? C.green : C.red}66`,
                  }} />
                </>
              );
            })()}
          </div>
        </div>

        {/* OHLC grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
          marginBottom: 16,
        }}>
          {[
            { label: 'Open', value: stats.open },
            { label: 'High', value: stats.high, color: C.green },
            { label: 'Low', value: stats.low, color: C.red },
            { label: 'Close', value: stats.close, color: up ? C.green : C.red },
          ].map(item => (
            <div key={item.label} style={{
              padding: '8px 10px', borderRadius: 6,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 2, fontFamily: "'JetBrains Mono', monospace" }}>{item.label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: item.color || C.text, fontFamily: "'JetBrains Mono', monospace" }}>
                ₹{fmt(item.value)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Technical Indicators */}
      <div className="card" style={{ padding: '16px 18px' }}>
        <h2 style={{ marginBottom: 12 }}>Technical Indicators</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {[
            { label: 'SMA 20', value: stats.sma20, color: C.green },
            { label: 'SMA 50', value: stats.sma50, color: C.amber },
            { label: 'BB Upper', value: stats.bbUp, color: C.purple },
            { label: 'BB Lower', value: stats.bbLow, color: C.purple },
            { label: 'BB Mid', value: stats.bbMid, color: C.purple },
            { label: 'Sim Price', value: stats.simPrice, color: C.cyan },
          ].map(item => (
            <div key={item.label} style={{
              padding: '8px 10px', borderRadius: 6,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>{item.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: item.color, fontFamily: "'JetBrains Mono', monospace" }}>
                {item.value != null ? `₹${fmt(item.value)}` : '—'}
              </span>
            </div>
          ))}
        </div>

        {/* SMA crossover signal */}
        {stats.sma20 != null && stats.sma50 != null && (
          <div style={{
            marginTop: 10, padding: '8px 12px', borderRadius: 6,
            background: stats.sma20 > stats.sma50 ? 'rgba(0,255,136,0.06)' : 'rgba(255,59,92,0.06)',
            border: `1px solid ${stats.sma20 > stats.sma50 ? 'rgba(0,255,136,0.15)' : 'rgba(255,59,92,0.15)'}`,
            display: 'flex', alignItems: 'center', gap: 8,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          }}>
            <span style={{ color: stats.sma20 > stats.sma50 ? C.green : C.red, fontWeight: 700 }}>
              {stats.sma20 > stats.sma50 ? '▲ BULLISH' : '▼ BEARISH'}
            </span>
            <span style={{ color: C.muted }}>
              SMA20 {stats.sma20 > stats.sma50 ? 'above' : 'below'} SMA50 — {stats.sma20 > stats.sma50 ? 'Golden' : 'Death'} Cross
            </span>
          </div>
        )}
      </div>

      {/* Volatility + Volume */}
      <div className="card" style={{ padding: '16px 18px' }}>
        <h2 style={{ marginBottom: 12 }}>Volatility & Volume</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {[
            { label: 'Current Volatility', value: stats.lastVolatility != null ? `${(stats.lastVolatility * 100).toFixed(2)}%` : '—', color: stats.lastVolatility > 0.02 ? C.red : C.green },
            { label: 'Avg Volatility', value: stats.avgVolatility != null ? `${(stats.avgVolatility * 100).toFixed(2)}%` : '—', color: C.amber },
            { label: 'Avg Volume', value: stats.avgVol != null ? Math.round(stats.avgVol).toLocaleString() : '—', color: C.cyan },
            { label: 'Total Bars', value: stats.bars, color: C.text },
          ].map(item => (
            <div key={item.label} style={{
              padding: '8px 10px', borderRadius: 6,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>{item.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: item.color, fontFamily: "'JetBrains Mono', monospace" }}>
                {item.value}
              </span>
            </div>
          ))}
        </div>

        {/* Volatility meter */}
        {stats.lastVolatility != null && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.muted, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>
              <span>Calm</span>
              <span>Volatile</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', position: 'relative' }}>
              {(() => {
                const pct = Math.min(stats.lastVolatility * 100 / 5 * 100, 100); // 5% = max
                return (
                  <div style={{
                    position: 'absolute', left: 0, top: 0, height: '100%',
                    width: `${pct}%`, borderRadius: 2,
                    background: `linear-gradient(90deg, ${C.green}, ${C.amber}, ${C.red})`,
                    transition: 'width 0.3s ease',
                  }} />
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
