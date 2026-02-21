import React from 'react';

function riskColor(val) {
  if (val == null) return '#6b7280';
  if (val >= 0) return '#22c55e';
  if (val > -5) return '#eab308';
  return '#ef4444';
}

function fmt(val, digits = 2) {
  if (val == null || Number.isNaN(Number(val))) return '—';
  return Number(val).toFixed(digits);
}

function observationSummary(observation) {
  if (!observation || typeof observation !== 'object') return 'No observation yet';
  const pairs = Object.entries(observation)
    .filter(([, v]) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
    .slice(0, 5);

  if (pairs.length === 0) return 'Observation captured';
  return pairs.map(([k, v]) => `${k}: ${v}`).join(' • ');
}

export default function AgentsPanel({ agents }) {
  if (!agents || agents.length === 0) {
    return <div className="card"><h2>AI Agents (What each one is doing)</h2><p>No agents yet.</p></div>;
  }

  return (
    <div className="card">
      <h2>AI Agents (What each one is doing)</h2>
      <div className="agents-grid">
        {agents.map(agent => {
          const pos = agent.positions || {};
          const posStr = Object.entries(pos).map(([t, q]) => `${t}: ${q}`).join(', ') || '—';
          const action = agent.last_action || '—';
          const risk = {
            return_pct: agent.return_pct,
            current_drawdown_pct: agent.current_drawdown_pct,
            max_drawdown_pct: agent.max_drawdown_pct,
            sharpe_ratio: agent.sharpe_ratio,
          };
          const mem = agent.latest_memory || null;
          const perf = agent.performance_stats || {};
          const memAction = mem?.action || {};
          const memDecision = mem?.decision || {};
          const memResult = mem?.result || null;
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
                <span className="label">Available Money</span>
                <span>${agent.cash?.toLocaleString()}</span>
              </div>
              <div className="row">
                <span className="label">Holdings</span>
                <span>{posStr}</span>
              </div>
              <div className="row">
                <span className="label">Total Value</span>
                <span>${agent.portfolio_value?.toLocaleString()}</span>
              </div>
              <div className="row">
                <span className="label">Last Move</span>
                <span>{action}</span>
              </div>
              <div className="row">
                <span className="label">AI Memory Entries</span>
                <span>{agent.memory_size ?? 0}</span>
              </div>

              {/* Risk metrics */}
              <div className="risk-grid">
                <div className="risk-item">
                  <span className="risk-label">Profit %</span>
                  <span style={{ color: riskColor(risk.return_pct) }}>
                    {risk.return_pct != null ? `${risk.return_pct.toFixed(1)}%` : '—'}
                  </span>
                </div>
                <div className="risk-item">
                  <span className="risk-label">Current Drop</span>
                  <span style={{ color: riskColor(risk.current_drawdown_pct) }}>
                    {risk.current_drawdown_pct != null ? `${risk.current_drawdown_pct.toFixed(1)}%` : '—'}
                  </span>
                </div>
                <div className="risk-item">
                  <span className="risk-label">Worst Drop</span>
                  <span style={{ color: riskColor(risk.max_drawdown_pct) }}>
                    {risk.max_drawdown_pct != null ? `${risk.max_drawdown_pct.toFixed(1)}%` : '—'}
                  </span>
                </div>
                <div className="risk-item">
                  <span className="risk-label">Stability</span>
                  <span style={{ color: risk.sharpe_ratio >= 0 ? '#22c55e' : '#ef4444' }}>
                    {risk.sharpe_ratio != null ? risk.sharpe_ratio.toFixed(2) : '—'}
                  </span>
                </div>
              </div>

              <div className="reason">{agent.last_reason || ''}</div>

              <div className="agentic-flow">
                <h4>AI Thinking Flow (latest step)</h4>
                <div className="flow-row">
                  <span className="flow-label">1) Perceive</span>
                  <span className="flow-value">{observationSummary(mem?.observation)}</span>
                </div>
                <div className="flow-row">
                  <span className="flow-label">2) Reason</span>
                  <span className="flow-value">{memDecision.reasoning || agent.last_reasoning || 'No reasoning yet'}</span>
                </div>
                <div className="flow-row">
                  <span className="flow-label">3) Act</span>
                  <span className="flow-value">
                    {(memAction.action || action)}
                    {` • qty: ${memAction.quantity ?? 0}`}
                  </span>
                </div>
                <div className="flow-row">
                  <span className="flow-label">4) Result</span>
                  <span className="flow-value">
                    {memResult
                      ? `reward: ${fmt(memResult.reward, 2)} • pnl: ${fmt(perf.pnl, 2)} • wins/losses: ${perf.wins ?? 0}/${perf.losses ?? 0}`
                      : 'No result yet (run at least one step)'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
