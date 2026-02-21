import React from 'react';

const TICKERS = ['AAPL', 'MSFT', 'TSLA', 'NSEI', 'RELIANCE.NS', 'TCS.NS', 'INFY.NS'];
const PERIODS = ['1d', '5d', '1mo', '3mo'];
const INTERVALS = ['1m', '5m', '15m', '1h', '1d'];

export default function ControlsPanel({
  ticker, setTicker,
  period, setPeriod,
  interval, setInterval_,
  onInit, onStep, onAutoRun, onPause, onCrash,
  status, step, maxSteps,
  speedMs, setSpeedMs,
  batchSize, setBatchSize,
  activeAgents, allAgents, toggleAgent,
  onOpenSettings,
  crashActive,
}) {
  const badgeClass =
    status === 'running'  ? 'badge-running' :
    status === 'paused'   ? 'badge-paused' :
    status === 'finished' ? 'badge-finished' :
    'badge-idle';

  const canAct = status === 'paused';

  return (
    <div className="card controls">
      <h2>Simulation Controls</h2>

      <label>
        Stock / Index
        <select value={ticker} onChange={e => setTicker(e.target.value)}>
          {TICKERS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>

      <label>
        Historical Window
        <select value={period} onChange={e => setPeriod(e.target.value)}>
          {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </label>

      <label>
        Time per Candle
        <select value={interval} onChange={e => setInterval_(e.target.value)}>
          {INTERVALS.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
      </label>

      {/* Speed control */}
      <div className="speed-section">
        <label>
          Run speed: {speedMs}ms per step
          <input
            type="range" min={50} max={1000} step={50}
            value={speedMs}
            onChange={e => setSpeedMs(Number(e.target.value))}
          />
        </label>
        <label>
          Steps per click/run: {batchSize}
          <input
            type="range" min={1} max={20} step={1}
            value={batchSize}
            onChange={e => setBatchSize(Number(e.target.value))}
          />
        </label>
      </div>

      {/* Agent toggles */}
      <div className="agent-toggles">
        <h3>Enable Agents</h3>
        {allAgents.map(a => (
          <label key={a.key} className="toggle-label">
            <input
              type="checkbox"
              checked={activeAgents.includes(a.key)}
              onChange={() => toggleAgent(a.key)}
            />
            {a.label}
          </label>
        ))}
      </div>

      <div className="btn-row">
        <button className="btn btn-primary" onClick={onInit}>
          1) Initialize Market
        </button>
        <button className="btn btn-success" onClick={onStep}
                disabled={status === 'finished' || status === 'idle'}>
          2) Run One Step
        </button>
        <button className="btn btn-warning" onClick={onAutoRun}
                disabled={status === 'running' || status === 'finished' || status === 'idle'}>
          3) Auto Run
        </button>
        <button className="btn btn-danger" onClick={onPause}
                disabled={status !== 'running'}>
          Pause
        </button>
      </div>

      {/* Crash button */}
      <button
        className={`btn btn-crash ${crashActive ? 'crash-active' : ''}`}
        onClick={onCrash}
        disabled={status === 'idle' || status === 'finished'}
        style={{ width: '100%', marginTop: 8 }}
      >
        💥 Trigger Crash
      </button>

      {/* Settings button */}
      <button
        className="btn btn-settings"
        onClick={onOpenSettings}
        style={{ width: '100%', marginTop: 8 }}
      >
        ⚙ Agent Settings
      </button>

      <div className="status-text">
        Simulation status: <span className={`badge ${badgeClass}`}>{status.toUpperCase()}</span>
        {crashActive && <span className="badge badge-crash">CRASH</span>}
        <br />
        Current step: {step} / {maxSteps}
      </div>
    </div>
  );
}
