import React from 'react';
import { Link } from 'react-router-dom';

export default function InfoPage() {
  return (
    <div className="info-page">
      <div className="info-header">
        <Link to="/" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>← Back to Dashboard</Link>
        <h1>Info &amp; Rules</h1>
        <p>Everything you need to know about the Multi-Agent Stock Market AI simulation.</p>
      </div>

      {/* ── Market & Data ── */}
      <section className="info-section card">
        <h2>📈 Market &amp; Data</h2>
        <ul>
          <li><strong>Ticker</strong> — A stock symbol representing a publicly traded company (e.g. AAPL = Apple, INFY = Infosys, TSLA = Tesla).</li>
          <li><strong>Period</strong> — How far back to fetch historical data (1d, 5d, 1mo, 3mo).</li>
          <li><strong>Interval</strong> — The candle size / time-step granularity (1m, 5m, 15m, 1h, 1d).</li>
          <li><strong>Historical vs Simulated</strong> — The simulation replays real historical OHLCV bars. Agents trade on top of this real price feed, creating a realistic but sandboxed environment.</li>
        </ul>
      </section>

      {/* ── Agents ── */}
      <section className="info-section card">
        <h2>🤖 Agents</h2>
        <p>Five autonomous trading agents compete and cooperate in the market:</p>
        <div className="info-agents-grid">
          <div className="info-agent-card">
            <h3>Conservative</h3>
            <span className="info-tag">Low Risk</span>
            <p>Preserves capital. Only enters positions when volatility is below a threshold and uses tight stop-losses. Ideal for stable markets.</p>
          </div>
          <div className="info-agent-card">
            <h3>Momentum</h3>
            <span className="info-tag">Trend-Following</span>
            <p>Buys when short-term SMA crosses above long-term SMA (uptrend) and sells on the crossover down. Rides the wave.</p>
          </div>
          <div className="info-agent-card">
            <h3>MeanReversion</h3>
            <span className="info-tag">Counter-Trend</span>
            <p>Uses Bollinger Bands: buys when price dips below the lower band (oversold), sells when it exceeds the upper band (overbought).</p>
          </div>
          <div className="info-agent-card">
            <h3>NoiseTrader</h3>
            <span className="info-tag">Random</span>
            <p>Trades randomly with low probability and tiny size. Simulates retail noise and provides market liquidity.</p>
          </div>
          <div className="info-agent-card">
            <h3>Adversarial</h3>
            <span className="info-tag">Manipulator</span>
            <p>Attempts pump-and-dump schemes: accumulates stock quietly, then dumps. Designed to test the regulator&apos;s detection capabilities.</p>
          </div>
        </div>
      </section>

      {/* ── Regulator Rules ── */}
      <section className="info-section card">
        <h2>⚖️ Regulator Rules</h2>
        <p>An autonomous regulator monitors all trades in real-time and enforces these rules:</p>
        <div className="info-rules-list">
          <div className="info-rule">
            <h4>MaxPositionLimit</h4>
            <p>No agent may hold more than a set % of available shares. <em>Real-world analogy: SEC position limits prevent market cornering.</em></p>
          </div>
          <div className="info-rule">
            <h4>BurstTrading / Spoofing Detection</h4>
            <p>If an agent submits too many large orders in a short window, it&apos;s flagged. <em>Analogy: detecting &quot;quote stuffing&quot; on exchanges.</em></p>
          </div>
          <div className="info-rule">
            <h4>ManipulationPattern / Whale Dump</h4>
            <p>Detects pump-and-dump patterns — large accumulation followed by rapid selling. <em>Analogy: SEC market manipulation enforcement.</em></p>
          </div>
          <div className="info-rule">
            <h4>CircuitBreaker / Trading Halt</h4>
            <p>If the market drops too fast (e.g. −10% in a short period), all trading is halted. <em>Analogy: NYSE circuit breakers that pause trading during flash crashes.</em></p>
          </div>
        </div>
        <p style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Decisions: <span className="decision-approve">APPROVE</span> · <span className="decision-warn">WARN</span> · <span className="decision-block">BLOCK</span>
        </p>
      </section>

      {/* ── Simulation Controls ── */}
      <section className="info-section card">
        <h2>🎮 Simulation Controls</h2>
        <ul>
          <li><strong>Start / Re-init</strong> — Fetches fresh market data and resets all agents to starting capital.</li>
          <li><strong>Step</strong> — Advances the simulation by one (or N) time-steps manually.</li>
          <li><strong>Auto-Run</strong> — Continuously steps at the chosen speed until paused or finished.</li>
          <li><strong>Speed Slider</strong> — Controls milliseconds between auto-steps (50ms = fast, 1000ms = slow).</li>
          <li><strong>Batch Size</strong> — Number of steps processed per tick (higher = faster but less granular).</li>
          <li><strong>💥 Trigger Crash</strong> — Injects a sudden −15% to −30% market crash. Tests agent resilience and triggers circuit breakers.</li>
          <li><strong>Pause</strong> — Halts auto-run; you can resume or step manually.</li>
          <li><strong>Scenario Presets</strong> — One-click setups for common demo scenarios.</li>
        </ul>
      </section>

      {/* ── Metrics ── */}
      <section className="info-section card">
        <h2>📊 Metrics &amp; Abbreviations</h2>
        <div className="info-metrics-grid">
          <div><strong>P&amp;L</strong> — Profit &amp; Loss. Gain or loss from initial capital.</div>
          <div><strong>Return %</strong> — Percentage return on initial investment.</div>
          <div><strong>Drawdown</strong> — Peak-to-trough decline in portfolio value (worst losing streak).</div>
          <div><strong>Max DD</strong> — Maximum drawdown encountered during the run.</div>
          <div><strong>Sharpe Ratio</strong> — Risk-adjusted return. &gt;1 = good, &gt;2 = excellent, &lt;0 = losing money.</div>
          <div><strong>AUM</strong> — Assets Under Management. Total portfolio value across all agents.</div>
          <div><strong>SMA</strong> — Simple Moving Average (SMA20 = 20-period, SMA50 = 50-period).</div>
          <div><strong>BB</strong> — Bollinger Bands. Volatility envelope around SMA (upper/lower bands).</div>
          <div><strong>Exposure %</strong> — Percentage of capital currently invested (not in cash).</div>
          <div><strong>OHLCV</strong> — Open, High, Low, Close, Volume — standard candle data.</div>
        </div>
      </section>
    </div>
  );
}
