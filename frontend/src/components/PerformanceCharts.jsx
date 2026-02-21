import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  CartesianGrid, BarChart, Bar,
} from 'recharts';

const COLORS = ['#00d4ff', '#00ff88', '#ffb800', '#a855f7', '#ff3b5c'];

export default function PerformanceCharts({ agents, tradeLog, regulationLog }) {
  // --- Portfolio value over time (multi-line) ---
  const portfolioData = useMemo(() => {
    if (!agents || agents.length === 0) return [];
    // We only have the latest portfolio_value per agent in the snapshot,
    // but the trade_log has per-step values we can reconstruct from.
    // Build from trade_log: group by step, collect portfolio_value per agent.
    if (!tradeLog || tradeLog.length === 0) return [];

    const byStep = {};
    for (const t of tradeLog) {
      if (!byStep[t.step]) byStep[t.step] = { step: t.step };
      byStep[t.step][t.agent_name] = t.portfolio_value;
    }
    return Object.values(byStep).sort((a, b) => a.step - b.step);
  }, [tradeLog, agents]);

  // --- Violations per agent (bar chart) ---
  const violationData = useMemo(() => {
    if (!regulationLog || regulationLog.length === 0) return [];
    const counts = {};
    for (const r of regulationLog) {
      counts[r.agent_name] = (counts[r.agent_name] || 0) + 1;
    }
    return Object.entries(counts).map(([name, count]) => ({ name, violations: count }));
  }, [regulationLog]);

  const agentNames = agents?.map(a => a.name) || [];

  return (
    <div className="charts-row">
      {/* Portfolio value over time */}
      <div className="card">
        <h2>Portfolio Performance</h2>
        {portfolioData.length === 0 ? (
          <p>No data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={portfolioData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="step" tick={{ fill: '#5a6478', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} />
              <YAxis domain={['auto', 'auto']} tick={{ fill: '#5a6478', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} />
              <Tooltip contentStyle={{ background: 'rgba(14,17,28,0.95)', border: '1px solid rgba(0,212,255,0.2)', fontSize: 12, borderRadius: 8, fontFamily: 'JetBrains Mono, monospace' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {agentNames.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={COLORS[i % COLORS.length]}
                  dot={false}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Violations per agent */}
      <div className="card">
        <h2>Regulatory Violations</h2>
        {violationData.length === 0 ? (
          <p>No violations yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={violationData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#5a6478', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} />
              <YAxis tick={{ fill: '#5a6478', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} />
              <Tooltip contentStyle={{ background: 'rgba(14,17,28,0.95)', border: '1px solid rgba(0,212,255,0.2)', fontSize: 12, borderRadius: 8, fontFamily: 'JetBrains Mono, monospace' }} />
              <Bar dataKey="violations" fill="#ff3b5c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
