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

export default function StatsPanel({ agents, tradeLog, regulationLog }) {
  const summary = useMemo(() => {
    if (!agents?.length) return null;

    const totalTrades = tradeLog?.filter(t => t.action === 'BUY' || t.action === 'SELL').length ?? 0;
    const buys = tradeLog?.filter(t => t.action === 'BUY').length ?? 0;
    const sells = tradeLog?.filter(t => t.action === 'SELL').length ?? 0;
    const blocked = tradeLog?.filter(t => t.regulator_decision === 'BLOCK').length ?? 0;
    const violations = regulationLog?.length ?? 0;

    const totalAUM = agents.reduce((s, a) => s + (a.portfolio_value || 0), 0);
    const totalCash = agents.reduce((s, a) => s + (a.cash || 0), 0);

    const bestAgent = agents.reduce((best, a) =>
      (a.return_pct ?? -Infinity) > (best.return_pct ?? -Infinity) ? a : best, agents[0]);
    const worstAgent = agents.reduce((worst, a) =>
      (a.return_pct ?? Infinity) < (worst.return_pct ?? Infinity) ? a : worst, agents[0]);

    const avgReturn = agents.reduce((s, a) => s + (a.return_pct || 0), 0) / agents.length;
    const avgSharpe = agents.reduce((s, a) => s + (a.sharpe_ratio || 0), 0) / agents.length;
    const maxDD = Math.min(...agents.map(a => a.max_drawdown_pct ?? 0));

    return {
      totalTrades, buys, sells, blocked, violations,
      totalAUM, totalCash,
      bestAgent, worstAgent,
      avgReturn, avgSharpe, maxDD,
      agentCount: agents.length,
    };
  }, [agents, tradeLog, regulationLog]);

  if (!summary) {
    return (
      <div className="card">
        <h2>◈ Statistics</h2>
        <p style={{ color: C.muted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
          Initialize a simulation to see statistics.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Overview Summary */}
      <div className="card" style={{ padding: '16px 18px' }}>
        <h2 style={{ marginBottom: 14 }}>◈ Simulation Summary</h2>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
          marginBottom: 16,
        }}>
          {[
            { label: 'Total AUM', value: `₹${Math.round(summary.totalAUM).toLocaleString()}`, color: C.cyan },
            { label: 'Cash Reserves', value: `₹${Math.round(summary.totalCash).toLocaleString()}`, color: C.text },
            { label: 'Active Agents', value: summary.agentCount, color: C.purple },
          ].map(item => (
            <div key={item.label} style={{
              padding: '10px 12px', borderRadius: 6,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: item.color, fontFamily: "'JetBrains Mono', monospace" }}>{item.value}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Trading Activity */}
      <div className="card" style={{ padding: '16px 18px' }}>
        <h2 style={{ marginBottom: 12 }}>Trading Activity</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { label: 'Total Trades', value: summary.totalTrades, color: C.text },
            { label: 'Buys', value: summary.buys, color: C.green },
            { label: 'Sells', value: summary.sells, color: C.red },
            { label: 'Blocked', value: summary.blocked, color: C.amber },
          ].map(item => (
            <div key={item.label} style={{
              padding: '10px 12px', borderRadius: 6,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: item.color, fontFamily: "'JetBrains Mono', monospace" }}>{item.value}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* Buy/Sell ratio bar */}
        {summary.totalTrades > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.muted, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>
              <span>Buys {((summary.buys / summary.totalTrades) * 100).toFixed(0)}%</span>
              <span>Sells {((summary.sells / summary.totalTrades) * 100).toFixed(0)}%</span>
            </div>
            <div style={{ display: 'flex', height: 4, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${(summary.buys / summary.totalTrades) * 100}%`, background: C.green, transition: 'width 0.3s' }} />
              <div style={{ flex: 1, background: C.red }} />
            </div>
          </div>
        )}
      </div>

      {/* Agent Leaderboard */}
      <div className="card" style={{ padding: '16px 18px' }}>
        <h2 style={{ marginBottom: 12 }}>Agent Leaderboard</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[...( agents || [] )]
            .sort((a, b) => (b.return_pct ?? 0) - (a.return_pct ?? 0))
            .map((agent, idx) => {
              const ret = agent.return_pct ?? 0;
              const isPositive = ret >= 0;
              const medals = ['🥇', '🥈', '🥉'];
              return (
                <div key={agent.name} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 6,
                  background: idx === 0 ? 'rgba(0,255,136,0.06)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${idx === 0 ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.06)'}`,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  <span style={{ fontSize: 14, width: 22, textAlign: 'center' }}>
                    {medals[idx] || <span style={{ color: C.muted, fontSize: 11 }}>{idx + 1}</span>}
                  </span>
                  <span style={{ flex: 1, fontSize: 12, color: C.text, fontWeight: 600 }}>{agent.name}</span>
                  <span style={{ fontSize: 11, color: isPositive ? C.green : C.red, fontWeight: 700 }}>
                    {isPositive ? '+' : ''}{fmt(ret, 1)}%
                  </span>
                  <span style={{ fontSize: 10, color: C.muted, minWidth: 70, textAlign: 'right' }}>
                    ₹{Math.round(agent.portfolio_value || 0).toLocaleString()}
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Risk Aggregate */}
      <div className="card" style={{ padding: '16px 18px' }}>
        <h2 style={{ marginBottom: 12 }}>Risk Metrics</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { label: 'Avg Return', value: `${fmt(summary.avgReturn, 1)}%`, color: summary.avgReturn >= 0 ? C.green : C.red },
            { label: 'Avg Sharpe', value: fmt(summary.avgSharpe), color: summary.avgSharpe >= 0 ? C.green : C.red },
            { label: 'Max Drawdown', value: `${fmt(summary.maxDD, 1)}%`, color: summary.maxDD < -5 ? C.red : C.amber },
            { label: 'Violations', value: summary.violations, color: summary.violations > 0 ? C.amber : C.green },
            { label: 'Best Agent', value: summary.bestAgent?.name || '—', color: C.green },
            { label: 'Worst Agent', value: summary.worstAgent?.name || '—', color: C.red },
          ].map(item => (
            <div key={item.label} style={{
              padding: '8px 10px', borderRadius: 6,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: item.color, fontFamily: "'JetBrains Mono', monospace" }}>{item.value}</div>
              <div style={{ fontSize: 9, color: C.muted, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
