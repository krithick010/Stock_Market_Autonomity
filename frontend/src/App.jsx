import React, { useState, useRef, useCallback, useEffect } from 'react';
import { initSimulation, stepSimulation, jumpToStep, triggerCrash } from './api/client';
import TopBar from './components/TopBar';
import LeftSidebar from './components/LeftSidebar';
import RightTradePanel from './components/RightTradePanel';
import PriceChart from './components/PriceChart';
import AgentsPanel from './components/AgentsPanel';
import TradeLogTable from './components/TradeLogTable';
import RegulationLogTable from './components/RegulationLogTable';
import PerformanceCharts from './components/PerformanceCharts';
import RiskOverviewPanel from './components/RiskOverviewPanel';
import SettingsModal from './components/SettingsModal';
import MarketPanel from './components/MarketPanel';
import StatsPanel from './components/StatsPanel';
import HelpPanel from './components/HelpPanel';

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
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

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

  // ---- Max step ever reached (caps the scrubber) ----
  const [maxReachedStep, setMaxReachedStep] = useState(0);

  // ---- Active sidebar tab ----
  const [activeTab, setActiveTab] = useState('trades');

  // ---- Jump lock (prevent overlapping jump calls) ----
  const jumpingRef = useRef(false);

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
        setMaxReachedStep(0);
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
      setMaxReachedStep(prev => Math.max(prev, data.step ?? 0));
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
        setMaxReachedStep(prev => Math.max(prev, data.step ?? 0));
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
    // Block jumps beyond the highest step ever reached
    if (targetStep > maxReachedStep) return;
    // Block concurrent jumps
    if (jumpingRef.current) return;
    jumpingRef.current = true;
    if (autoRef.current) { clearInterval(autoRef.current); autoRef.current = null; setStatus('paused'); }
    try {
      const data = await jumpToStep(targetStep);
      if (data.error) { setError(data.error); return; }
      setSnapshot(data);
      setHighlightStep(targetStep);
      if (data.finished) setStatus('finished');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      jumpingRef.current = false;
    }
  }, [maxReachedStep]);

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

  // Calculate total balance from all agents
  const totalBalance = snapshot?.agents?.reduce((sum, agent) => sum + (agent.portfolio_value || 0), 0) || 0;

  return (
    <div className={`app-container theme-${theme}${crashFlash ? ' crash-flash' : ''}`}>
      <TopBar
        ticker={ticker}
        setTicker={setTicker}
        period={period}
        setPeriod={setPeriod}
        theme={theme}
        setTheme={setTheme}
        balance={totalBalance}
        crashActive={snapshot?.crash_active}
      />

      {error && <div className="error-banner">⚠ {error}</div>}

      <div className="olymp-layout">
        <LeftSidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="olymp-center">
          {/* ── TRADES TAB (default) ── */}
          {activeTab === 'trades' && (
            <>
              <PriceChart
                priceHistory={snapshot?.price_history}
                tradesAtStep={snapshot?.trades_at_step}
                tradeLog={snapshot?.trade_log}
                highlightStep={highlightStep}
                onJump={handleJump}
                maxSteps={maxSteps}
                currentStep={step}
                maxReachedStep={maxReachedStep}
              />
              <TradeLogTable tradeLog={snapshot?.trade_log} />
              <RegulationLogTable regulationLog={snapshot?.regulation_log} />
            </>
          )}

          {/* ── MARKET TAB ── */}
          {activeTab === 'market' && (
            <>
              <PriceChart
                priceHistory={snapshot?.price_history}
                tradesAtStep={snapshot?.trades_at_step}
                tradeLog={snapshot?.trade_log}
                highlightStep={highlightStep}
                onJump={handleJump}
                maxSteps={maxSteps}
                currentStep={step}
                maxReachedStep={maxReachedStep}
              />
              <MarketPanel
                priceHistory={snapshot?.price_history}
                systemRisk={snapshot?.system_risk}
                crashActive={snapshot?.crash_active}
              />
            </>
          )}

          {/* ── AGENTS TAB ── */}
          {activeTab === 'agents' && (
            <>
              <AgentsPanel agents={snapshot?.agents} tradeLog={snapshot?.trade_log} />
            </>
          )}

          {/* ── STATS TAB ── */}
          {activeTab === 'stats' && (
            <>
              <RiskOverviewPanel systemRisk={snapshot?.system_risk} />
              <StatsPanel
                agents={snapshot?.agents}
                tradeLog={snapshot?.trade_log}
                regulationLog={snapshot?.regulation_log}
              />
              <PerformanceCharts
                agents={snapshot?.agents}
                tradeLog={snapshot?.trade_log}
                regulationLog={snapshot?.regulation_log}
              />
            </>
          )}

          {/* ── HELP TAB ── */}
          {activeTab === 'help' && (
            <HelpPanel />
          )}
        </main>

        <RightTradePanel
          interval={interval_}
          setInterval_={setInterval_}
          speedMs={speedMs}
          setSpeedMs={setSpeedMs}
          batchSize={batchSize}
          setBatchSize={setBatchSize}
          activeAgents={activeAgents}
          allAgents={ALL_AGENTS}
          toggleAgent={toggleAgent}
          onStep={handleStep}
          onAutoRun={handleAutoRun}
          onPause={handlePause}
          onInit={handleInit}
          status={status}
          step={step}
          maxSteps={maxSteps}
          crashActive={snapshot?.crash_active}
          onCrash={handleCrash}
          onOpenSettings={() => setShowSettings(true)}
        />
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
