import React, { useMemo } from 'react';

export default function AgentActivityFeed({ tradeLog, agents }) {
  const recentActions = useMemo(() => {
    if (!tradeLog || tradeLog.length === 0) return [];
    // Get last 30 trades, most recent first
    return tradeLog.slice(-30).reverse().map(t => ({
      step: t.step,
      agent: t.agent_name,
      action: t.action,
      price: t.price,
      quantity: t.quantity,
      reason: t.agent_reason || '',
      decision: t.regulator_decision,
    }));
  }, [tradeLog]);

  // Also add HOLD agents from current snapshot
  const agentStatuses = useMemo(() => {
    if (!agents) return [];
    return agents
      .filter(a => a.last_action?.type === 'HOLD')
      .map(a => ({
        step: null,
        agent: a.name,
        action: 'HOLD',
        price: null,
        quantity: null,
        reason: a.last_reason || '',
        decision: null,
      }));
  }, [agents]);

  const actionColor = (action) => {
    if (action === 'BUY') return '#22c55e';
    if (action === 'SELL') return '#ef4444';
    return '#6b7280';
  };

  const allItems = recentActions.length > 0 ? recentActions : agentStatuses;

  if (allItems.length === 0) {
    return (
      <div className="card">
        <h2>Agent Activity Feed</h2>
        <p>No activity yet.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Agent Activity Feed</h2>
      <div className="activity-feed">
        {allItems.slice(0, 20).map((item, i) => (
          <div className="activity-item" key={i}>
            <span className="activity-action" style={{ color: actionColor(item.action) }}>
              {item.action}
            </span>
            <span className="activity-detail">
              {item.step != null && <span className="activity-step">Step {item.step}</span>}
              <strong>{item.agent}</strong>
              {item.action !== 'HOLD' && item.quantity != null && (
                <> — {item.quantity} @ ${parseFloat(item.price).toFixed(2)}</>
              )}
            </span>
            {item.reason && (
              <span className="activity-reason" title={item.reason}>
                {item.reason.slice(0, 80)}
              </span>
            )}
            {item.decision === 'BLOCK' && (
              <span className="activity-blocked">BLOCKED</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
