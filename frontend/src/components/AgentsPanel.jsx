import React from 'react';

function riskColor(val) {
  if (val == null) return '#6b7280';
  if (val >= 0) return '#22c55e';
  if (val > -5) return '#eab308';
  return '#ef4444';
}

export default function AgentsPanel({ agents, activeAgents }) {
  if (!agents || agents.length === 0) {
    return <div className="card"><h2>Agents</h2><p>No agents yet.</p></div>;
  }

  return (
    <div className="card">
      <h2>Agents <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>({agents.filter(a => a.active !== false).length} / {agents.length} active)</span></h2>
      <div className="agents-grid">
        {agents.map(agent => {
          const pos = agent.positions || {};
          const posStr = Object.entries(pos).map(([t, q]) => `${t}: ${q}`).join(', ') || '—';
          const action = agent.last_action?.type || '—';
          const risk = agent.risk_metrics || {};
          const isHalted = agent.halted;
          const isInactive = !agent.active;

          return (
            <div className={`agent-card ${isHalted ? 'agent-halted' : ''} ${isInactive ? 'agent-inactive' : ''}`} key={agent.name}>
              <div className="agent-card-header">
                <h3>{agent.name}</h3>
                {isHalted && <span className="badge badge-halted">HALTED</span>}
                {isInactive && <span className="badge badge-inactive">OFF</span>}
              </div>
              <div className="row">
                <span className="label">Cash</span>
                <span>${agent.cash?.toLocaleString()}</span>
              </div>
              <div className="row">
                <span className="label">Positions</span>
                <span>{posStr}</span>
              </div>
              <div className="row">
                <span className="label">Portfolio</span>
                <span>${agent.portfolio_value?.toLocaleString()}</span>
              </div>
              <div className="row">
                <span className="label">Action</span>
                <span>{action}</span>
              </div>

              {/* Risk metrics */}
              <div className="risk-grid">
                <div className="risk-item">
                  <span className="risk-label">Return</span>
                  <span style={{ color: riskColor(risk.return_pct) }}>
                    {risk.return_pct != null ? `${risk.return_pct.toFixed(1)}%` : '—'}
                  </span>
                </div>
                <div className="risk-item">
                  <span className="risk-label">Drawdown</span>
                  <span style={{ color: riskColor(risk.current_drawdown_pct) }}>
                    {risk.current_drawdown_pct != null ? `${risk.current_drawdown_pct.toFixed(1)}%` : '—'}
                  </span>
                </div>
                <div className="risk-item">
                  <span className="risk-label">Max DD</span>
                  <span style={{ color: riskColor(risk.max_drawdown_pct) }}>
                    {risk.max_drawdown_pct != null ? `${risk.max_drawdown_pct.toFixed(1)}%` : '—'}
                  </span>
                </div>
                <div className="risk-item">
                  <span className="risk-label">Sharpe</span>
                  <span style={{ color: risk.sharpe_ratio >= 0 ? '#22c55e' : '#ef4444' }}>
                    {risk.sharpe_ratio != null ? risk.sharpe_ratio.toFixed(2) : '—'}
                  </span>
                </div>
              </div>

              <div className="reason">{agent.last_reason || ''}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
