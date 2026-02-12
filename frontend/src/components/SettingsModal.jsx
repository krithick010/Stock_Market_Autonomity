import React, { useState } from 'react';

const PARAM_LABELS = {
  risk_pct: 'Risk %',
  stop_loss_pct: 'Stop Loss %',
  volatility_threshold: 'Volatility Threshold',
  position_size_pct: 'Position Size %',
  band_multiplier: 'BB Band Multiplier',
  trade_probability: 'Trade Probability',
  pump_fraction: 'Pump Fraction',
  dump_threshold: 'Dump Threshold',
  volume_low_pctile: 'Volume Low Percentile',
  pump_probability: 'Pump Probability',
};

const AGENT_LABELS = {
  conservative: 'Conservative Agent',
  momentum: 'Momentum Agent',
  meanreversion: 'Mean Reversion Agent',
  noisetrader: 'Noise Trader',
  adversarial: 'Adversarial Agent',
};

export default function SettingsModal({ agentParams, setAgentParams, defaultParams, onClose }) {
  const [local, setLocal] = useState(JSON.parse(JSON.stringify(agentParams)));

  const handleChange = (agentKey, paramKey, value) => {
    setLocal(prev => ({
      ...prev,
      [agentKey]: {
        ...prev[agentKey],
        [paramKey]: parseFloat(value) || 0,
      },
    }));
  };

  const handleReset = () => {
    setLocal(JSON.parse(JSON.stringify(defaultParams)));
  };

  const handleApply = () => {
    setAgentParams(JSON.parse(JSON.stringify(local)));
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Agent Settings</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="settings-grid">
          {Object.keys(local).map(agentKey => (
            <div key={agentKey} className="settings-agent-card">
              <h3>{AGENT_LABELS[agentKey] || agentKey}</h3>
              {Object.entries(local[agentKey]).map(([paramKey, val]) => (
                <label key={paramKey} className="settings-param">
                  <span>{PARAM_LABELS[paramKey] || paramKey}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={val}
                    onChange={e => handleChange(agentKey, paramKey, e.target.value)}
                  />
                </label>
              ))}
            </div>
          ))}
        </div>

        <div className="modal-actions">
          <button className="btn btn-danger" onClick={handleReset}>Reset Defaults</button>
          <button className="btn btn-primary" onClick={handleApply}>Apply & Close</button>
        </div>
      </div>
    </div>
  );
}
