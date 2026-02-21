import React, { useState, useMemo } from 'react';

export default function TradeLogTable({ tradeLog }) {
  const [filterAgent, setFilterAgent] = useState('ALL');

  const agents = useMemo(() => {
    const set = new Set(tradeLog?.map(t => t.agent_name) || []);
    return ['ALL', ...Array.from(set)];
  }, [tradeLog]);

  if (!tradeLog || tradeLog.length === 0) {
    return <div className="card"><h2>Trade Log</h2><p>No trades yet.</p></div>;
  }

  const filtered = filterAgent === 'ALL'
    ? tradeLog
    : tradeLog.filter(t => t.agent_name === filterAgent);

  // Show the latest 100 entries (most recent first)
  const display = filtered.slice(-100).reverse();

  const decClass = (d) =>
    d === 'APPROVE' ? 'decision-approve' :
    d === 'WARN'    ? 'decision-warn' :
    d === 'BLOCK'   ? 'decision-block' : '';

  return (
    <div className="card">
      <h2>Trade Log</h2>
      <div className="filter-row">
        <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)}>
          {agents.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <div className="log-table-wrapper">
        <table className="log-table">
          <thead>
            <tr>
              <th>Step</th>
              <th>Agent</th>
              <th>Action</th>
              <th>Price</th>
              <th>Qty</th>
              <th>Portfolio</th>
              <th>Reason</th>
              <th>Decision</th>
              <th>Reg. Reason</th>
            </tr>
          </thead>
          <tbody>
            {display.map((t, i) => (
              <tr key={i}>
                <td>{t.step}</td>
                <td>{t.agent_name}</td>
                <td>{t.action}</td>
                <td>{t.price}</td>
                <td>{t.quantity}</td>
                <td>₹{t.portfolio_value?.toLocaleString()}</td>
                <td title={t.agent_reason}>{t.agent_reason?.slice(0, 60)}</td>
                <td className={decClass(t.regulator_decision)}>{t.regulator_decision}</td>
                <td title={t.regulator_reason}>{t.regulator_reason?.slice(0, 50)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
