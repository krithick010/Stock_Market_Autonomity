import React, { useState, useRef, useCallback, useEffect } from 'react';
import { initSimulation, stepSimulation, jumpToStep, triggerCrash } from './api/client';
import ControlsPanel from './components/ControlsPanel';
import PriceChart from './components/PriceChart';
import AgentsPanel from './components/AgentsPanel';
import TradeLogTable from './components/TradeLogTable';
import RegulationLogTable from './components/RegulationLogTable';
import PerformanceCharts from './components/PerformanceCharts';
import RiskOverviewPanel from './components/RiskOverviewPanel';
import SettingsModal from './components/SettingsModal';

const ALL_AGENTS = [
  { key: 'conservative', label: 'Conservative' },
  { key: 'momentum', label: 'Momentum' },
  { key: 'meanreversion', label: 'MeanReversion' },
  { key: 'noisetrader', label: 'NoiseTrader' },
  { key: 'adversarial', label: 'Adversarial' },
];

const DEFAULT_PARAMS = {
  conservative: { risk_pct: 0.07, stop_loss_pct: 0.03, volatility_threshold: 0.02 },
  momentum: { position_size_pct: 0.15 },
  meanreversion: { position_size_pct: 0.12, band_multiplier: 2.0 },
  noisetrader: { trade_probability: 0.15, position_size_pct: 0.02 },
  adversarial: { pump_fraction: 0.25, dump_threshold: 0.03, volume_low_pctile: 0.30, pump_probability: 0.20 },
};

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${theme}`);
  }, [theme]);

  // ---- Control state ----
  const [ticker, setTicker] = useState('AAPL');
  const [period, setPeriod] = useState('5d');
  const [interval_, setInterval_] = useState('5m');

  // ---- Agent config ----
  const [activeAgents, setActiveAgents] = useState(ALL_AGENTS.map(a => a.key));
  const [agentParams, setAgentParams] = useState(JSON.parse(JSON.stringify(DEFAULT_PARAMS)));
  const [showSettings, setShowSettings] = useState(false);

  // ---- Speed Control ----
  const [speedMs, setSpeedMs] = useState(300); // ms per step
  const [batchSize, setBatchSize] = useState(1); // steps per tick

  // ---- Simulation snapshot ----
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState(null);

  // ---- Run state ----
  const [status, setStatus] = useState('idle'); // idle | paused | running | finished
  const autoRef = useRef(null);

  // ---- Crash flash ----
  const [crashFlash, setCrashFlash] = useState(false);

  // ---- Highlight step for scrubber ----
  const [highlightStep, setHighlightStep] = useState(null);

  // ---- Handlers ----

  const handleInit = useCallback(async () => {
    setError(null);
    if (autoRef.current) { clearInterval(autoRef.current); autoRef.current = null; }
    try {
      const data = await initSimulation(ticker, period, interval_, activeAgents, agentParams);
      if (data.error) {
        setError(data.error);
        setStatus('idle');
      } else {
        setSnapshot(data);
        setStatus('paused');
        setHighlightStep(null);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setStatus('idle');
    }
  }, [ticker, period, interval_, activeAgents, agentParams]);

  const handleStep = useCallback(async () => {
    setError(null);
    try {
      const data = await stepSimulation(batchSize);
      if (data.error) { setError(data.error); return; }
      setSnapshot(data);
      if (data.finished) {
        setStatus('finished');
        if (autoRef.current) { clearInterval(autoRef.current); autoRef.current = null; }
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }, [batchSize]);

  const handleAutoRun = useCallback(() => {
    setStatus('running');
    autoRef.current = setInterval(async () => {
      try {
        const data = await stepSimulation(batchSize);
        if (data.error) {
          clearInterval(autoRef.current); autoRef.current = null;
          setError(data.error); setStatus('paused');
          return;
        }
        setSnapshot(data);
        if (data.finished) {
          clearInterval(autoRef.current); autoRef.current = null;
          setStatus('finished');
        }
      } catch (err) {
        clearInterval(autoRef.current); autoRef.current = null;
        setError(err.response?.data?.error || err.message);
        setStatus('paused');
      }
    }, speedMs);
  }, [speedMs, batchSize]);

  const handlePause = useCallback(() => {
    if (autoRef.current) { clearInterval(autoRef.current); autoRef.current = null; }
    setStatus('paused');
  }, []);

  const handleJump = useCallback(async (targetStep) => {
    setError(null);
    if (autoRef.current) { clearInterval(autoRef.current); autoRef.current = null; setStatus('paused'); }
    try {
      const data = await jumpToStep(targetStep);
      if (data.error) { setError(data.error); return; }
      setSnapshot(data);
      setHighlightStep(targetStep);
      if (data.finished) setStatus('finished');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }, []);

  const handleCrash = useCallback(async () => {
    setError(null);
    try {
      const data = await triggerCrash();
      if (data.error) { setError(data.error); return; }
      setSnapshot(data);
      setCrashFlash(true);
      setTimeout(() => setCrashFlash(false), 1200);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }, []);

  const toggleAgent = (key) => {
    setActiveAgents(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // ---- Derived data ----
  const step = snapshot?.step ?? 0;
  const maxSteps = snapshot?.max_steps ?? 0;

  return (
    <div className={`app-container theme-${theme}${crashFlash ? ' crash-flash' : ''}`}>
      <header className="app-header terminal-topbar">
        <div className="header-row">
          <div>
            <h1>Multi-Agent Stock Market AI Autonomity</h1>
            <p>Simulated financial ecosystem with autonomous trading agents, regulation &amp; full audit trail</p>
          </div>
          <button
            className="btn btn-theme"
            onClick={() => setTheme(prev => (prev === 'light' ? 'dark' : 'light'))}
            aria-label="Toggle light and dark mode"
          >
            {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
        </div>
      </header>

      {error && <div className="error-banner">⚠ {error}</div>}

      <div className="terminal-layout">
        <aside className="left-rail">
          <section className="card beginner-guide" aria-label="Beginner Guide">
            <h2>New here? Read this first</h2>
            <ul>
              <li>Click <strong>Initialize Market</strong> to load data and start the simulation.</li>
              <li>Use <strong>Run One Step</strong> to see one decision cycle at a time, or <strong>Auto Run</strong> for continuous play.</li>
              <li>In each AI card, read <strong>AI Thinking Flow</strong>: Perceive → Reason → Act → Result.</li>
              <li><strong>Profit %</strong> and <strong>Current Drop</strong> show how each strategy is performing right now.</li>
              <li><strong>AI Memory Entries</strong> tells you how many decision records that agent has stored.</li>
            </ul>
          </section>
        </aside>

        <main className="terminal-center">
          <PriceChart
            priceHistory={snapshot?.price_history}
            tradesAtStep={snapshot?.trades_at_step}
            tradeLog={snapshot?.trade_log}
            highlightStep={highlightStep}
            onJump={handleJump}
            maxSteps={maxSteps}
            currentStep={step}
          />

          <RiskOverviewPanel systemRisk={snapshot?.system_risk} />

          <AgentsPanel agents={snapshot?.agents} />

          <PerformanceCharts
            agents={snapshot?.agents}
            tradeLog={snapshot?.trade_log}
            regulationLog={snapshot?.regulation_log}
          />

          <TradeLogTable tradeLog={snapshot?.trade_log} />

          <RegulationLogTable regulationLog={snapshot?.regulation_log} />
        </main>

        <aside className="terminal-right-panel">
          <ControlsPanel
            ticker={ticker} setTicker={setTicker}
            period={period} setPeriod={setPeriod}
            interval={interval_} setInterval_={setInterval_}
            onInit={handleInit}
            onStep={handleStep}
            onAutoRun={handleAutoRun}
            onPause={handlePause}
            onCrash={handleCrash}
            status={status}
            step={step}
            maxSteps={maxSteps}
            speedMs={speedMs} setSpeedMs={setSpeedMs}
            batchSize={batchSize} setBatchSize={setBatchSize}
            activeAgents={activeAgents}
            allAgents={ALL_AGENTS}
            toggleAgent={toggleAgent}
            onOpenSettings={() => setShowSettings(true)}
            crashActive={snapshot?.crash_active}
          />
        </aside>
      </div>

      {showSettings && (
        <SettingsModal
          agentParams={agentParams}
          setAgentParams={setAgentParams}
          defaultParams={DEFAULT_PARAMS}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
