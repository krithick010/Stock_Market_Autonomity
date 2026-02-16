import React from 'react';

const SCENARIOS = [
  {
    key: 'calm',
    label: '🌤 Calm Market',
    description: 'Stable blue-chip stock, low volatility',
    config: {
      ticker: 'AAPL',
      period: '5d',
      interval: '5m',
      activeAgents: ['conservative', 'momentum', 'meanreversion', 'noisetrader'],
      speed: 200,
    },
  },
  {
    key: 'volatile',
    label: '⚡ Volatile Day',
    description: 'High-beta stock, fast swings',
    config: {
      ticker: 'TSLA',
      period: '1d',
      interval: '1m',
      activeAgents: ['conservative', 'momentum', 'meanreversion', 'noisetrader', 'adversarial'],
      speed: 150,
    },
  },
  {
    key: 'whale',
    label: '🐋 Whale Crash Demo',
    description: 'Adversarial agent triggers crash',
    config: {
      ticker: 'AAPL',
      period: '5d',
      interval: '5m',
      activeAgents: ['conservative', 'momentum', 'meanreversion', 'noisetrader', 'adversarial'],
      speed: 250,
    },
  },
];

export default function ScenarioPresets({ onSelectScenario, activeScenario }) {
  return (
    <div className="scenario-presets">
      <h3>Scenario Presets</h3>
      <div className="scenario-btn-group">
        {SCENARIOS.map(s => (
          <button
            key={s.key}
            className={`btn scenario-btn ${activeScenario === s.key ? 'scenario-active' : ''}`}
            onClick={() => onSelectScenario(s.key, s.config)}
            title={s.description}
          >
            {s.label}
          </button>
        ))}
      </div>
      {activeScenario && (
        <div className="scenario-active-label">
          Scenario: {SCENARIOS.find(s => s.key === activeScenario)?.label}
        </div>
      )}
    </div>
  );
}
