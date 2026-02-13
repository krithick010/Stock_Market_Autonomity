# Multi-Agent Stock Market AI Autonomity

A simulated financial ecosystem populated by **multiple autonomous trading agents** operating in a shared market. Each agent analyses real market data (via **yfinance**), trades under uncertainty, manages its portfolio & risk, and adapts over time — including an adversarial "whale" agent that attempts pump-and-dump manipulation.

A **Regulator** module enforces compliance constraints, detects contrarian trades during crashes, and blocks or warns on suspicious behaviour. An **OrchestratorAgent** (Head Agent) coordinates the simulation clock, triggers whale-crash cascade scenarios, and activates global circuit breakers when systemic risk thresholds are breached.

Every decision includes a structured **reasoning** string for transparent, interpretable, post-hoc auditing.

---

## Tech Stack

| Layer    | Technology |
|----------|------------|
| Backend  | Python 3 · Flask · yfinance · pandas · numpy · SQLite |
| Frontend | React 18 (Vite) · Recharts · Axios |
| Data     | SQLite (devhack.db) + in-memory dual-write logging |

---

## Agents

| Agent | Strategy | Goal |
|-------|----------|------|
| **Conservative** | Low volatility filter, small positions, tight stop-loss | Preserve capital |
| **Momentum** | SMA20/SMA50 crossover trend following | Ride established trends |
| **MeanReversion** | Bollinger Band mean-reversion (buy BB_LOW, sell BB_UP) | Exploit price extremes |
| **NoiseTrader** | Random small trades to inject realistic noise | Simulate retail activity |
| **Adversarial** | Pump-and-dump: burst buys in low-volume, dumps on gain | Stress-test the Regulator |

All agents return a **structured decision dict**:
```python
{"action": "BUY"|"SELL"|"HOLD", "quantity": int, "reasoning": str}
```

---

## Key Features

- **Structured decisions with reasoning** — every agent explains why it acted
- **5 compliance rules** — MaxPosition, MaxOrder, BurstTrading, AdversarialFlag, ContrарianCrashDetection
- **Whale Manipulation / Cascade Crash** — one-click demo: whale dumps → price crash → momentum agents panic-sell → global circuit breaker halts trading
- **Global circuit breaker** — trading halted system-wide at −15 % drawdown
- **Per-agent circuit breakers** — individual agents halted at −10 % drawdown
- **Endogenous price impact** — agent order flow moves the simulated price
- **SQLite audit trail** — every trade and regulation event persisted

---

## Project Structure

```
backend/
  app.py                      # Flask API server (6 endpoints)
  db.py                        # SQLite database layer
  requirements.txt
  market/
    market.py                  # Market data download & endogenous price model
  agents/
    base_agent.py              # TradingAgent base class (structured decisions,
                               #   build_reasoning helper, goal/last_action/
                               #   last_reasoning attributes)
    conservative_agent.py
    momentum_agent.py
    mean_reversion_agent.py
    noise_trader.py
    adversarial_agent.py
  regulator/
    regulator.py               # 5 compliance rules incl. crash-contrarian detection
  simulation/
    simulation.py              # Facade delegating to OrchestratorAgent
    orchestrator.py            # Head Agent: clock, whale crash, cascade, halt
  logging_utils/
    logger.py                  # Dual-write audit trail (memory + SQLite)
frontend/
  src/
    api/client.js              # Axios API client
    components/
      ControlsPanel.jsx        # Sidebar controls + Trigger Crash button
      PriceChart.jsx           # Candlestick/line chart + trade markers
      AgentsPanel.jsx          # Agent cards with reasoning + risk metrics
      PerformanceCharts.jsx    # Portfolio + violation charts
      RiskOverviewPanel.jsx    # System-wide risk dashboard
      TradeLogTable.jsx        # Filterable trade log
      RegulationLogTable.jsx   # Regulation event log
      SettingsModal.jsx        # Per-agent parameter tuning
    App.jsx
    main.jsx
    index.css
README.md
PROJECT_REPORT.txt
```

---

## How to Run

### 1. Backend

```bash
cd backend

# Create & activate virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start Flask server (port 5000)
python app.py
```

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server (port 5173)
npm run dev
```

---

## How to Use

1. Open the React UI at **http://localhost:5173**.
2. Select a **ticker** (e.g. AAPL, TSLA, RELIANCE.NS), **period**, and **interval**.
3. Click **Start / Re-init** to download market data and create agents.
4. Click **Step** to advance one bar at a time, or **Auto-Run** to continuously simulate.
5. Observe:
   - **Price Chart** with SMA & Bollinger Band overlays + trade markers.
   - **Agent cards** showing cash, positions, portfolio value, last action, **reasoning**, and risk metrics.
   - **Trade Log** with regulator decisions (filterable by agent).
   - **Regulation Events** table.
   - **Performance Charts**: portfolio value over time per agent + violations bar chart.
   - **Risk Overview**: AUM, exposure, drawdown, circuit breakers.
6. Click **Trigger Crash** to demo the whale manipulation cascade:
   - Adversarial whale dumps 100 % of holdings.
   - Price drops 15-20 %, indicators recalculate.
   - Momentum / other agents react with stop-loss sells.
   - If global drawdown exceeds −15 %, **all trading is halted** (red banner).
7. Click **Pause** to stop auto-run. The simulation ends when all historical bars are consumed.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/init` | Init simulation `{"ticker","period","interval","active_agents?","agent_params?"}` |
| POST | `/api/step` | Advance one or N steps `?n=5` |
| POST | `/api/auto-step` | Batch-run N steps `{"steps": 10}` |
| POST | `/api/jump` | Jump to step `{"step": 42}` |
| POST | `/api/trigger-crash` | Trigger whale dump + cascade crash |
| GET  | `/api/state` | Get current snapshot |

Snapshot includes `trading_status: "ACTIVE" | "HALTED_BY_CIRCUIT_BREAKER"` for frontend display.

---

## License

MIT — built for hackathon / educational purposes.
