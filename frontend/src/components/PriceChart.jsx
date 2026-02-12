import React, { useMemo, useState } from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Scatter, Cell,
} from 'recharts';

// Custom candlestick shape
function CandlestickShape(props) {
  const { x, y, width, payload } = props;
  if (!payload) return null;
  const { Open, Close, High, Low } = payload;
  if (Open == null || Close == null) return null;

  const isUp = Close >= Open;
  const color = isUp ? '#22c55e' : '#ef4444';
  const bodyTop = Math.min(Open, Close);
  const bodyBot = Math.max(Open, Close);

  // Scale: We need the chart's Y scale. Approximate with y/Close ratio.
  // We'll use a simpler bar approach.
  return (
    <g>
      <line x1={x + width / 2} y1={y} x2={x + width / 2} y2={y}
        stroke={color} strokeWidth={1} />
      <rect
        x={x + 1} y={y}
        width={Math.max(width - 2, 2)}
        height={Math.max(2, 2)}
        fill={color}
        stroke={color}
      />
    </g>
  );
}

// Trade marker dots
function TradeMarker(props) {
  const { cx, cy, payload } = props;
  if (!payload || !payload.tradeType) return null;
  const isBuy = payload.tradeType === 'BUY';
  const color = isBuy ? '#22c55e' : '#ef4444';
  const symbol = isBuy ? '▲' : '▼';
  return (
    <text x={cx} y={cy - 8} textAnchor="middle" fill={color} fontSize={14} fontWeight="bold">
      {symbol}
    </text>
  );
}

export default function PriceChart({ priceHistory, tradeLog, highlightStep, onJump, maxSteps, currentStep }) {
  const [showCandlestick, setShowCandlestick] = useState(false);

  // Build chart data with trade markers
  const { data, tradeMarkers } = useMemo(() => {
    if (!priceHistory || priceHistory.length === 0) return { data: [], tradeMarkers: [] };

    const d = priceHistory.slice(-200).map((bar, i) => {
      const globalIdx = priceHistory.length - Math.min(priceHistory.length, 200) + i;
      return {
        idx: globalIdx,
        time: bar.Datetime ? bar.Datetime.slice(11, 16) || bar.Datetime.slice(0, 10) : globalIdx,
        Close: parseFloat(bar.Close?.toFixed(2)),
        Open: parseFloat((bar.Open || bar.Close)?.toFixed(2)),
        High: parseFloat((bar.High || bar.Close)?.toFixed(2)),
        Low: parseFloat((bar.Low || bar.Close)?.toFixed(2)),
        SMA20: parseFloat((bar.SMA20 || 0).toFixed(2)),
        SMA50: parseFloat((bar.SMA50 || 0).toFixed(2)),
        BB_UP: parseFloat((bar.BB_UP || 0).toFixed(2)),
        BB_LOW: parseFloat((bar.BB_LOW || 0).toFixed(2)),
        tradeType: null,
        tradeAgent: null,
      };
    });

    // Overlay trade markers from tradeLog
    const markers = [];
    if (tradeLog && tradeLog.length > 0) {
      const startStep = d[0]?.idx ?? 0;
      for (const t of tradeLog) {
        if (t.action === 'BUY' || t.action === 'SELL') {
          if (t.regulator_decision === 'BLOCK') continue;
          const chartIdx = t.step - startStep;
          if (chartIdx >= 0 && chartIdx < d.length) {
            markers.push({
              idx: d[chartIdx].idx,
              time: d[chartIdx].time,
              Close: d[chartIdx].Close,
              tradeType: t.action,
              tradeAgent: t.agent_name,
            });
          }
        }
      }
    }

    return { data: d, tradeMarkers: markers };
  }, [priceHistory, tradeLog]);

  if (!priceHistory || priceHistory.length === 0) {
    return <div className="card"><h2>Price Chart</h2><p>No data yet.</p></div>;
  }

  return (
    <div className="card">
      <div className="chart-header">
        <h2>Price Chart</h2>
        <div className="chart-controls">
          <label className="toggle-label small">
            <input
              type="checkbox"
              checked={showCandlestick}
              onChange={e => setShowCandlestick(e.target.checked)}
            />
            Candlestick
          </label>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
          <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 11 }} />
          <YAxis domain={['auto', 'auto']} tick={{ fill: '#6b7280', fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: '#1a1d2e', border: '1px solid #3a3f55', fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />

          {showCandlestick ? (
            <>
              {/* Simple OHLC bars using High-Low as error bars with colored Close line */}
              <Bar dataKey="High" fill="transparent" />
              <Line type="step" dataKey="Open" stroke="#8884d8" dot={false} strokeWidth={1} strokeDasharray="2 2" />
              <Line type="step" dataKey="Close" stroke={data.length > 0 && data[data.length - 1]?.Close >= data[0]?.Close ? '#22c55e' : '#ef4444'} dot={false} strokeWidth={2} />
            </>
          ) : (
            <Line type="monotone" dataKey="Close" stroke="#3b82f6" dot={false} strokeWidth={2} />
          )}

          <Line type="monotone" dataKey="SMA20" stroke="#22c55e" dot={false} strokeWidth={1} />
          <Line type="monotone" dataKey="SMA50" stroke="#f59e0b" dot={false} strokeWidth={1} />
          <Line type="monotone" dataKey="BB_UP" stroke="#ef444488" dot={false} strokeWidth={1} strokeDasharray="4 2" />
          <Line type="monotone" dataKey="BB_LOW" stroke="#ef444488" dot={false} strokeWidth={1} strokeDasharray="4 2" />

          {/* Trade markers */}
          {tradeMarkers.length > 0 && (
            <Scatter data={tradeMarkers} dataKey="Close" shape={<TradeMarker />}>
              {tradeMarkers.map((m, i) => (
                <Cell key={i} fill={m.tradeType === 'BUY' ? '#22c55e' : '#ef4444'} />
              ))}
            </Scatter>
          )}

          {/* Highlight step */}
          {highlightStep != null && (
            <ReferenceLine x={highlightStep} stroke="#a78bfa" strokeWidth={2} strokeDasharray="4 2" />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Step scrubber */}
      {maxSteps > 0 && (
        <div className="scrubber">
          <span>Step: {currentStep}</span>
          <input
            type="range"
            min={0}
            max={maxSteps - 1}
            value={currentStep}
            onChange={e => onJump(Number(e.target.value))}
            className="scrubber-input"
          />
          <span>{maxSteps - 1}</span>
        </div>
      )}
    </div>
  );
}
