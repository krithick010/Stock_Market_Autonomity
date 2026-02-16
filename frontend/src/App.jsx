import React, { useState, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { initSimulation, stepSimulation, jumpToStep, triggerCrash } from './api/client';
import { useTheme } from './theme/ThemeContext';
import ControlsPanel from './components/ControlsPanel';
import PriceChart from './components/PriceChart';
import AgentsPanel from './components/AgentsPanel';
import TradeLogTable from './components/TradeLogTable';
import RegulationLogTable from './components/RegulationLogTable';
import PerformanceCharts from './components/PerformanceCharts';
import RiskOverviewPanel from './components/RiskOverviewPanel';
import SettingsModal from './components/SettingsModal';
import HealthBar from './components/HealthBar';
import AgentActivityFeed from './components/AgentActivityFeed';
import RunSummaryModal from './components/RunSummaryModal';
import ScenarioPresets from './components/ScenarioPresets';
import InfoPage from './pages/InfoPage';

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
  // ---- Theme ----
  const { theme, toggleTheme } = useTheme();

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

  // ---- Summary modal ----
  const [showSummary, setShowSummary] = useState(false);

  // ---- Scenario ----
  const [activeScenario, setActiveScenario] = useState(null);

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

  // ---- Scenario handler ----
  const handleSelectScenario = useCallback(async (key, config) => {
    setActiveScenario(key);
    setTicker(config.ticker);
    setPeriod(config.period);
    setInterval_(config.interval);
    setActiveAgents(config.activeAgents);
    setSpeedMs(config.speed || 300);
    setError(null);
    if (autoRef.current) { clearInterval(autoRef.current); autoRef.current = null; }
    try {
      const data = await initSimulation(config.ticker, config.period, config.interval, config.activeAgents, agentParams);
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
  }, [agentParams]);

  // ---- Derived data ----
  const step = snapshot?.step ?? 0;
  const maxSteps = snapshot?.max_steps ?? 0;

  // ---- Dashboard content ----
  const dashboard = (
    <div className={`app-container${crashFlash ? ' crash-flash' : ''}`}>
      <header className="app-header">
        <div className="app-header-top">
          <h1>Multi-Agent Stock Market AI Autonomity</h1>
          <div className="header-actions">
            <Link to="/info" className="btn btn-nav">📖 Info / Rules</Link>
            <button className="btn btn-nav theme-toggle" onClick={toggleTheme} title="Toggle theme">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {snapshot && (status === 'paused' || status === 'finished') && (
              <button className="btn btn-nav" onClick={() => setShowSummary(true)}>📊 Summary</button>
            )}
          </div>
        </div>
        <p>Simulated financial ecosystem with autonomous trading agents, regulation &amp; full audit trail</p>
      </header>

      <HealthBar snapshot={snapshot} />

      {error && <div className="error-banner">⚠ {error}</div>}

      <div className="main-grid">
        {/* Left sidebar – controls */}
        <div className="left-sidebar">
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

          <ScenarioPresets
            onSelectScenario={handleSelectScenario}
            activeScenario={activeScenario}
          />
        </div>

        {/* Right – charts & data */}
        <div className="right-panel">
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

          <AgentsPanel agents={snapshot?.agents} activeAgents={activeAgents} />

          <AgentActivityFeed tradeLog={snapshot?.trade_log} agents={snapshot?.agents} />

          <PerformanceCharts
            agents={snapshot?.agents}
            tradeLog={snapshot?.trade_log}
            regulationLog={snapshot?.regulation_log}
          />

          <TradeLogTable tradeLog={snapshot?.trade_log} />

          <RegulationLogTable regulationLog={snapshot?.regulation_log} />
        </div>
      </div>

      {showSettings && (
        <SettingsModal
          agentParams={agentParams}
          setAgentParams={setAgentParams}
          defaultParams={DEFAULT_PARAMS}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showSummary && (
        <RunSummaryModal
          snapshot={snapshot}
          onClose={() => setShowSummary(false)}
        />
      )}
    </div>
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={dashboard} />
        <Route path="/info" element={<InfoPage />} />
      </Routes>
    </BrowserRouter>
  );
}
