import React from 'react';

export default function RightTradePanel({
  interval, setInterval_,
  speedMs, setSpeedMs,
  batchSize, setBatchSize,
  activeAgents, allAgents, toggleAgent,
  onStep, onAutoRun, onPause, onInit,
  status, step, maxSteps,
  crashActive, onCrash,
  onOpenSettings,
}) {
  const INTERVALS = ['1m', '5m', '15m', '1h', '1d'];
  const canAct = status === 'paused';

  return (
    <div className="olymp-right-panel">
      <div className="panel-section">
        <h3>Trade Settings</h3>
        <label>
          <span className="label-text">Time per Candle</span>
          <select 
            value={interval} 
            onChange={e => setInterval_(e.target.value)}
            className="compact-select"
          >
            {INTERVALS.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </label>
      </div>

      <div className="panel-section">
        <h3>Simulation Speed</h3>
        <label className="slider-label">
          <span className="speed-value">{speedMs}ms</span>
          <input
            type="range"
            min={50}
            max={1000}
            step={50}
            value={speedMs}
            onChange={e => setSpeedMs(Number(e.target.value))}
            className="speed-slider"
          />
        </label>
        <label className="slider-label">
          <span className="speed-value">Steps: {batchSize}</span>
          <input
            type="range"
            min={1}
            max={20}
            step={1}
            value={batchSize}
            onChange={e => setBatchSize(Number(e.target.value))}
            className="speed-slider"
          />
        </label>
      </div>

      <div className="panel-section">
        <h3>Active Agents</h3>
        <div className="agents-toggle-list">
          {allAgents.map(a => (
            <label key={a.key} className="agent-toggle">
              <input
                type="checkbox"
                checked={activeAgents.includes(a.key)}
                onChange={() => toggleAgent(a.key)}
              />
              <span>{a.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <h3>Controls</h3>
        <div className="control-buttons">
          <button className="btn-init" onClick={onInit}>
            Initialize
          </button>
          <button 
            className="btn-step" 
            onClick={onStep}
            disabled={status === 'finished' || status === 'idle'}
          >
            Step
          </button>
          <button 
            className="btn-run" 
            onClick={onAutoRun}
            disabled={status === 'running' || status === 'finished' || status === 'idle'}
          >
            Run
          </button>
          <button 
            className="btn-pause" 
            onClick={onPause}
            disabled={status !== 'running'}
          >
            Pause
          </button>
        </div>

        <button 
          className={`btn-crash-panel ${crashActive ? 'active' : ''}`}
          onClick={onCrash}
          disabled={status === 'idle' || status === 'finished'}
        >
          💥 Crash
        </button>

        <button 
          className="btn-settings-panel"
          onClick={onOpenSettings}
        >
          ⚙ Settings
        </button>

        <div className="status-info">
          <div className="status-row">
            <span className="status-label">Status:</span>
            <span className={`status-badge status-${status}`}>
              {status.toUpperCase()}
            </span>
          </div>
          <div className="status-row">
            <span className="status-label">Step:</span>
            <span className="step-counter">{step} / {maxSteps}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
