import React from 'react';

export default function HealthBar({ snapshot }) {
  if (!snapshot) return null;

  const headAgent = snapshot.head_agent || {};
  const systemRisk = snapshot.system_risk || {};
  const agents = snapshot.agents || [];

  // Compute trading status
  const tradingStatus = headAgent.trading_status || (snapshot.finished ? 'FINISHED' : 'RUNNING');

  // Compute total P&L from agents
  const totalPnL = agents.reduce((sum, a) => {
    const ret = a.risk_metrics?.return_pct ?? 0;
    return sum + ret;
  }, 0);
  const avgPnL = agents.length > 0 ? (totalPnL / agents.length) : 0;

  const globalDD = systemRisk.global_drawdown_pct ?? 0;
  const violations = systemRisk.violation_count ?? systemRisk.total_violations_count ?? 0;
  const step = snapshot.step ?? 0;
  const maxSteps = snapshot.max_steps ?? 0;

  // Status color
  const statusColor =
    tradingStatus === 'HALTED_BY_CIRCUIT_BREAKER' ? '#ef4444' :
    tradingStatus === 'PAUSED' ? '#eab308' :
    tradingStatus === 'FINISHED' ? '#3b82f6' :
    '#22c55e';

  const statusBg = statusColor + '22';

  return (
    <div className="health-bar">
      <div className="health-item">
        <span className="health-pill" style={{ background: statusBg, color: statusColor }}>
          {tradingStatus}
        </span>
      </div>
      <div className="health-item">
        <span className="health-label">Step</span>
        <span className="health-value">{step} / {maxSteps}</span>
      </div>
      <div className="health-item">
        <span className="health-label">Avg P&L</span>
        <span className="health-value" style={{ color: avgPnL >= 0 ? '#22c55e' : '#ef4444' }}>
          {avgPnL >= 0 ? '+' : ''}{avgPnL.toFixed(2)}%
        </span>
      </div>
      <div className="health-item">
        <span className="health-label">Drawdown</span>
        <span className="health-value" style={{ color: globalDD < -5 ? '#ef4444' : globalDD < -2 ? '#eab308' : '#22c55e' }}>
          {globalDD.toFixed(1)}%
        </span>
      </div>
      <div className="health-item">
        <span className="health-label">Violations</span>
        <span className="health-value" style={{ color: violations > 0 ? '#eab308' : '#22c55e' }}>
          {violations}
        </span>
      </div>
      {snapshot.crash_active && (
        <div className="health-item">
          <span className="health-pill" style={{ background: '#ef444422', color: '#ef4444', animation: 'crash-pulse 0.6s infinite alternate' }}>
            CRASH ACTIVE
          </span>
        </div>
      )}
    </div>
  );
}
