import React from 'react';

const C = {
  green: '#00ff88', red: '#ff3b5c', cyan: '#00d4ff',
  amber: '#ffb800', purple: '#a855f7', muted: '#5a6478',
  text: '#c9d1e0', heading: '#edf0f7',
};

function Bold({ children }) {
  return <span style={{ color: C.heading, fontWeight: 700 }}>{children}</span>;
}

/* ── Pipeline step visual ── */
function PipelineStep({ num, label, color, desc }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{
        flexShrink: 0, width: 32, height: 32, borderRadius: 8,
        background: `${color}15`, border: `1px solid ${color}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 800, color,
        fontFamily: "'JetBrains Mono', monospace",
      }}>{num}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 2, fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
        <div style={{ fontSize: 10, color: C.text, lineHeight: 1.6, fontFamily: "'JetBrains Mono', monospace" }}>{desc}</div>
      </div>
    </div>
  );
}

/* ── Agent mini-card ── */
function AgentRow({ icon, name, accent, desc }) {
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      padding: '10px 12px', borderRadius: 8,
      background: `${accent}06`, border: `1px solid ${accent}18`,
      borderLeft: `3px solid ${accent}`,
    }}>
      <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: accent, fontFamily: "'JetBrains Mono', monospace" }}>{name}</div>
        <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.5, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{desc}</div>
      </div>
    </div>
  );
}

/* ── Shortcut key pill ── */
function Key({ children }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
      fontSize: 10, fontWeight: 600, color: C.text,
      fontFamily: "'JetBrains Mono', monospace",
    }}>{children}</span>
  );
}

export default function HelpPanel() {
  return (
    <>
      {/* ── Hero Card ── */}
      <div className="card" style={{ padding: '24px 22px', textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>◈</div>
        <h2 style={{
          fontSize: 18, fontWeight: 800, margin: '0 0 6px',
          fontFamily: "'Space Grotesk', sans-serif",
          background: `linear-gradient(135deg, ${C.cyan}, ${C.purple})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Multi-Agent Stock Market AI
        </h2>
        <p style={{
          fontSize: 11, color: C.muted, maxWidth: 480, margin: '0 auto', lineHeight: 1.7,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          5 autonomous AI agents trading on real market data, each with unique strategies,
          monitored by a regulatory system that blocks risky manipulation in real-time.
        </p>
      </div>

      {/* ── The 5 Agents ── */}
      <div className="card" style={{ padding: '18px 20px' }}>
        <h2 style={{ marginBottom: 14 }}>⬡ The 5 AI Agents</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
          <AgentRow icon="🛡" name="Conservative" accent={C.cyan}
            desc="Risk-averse. Trades only when volatility is low. Strict stop-losses and small position sizes." />
          <AgentRow icon="🚀" name="Momentum" accent={C.green}
            desc="Trend-follower. Buys above SMA with positive momentum, sells when the trend reverses." />
          <AgentRow icon="↩" name="Mean Reversion" accent={C.purple}
            desc="Contrarian. Buys at Bollinger Band lows, sells at highs — believes prices revert to the mean." />
          <AgentRow icon="🎲" name="Noise Trader" accent={C.amber}
            desc="Random. Adds market noise with small, unpredictable trades at random intervals." />
          <AgentRow icon="🦈" name="Adversarial" accent={C.red}
            desc="Manipulative. Attempts pump-and-dump schemes. The regulator monitors and blocks its trades." />
        </div>
      </div>

      {/* ── AI Pipeline ── */}
      <div className="card" style={{ padding: '18px 20px' }}>
        <h2 style={{ marginBottom: 14 }}>⚡ Perceive → Reason → Act</h2>
        <p style={{ fontSize: 10, color: C.muted, marginBottom: 14, lineHeight: 1.6, fontFamily: "'JetBrains Mono', monospace" }}>
          Every simulation step, each agent runs through a structured cognitive pipeline:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PipelineStep num="1" label="Perceive" color={C.cyan}
            desc="Reads the current market state — price, volume, technical indicators, portfolio balance, and positions." />
          <PipelineStep num="2" label="Reason" color={C.purple}
            desc="Applies its unique strategy logic to analyze the data and decide what to do, generating an explanation." />
          <PipelineStep num="3" label="Act" color={C.amber}
            desc="Executes BUY, SELL, or HOLD. The trade is submitted to the regulator for compliance checking." />
          <PipelineStep num="4" label="Regulate" color={C.red}
            desc="The regulator validates the trade against risk limits. Manipulative or overly risky trades are BLOCKED." />
        </div>
      </div>

      {/* ── Controls + Navigation (side by side) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 0 }}>
        {/* Controls Guide */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <h2 style={{ marginBottom: 12 }}>⇅ Controls Guide</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { key: 'Initialize', desc: 'Fetches real market data via yfinance and sets up all agents with $100K starting capital.', color: C.cyan },
              { key: 'Step', desc: 'Advance by one (or batch) candle. Each agent perceives, reasons, and acts.', color: C.green },
              { key: 'Run / Pause', desc: 'Auto-step through the simulation at your configured delay speed.', color: C.green },
              { key: 'Crash', desc: 'Inject a sudden -15% market crash to stress-test agent resilience.', color: C.red },
              { key: 'Scrubber', desc: 'Drag the slider to jump to any past step and review historical states.', color: C.amber },
              { key: 'Speed / Batch', desc: 'Configure delay between steps (50-1000ms) and steps per tick (1-20).', color: C.muted },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{
                  flexShrink: 0, minWidth: 72,
                  fontSize: 10, fontWeight: 700, color: item.color,
                  fontFamily: "'JetBrains Mono', monospace", paddingTop: 1,
                }}>{item.key}</div>
                <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.5, fontFamily: "'JetBrains Mono', monospace" }}>
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Tabs */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <h2 style={{ marginBottom: 12 }}>◎ Navigation Tabs</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { icon: '⇅', label: 'Trades', desc: 'Chart, live trade notification, trade log & regulation log.', color: C.cyan },
              { icon: '◎', label: 'Market', desc: 'OHLC, technical indicators, volatility meter, session range.', color: C.green },
              { icon: '⬡', label: 'Agents', desc: 'Agent cards, portfolio trends, AI pipeline & trade history.', color: C.purple },
              { icon: '◈', label: 'Stats', desc: 'Leaderboard, risk metrics, performance charts, trading activity.', color: C.amber },
              { icon: '?', label: 'Help', desc: 'You are here! System overview and documentation.', color: C.muted },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 6,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <span style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: `${item.color}12`, border: `1px solid ${item.color}28`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, flexShrink: 0,
                }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: item.color, fontFamily: "'JetBrains Mono', monospace" }}>{item.label}</div>
                  <div style={{ fontSize: 9, color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tech Stack ── */}
      <div className="card" style={{ padding: '18px 20px' }}>
        <h2 style={{ marginBottom: 12 }}>⚙ Tech Stack</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
          {[
            { label: 'Backend', value: 'Python · Flask', sub: 'Simulation engine & agent logic', color: C.green },
            { label: 'Market Data', value: 'yfinance', sub: 'Real OHLCV data from Yahoo Finance', color: C.cyan },
            { label: 'Frontend', value: 'React · Vite', sub: 'Fast SPA with hot reload', color: C.cyan },
            { label: 'Charts', value: 'TradingView v5', sub: 'Lightweight Charts — candles, lines, markers', color: C.amber },
            { label: 'Analytics', value: 'Recharts', sub: 'Portfolio performance & violation charts', color: C.purple },
            { label: 'Database', value: 'SQLite', sub: 'Simulation state, trades & regulation logs', color: C.muted },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '12px 14px', borderRadius: 8,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>{item.label}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: item.color, fontFamily: "'JetBrains Mono', monospace" }}>{item.value}</div>
              <div style={{ fontSize: 9, color: C.muted, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{item.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
