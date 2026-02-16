import React, { useMemo } from 'react';

export default function RunSummaryModal({ snapshot, onClose }) {
  if (!snapshot) return null;

  const agents = snapshot.agents || [];
  const tradeLog = snapshot.trade_log || [];
  const regulationLog = snapshot.regulation_log || [];
  const systemRisk = snapshot.system_risk || {};

  const totalTrades = tradeLog.length;
  const totalViolations = regulationLog.filter(r => r.decision === 'BLOCK' || r.decision === 'WARN').length;
  const blockedTrades = tradeLog.filter(t => t.regulator_decision === 'BLOCK').length;
  const crashTriggered = snapshot.crash_active || tradeLog.some(t => t.agent_reason?.includes('crash'));
  const circuitBreakerActive = (systemRisk.circuit_breakers_active ?? 0) > 0;

  // Per-agent violation counts
  const violationsByAgent = useMemo(() => {
    const counts = {};
    for (const r of regulationLog) {
      counts[r.agent_name] = (counts[r.agent_name] || 0) + 1;
    }
    return counts;
  }, [regulationLog]);

  // Find best/worst agents
  const sorted = [...agents].sort((a, b) => (b.risk_metrics?.return_pct ?? 0) - (a.risk_metrics?.return_pct ?? 0));
  const bestAgent = sorted[0];
  const worstAgent = sorted[sorted.length - 1];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content summary-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Run Summary</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Global Stats */}
        <div className="summary-global">
          <div className="summary-stat">
            <div className="summary-stat-value">{snapshot.step ?? 0}</div>
            <div className="summary-stat-label">Steps Completed</div>
          </div>
          <div className="summary-stat">
            <div className="summary-stat-value">{totalTrades}</div>
            <div className="summary-stat-label">Total Trades</div>
          </div>
          <div className="summary-stat">
            <div className="summary-stat-value" style={{ color: totalViolations > 0 ? '#eab308' : '#22c55e' }}>
              {totalViolations}
            </div>
            <div className="summary-stat-label">Violations</div>
          </div>
          <div className="summary-stat">
            <div className="summary-stat-value" style={{ color: blockedTrades > 0 ? '#ef4444' : '#22c55e' }}>
              {blockedTrades}
            </div>
            <div className="summary-stat-label">Blocked Trades</div>
          </div>
          <div className="summary-stat">
            <div className="summary-stat-value" style={{ color: crashTriggered ? '#ef4444' : '#22c55e' }}>
              {crashTriggered ? 'YES' : 'NO'}
            </div>
            <div className="summary-stat-label">Crash Triggered</div>
          </div>
          <div className="summary-stat">
            <div className="summary-stat-value" style={{ color: circuitBreakerActive ? '#ef4444' : '#22c55e' }}>
              {circuitBreakerActive ? 'YES' : 'NO'}
            </div>
            <div className="summary-stat-label">Circuit Breaker</div>
          </div>
        </div>

        {/* Per-agent Table */}
        <h3 style={{ margin: '16px 0 8px', color: 'var(--text-color)' }}>Agent Performance</h3>
        <div className="log-table-wrapper" style={{ maxHeight: '300px' }}>
          <table className="log-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Return %</th>
                <th>Max Drawdown %</th>
                <th>Sharpe Ratio</th>
                <th>Portfolio Value</th>
                <th>Violations</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a, i) => {
                const risk = a.risk_metrics || {};
                const ret = risk.return_pct ?? 0;
                return (
                  <tr key={i}>
                    <td><strong>{a.name}</strong></td>
                    <td style={{ color: ret >= 0 ? '#22c55e' : '#ef4444' }}>
                      {ret >= 0 ? '+' : ''}{ret.toFixed(2)}%
                    </td>
                    <td style={{ color: (risk.max_drawdown_pct ?? 0) < -5 ? '#ef4444' : '#eab308' }}>
                      {risk.max_drawdown_pct != null ? `${risk.max_drawdown_pct.toFixed(2)}%` : '—'}
                    </td>
                    <td style={{ color: (risk.sharpe_ratio ?? 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                      {risk.sharpe_ratio != null ? risk.sharpe_ratio.toFixed(2) : '—'}
                    </td>
                    <td>${a.portfolio_value?.toLocaleString()}</td>
                    <td style={{ color: (violationsByAgent[a.name] || 0) > 0 ? '#eab308' : '#22c55e' }}>
                      {violationsByAgent[a.name] || 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Winner / Loser callout */}
        {agents.length > 1 && (
          <div className="summary-callouts">
            {bestAgent && (
              <div className="summary-callout best">
                🏆 Best: <strong>{bestAgent.name}</strong> ({(bestAgent.risk_metrics?.return_pct ?? 0).toFixed(2)}%)
              </div>
            )}
            {worstAgent && (
              <div className="summary-callout worst">
                📉 Worst: <strong>{worstAgent.name}</strong> ({(worstAgent.risk_metrics?.return_pct ?? 0).toFixed(2)}%)
              </div>
            )}
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
