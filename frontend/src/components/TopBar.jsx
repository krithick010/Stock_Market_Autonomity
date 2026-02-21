import React from 'react';

const TICKERS = ['AAPL', 'MSFT', 'TSLA', 'NSEI', 'RELIANCE.NS', 'TCS.NS', 'INFY.NS'];
const PERIODS = ['1d', '5d', '1mo', '3mo'];

export default function TopBar({
  ticker, setTicker,
  period, setPeriod,
  theme, setTheme,
  balance = 0,
  crashActive = false,
}) {
  return (
    <header className="olymp-topbar">
      <div className="topbar-left">
        <div className="logo">⚡</div>
        <div className="stock-selector">
          <select 
            value={ticker} 
            onChange={e => setTicker(e.target.value)}
            className="stock-dropdown"
          >
            {TICKERS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <span className="period-label">
            {period.toUpperCase()}
          </span>
          <select 
            value={period} 
            onChange={e => setPeriod(e.target.value)}
            className="period-dropdown"
          >
            {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="topbar-center">
        <h1>Multi-Agent Stock Market AI</h1>
      </div>

      <div className="topbar-right">
        <div className="account-info">
          <div className="balance-display">
            <span className="label">Balance</span>
            <span className="amount">${(balance || 0).toLocaleString()}</span>
          </div>
          {crashActive && <span className="crash-indicator">⚠ CRASH ACTIVE</span>}
        </div>

        <button
          className="theme-toggle-btn"
          onClick={() => setTheme(prev => (prev === 'light' ? 'dark' : 'light'))}
          title="Toggle theme"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        <button className="payments-btn">
          Payments
        </button>

        <button className="profile-btn">
          👤
        </button>
      </div>
    </header>
  );
}
