"""
Simulation orchestrator.
Glues together the market, agents, regulator, and logger into
a step-by-step simulation loop.

Enhanced with: batch_step, jump_to_step, trigger_crash, risk metrics,
agent toggling, agent params, circuit breakers, trades_at_step.
"""

import random
from market.market import MarketEnvironment
from agents.conservative_agent import ConservativeAgent
from agents.momentum_agent import MomentumAgent
from agents.mean_reversion_agent import MeanReversionAgent
from agents.noise_trader import NoiseTrader
from agents.adversarial_agent import AdversarialAgent
from regulator.regulator import RegulatorAgent
from logging_utils.logger import SimulationLogger

# Map of lowercase key → class
AGENT_REGISTRY = {
    "conservative": ConservativeAgent,
    "momentum": MomentumAgent,
    "meanreversion": MeanReversionAgent,
    "noisetrader": NoiseTrader,
    "adversarial": AdversarialAgent,
}

AGENT_DISPLAY_NAMES = {
    "conservative": "Conservative",
    "momentum": "Momentum",
    "meanreversion": "MeanReversion",
    "noisetrader": "NoiseTrader",
    "adversarial": "Adversarial",
}


class Simulation:
    """
    Stateful, in-memory simulation of a multi-agent trading ecosystem.

    Lifecycle:
        1. init_simulation(ticker, period, interval, ...)  → downloads data, creates agents
        2. step_simulation()  → advance one bar, each agent decides & is reviewed
        3. get_snapshot()     → return full state for the frontend
    """

    def __init__(self):
        self.market: MarketEnvironment | None = None
        self.agents: list = []
        self.regulator: RegulatorAgent | None = None
        self.logger = SimulationLogger()
        self.current_step = 0
        self.max_steps = 0
        self.ticker: str = ""
        self.period: str = ""
        self.interval: str = ""
        self.finished = False
        self.price_history: list[dict] = []
        self.trades_at_step: list[dict] = []  # trades made in the latest step
        self._peak_total_value: float = 0.0

        # Crash / circuit-breaker state
        self.crash_active: bool = False
        self._crash_steps_remaining: int = 0
        self._crash_vol_multiplier: float = 1.0
        self.circuit_breakers_active: int = 0

        # Config received at init
        self._active_agent_keys: list[str] = []
        self._agent_params: dict = {}

    # ------------------------------------------------------------------ #
    # Initialisation
    # ------------------------------------------------------------------ #

    def init_simulation(
        self,
        ticker: str,
        period: str,
        interval: str,
        active_agents: list[str] | None = None,
        agent_params: dict | None = None,
    ) -> dict:
        """
        Download market data, create environment, agents, and regulator.
        Returns the initial snapshot for the frontend.
        """
        # Create market environment (may raise ValueError on bad data)
        self.market = MarketEnvironment(ticker, period, interval)
        self.ticker = ticker
        self.period = period
        self.interval = interval
        self.current_step = 0
        self.max_steps = self.market.total_bars
        self.finished = False
        self.trades_at_step = []

        # Reset crash state
        self.crash_active = False
        self._crash_steps_remaining = 0
        self._crash_vol_multiplier = 1.0
        self.circuit_breakers_active = 0

        # Reset logger
        self.logger.reset()

        # Active agents (default: all)
        if active_agents is None or len(active_agents) == 0:
            active_agents = list(AGENT_REGISTRY.keys())
        self._active_agent_keys = [k.lower() for k in active_agents]
        self._agent_params = agent_params or {}

        # Create agents with optional params
        self.agents = []
        for key in AGENT_REGISTRY:
            display = AGENT_DISPLAY_NAMES[key]
            cls = AGENT_REGISTRY[key]
            params = self._agent_params.get(key, {})
            agent = cls(display, initial_cash=100_000.0, params=params)
            agent.active = key in self._active_agent_keys
            self.agents.append(agent)

        # Regulator
        self.regulator = RegulatorAgent()

        # Seed price history with initial bar
        state = self.market.get_state()
        self.price_history = [state["current_bar"]]

        # Record initial portfolio values
        close = state["current_bar"]["Close"]
        for agent in self.agents:
            pv = agent.get_portfolio_value(close, self.ticker)
            agent.portfolio_value_history.append(pv)

        self._peak_total_value = sum(
            a.get_portfolio_value(close, self.ticker) for a in self.agents
        )

        return self.get_snapshot()

    # ------------------------------------------------------------------ #
    # Step
    # ------------------------------------------------------------------ #

    def step_simulation(self) -> dict:
        """
        Advance the simulation by one bar.

        For each active, non-halted agent:
          1. observe current state
          2. decide action
          3. regulator reviews
          4. execute if approved / warned
          5. log everything
        Then advance the market.
        """
        if self.market is None:
            return {"error": "Simulation not initialised. Call /api/init first."}

        if self.finished or self.market.is_done():
            self.finished = True
            return self.get_snapshot()

        state = self.market.get_state()
        bar = state["current_bar"]
        close = bar["Close"]

        # Inject ticker into bar so agents can reference it
        bar["ticker"] = self.ticker

        # Handle crash volatility decay
        if self._crash_steps_remaining > 0:
            self._crash_steps_remaining -= 1
            if self._crash_steps_remaining == 0:
                self.crash_active = False
                self._crash_vol_multiplier = 1.0

        self.trades_at_step = []

        for agent in self.agents:
            # Skip inactive agents
            if not agent.active:
                agent.last_reason = "Agent disabled"
                continue

            # Skip halted agents
            if agent.halted:
                agent.last_reason = "HALTED by circuit breaker"
                pv = agent.get_portfolio_value(close, self.ticker)
                agent.portfolio_value_history.append(pv)
                self.logger.log_trade(
                    step=self.current_step,
                    agent_name=agent.name,
                    action="HOLD",
                    price=close,
                    quantity=0,
                    portfolio_value=pv,
                    reason="HALTED by circuit breaker",
                    decision="BLOCK",
                    decision_reason="Circuit breaker active",
                )
                continue

            # 1. Observe
            agent.observe_market_state(state)

            # 2. Decide
            action = agent.decide()
            action.setdefault("ticker", self.ticker)

            # 3. Regulator review
            agent_state = {
                "cash": agent.cash,
                "positions": dict(agent.positions),
                "portfolio_value": agent.get_portfolio_value(close, self.ticker),
            }
            review = self.regulator.review_trade(
                agent_name=agent.name,
                action=action,
                agent_state=agent_state,
                market_state=bar,
                current_step=self.current_step,
            )

            reg_decision = review["decision"]
            reg_reason = review["reason"]
            adjusted = review["adjusted_action"]

            # 4. Execute trade (only if not BLOCKED)
            if reg_decision in ("APPROVE", "WARN"):
                agent.execute_action(adjusted, close)

            # 5. Compute new portfolio value
            pv = agent.get_portfolio_value(close, self.ticker)
            agent.portfolio_value_history.append(pv)

            # Record trade marker for this step
            adj_type = adjusted.get("type", "HOLD")
            adj_qty = adjusted.get("quantity", 0)
            if adj_type in ("BUY", "SELL") and adj_qty > 0 and reg_decision != "BLOCK":
                self.trades_at_step.append({
                    "agent": agent.name,
                    "type": adj_type,
                    "price": round(close, 2),
                    "quantity": adj_qty,
                    "step": self.current_step,
                    "reason": agent.last_reason,
                })

            # 6. Log trade
            self.logger.log_trade(
                step=self.current_step,
                agent_name=agent.name,
                action=adjusted.get("type", "HOLD"),
                price=close,
                quantity=adj_qty,
                portfolio_value=pv,
                reason=agent.last_reason,
                decision=reg_decision,
                decision_reason=reg_reason,
            )

            # 7. Log regulation event if WARN or BLOCK
            if reg_decision in ("WARN", "BLOCK"):
                self.logger.log_regulation_event(
                    step=self.current_step,
                    agent_name=agent.name,
                    rule_name="compliance_review",
                    decision=reg_decision,
                    explanation=reg_reason,
                )

            # 8. Reward / adaptation callback
            reward = 0.0
            if len(agent.portfolio_value_history) >= 2:
                reward = (
                    agent.portfolio_value_history[-1]
                    - agent.portfolio_value_history[-2]
                )
            agent.update_after_step(reward, state)

        # Check circuit breakers (drawdown > 10% from peak halts the agent)
        self.circuit_breakers_active = 0
        for agent in self.agents:
            if not agent.active:
                continue
            risk = agent.get_risk_metrics(close, self.ticker)
            if risk["current_drawdown_pct"] <= -10.0 and not agent.halted:
                agent.halted = True
            if agent.halted:
                self.circuit_breakers_active += 1

        # Advance market
        new_state, _, info = self.market.step({})
        self.current_step = self.market.current_step

        # Append new price bar to history
        new_bar = new_state["current_bar"]
        self.price_history.append(new_bar)

        # Update peak total value
        total = sum(a.get_portfolio_value(close, self.ticker) for a in self.agents if a.active)
        if total > self._peak_total_value:
            self._peak_total_value = total

        if info.get("finished"):
            self.finished = True

        return self.get_snapshot()

    # ------------------------------------------------------------------ #
    # Batch step
    # ------------------------------------------------------------------ #

    def batch_step(self, n: int = 10) -> dict:
        """Run n steps in one call, return final snapshot."""
        n = min(int(n), 200)
        snapshot = None
        for _ in range(n):
            snapshot = self.step_simulation()
            if snapshot.get("finished") or "error" in snapshot:
                break
        return snapshot or self.get_snapshot()

    # ------------------------------------------------------------------ #
    # Jump to step
    # ------------------------------------------------------------------ #

    def jump_to_step(self, target_step: int) -> dict:
        """
        Fast-forward to a specific step. Re-inits and replays to that point.
        Preserves agent positions, logs, etc. up to that step.
        """
        if self.market is None:
            return {"error": "Simulation not initialised."}

        target_step = min(int(target_step), self.max_steps - 1)
        target_step = max(0, target_step)

        if target_step <= self.current_step:
            # Need to re-init and replay
            self.init_simulation(
                self.ticker, self.period, self.interval,
                active_agents=self._active_agent_keys,
                agent_params=self._agent_params,
            )

        while self.current_step < target_step and not self.finished:
            self.step_simulation()

        return self.get_snapshot()

    # ------------------------------------------------------------------ #
    # Trigger crash
    # ------------------------------------------------------------------ #

    def trigger_crash(self) -> dict:
        """
        Trigger a market crash:
        1. Drop current price by 15-20% instantly
        2. Triple volatility for 10 steps
        3. Activate circuit breakers on agents with >10% drawdown
        """
        if self.market is None:
            return {"error": "Simulation not initialised."}

        # Apply crash to remaining bars in the DataFrame
        crash_pct = random.uniform(0.15, 0.20)
        step = self.market.current_step
        df = self.market.df

        # Drop all OHLC columns from current step onward
        for col in ["Open", "High", "Low", "Close"]:
            if col in df.columns:
                df.loc[step:, col] = df.loc[step:, col] * (1 - crash_pct)

        # Recompute SMA / BB on the crashed data
        close = df["Close"]
        df["SMA20"] = close.rolling(window=20, min_periods=1).mean()
        df["SMA50"] = close.rolling(window=50, min_periods=1).mean()
        import numpy as np
        rolling_std = close.rolling(window=20, min_periods=1).std()
        df["BB_MID"] = df["SMA20"]
        df["BB_UP"] = df["SMA20"] + 2 * rolling_std
        df["BB_LOW"] = df["SMA20"] - 2 * rolling_std
        log_returns = np.log(close / close.shift(1))
        df["Volatility"] = log_returns.rolling(window=20, min_periods=1).std() * 3  # tripled
        df.fillna(0, inplace=True)

        # Crash state
        self.crash_active = True
        self._crash_steps_remaining = 10
        self._crash_vol_multiplier = 3.0

        # Update price history with crashed bar
        if step < len(df):
            self.price_history[-1] = self.market._bar_to_dict(step)

        # Check circuit breakers immediately
        close_price = df.iloc[step]["Close"]
        self.circuit_breakers_active = 0
        for agent in self.agents:
            if not agent.active:
                continue
            risk = agent.get_risk_metrics(close_price, self.ticker)
            if risk["current_drawdown_pct"] <= -10.0:
                agent.halted = True
            if agent.halted:
                self.circuit_breakers_active += 1

        return self.get_snapshot()

    # ------------------------------------------------------------------ #
    # System-wide risk metrics
    # ------------------------------------------------------------------ #

    def get_system_risk(self) -> dict:
        """Compute system-wide risk overview."""
        if self.market is None:
            return {}

        state = self.market.get_state()
        close = state["current_bar"]["Close"]

        total_exposure = 0.0
        open_positions = 0
        active_count = 0

        for agent in self.agents:
            if not agent.active:
                continue
            active_count += 1
            for t, qty in agent.positions.items():
                total_exposure += qty * close
                if qty > 0:
                    open_positions += 1

        total_aum = sum(
            a.get_portfolio_value(close, self.ticker) for a in self.agents if a.active
        )
        exposure_pct = (total_exposure / total_aum * 100) if total_aum > 0 else 0

        # Global drawdown
        if total_aum > self._peak_total_value:
            self._peak_total_value = total_aum
        global_dd = ((total_aum - self._peak_total_value) / self._peak_total_value * 100) if self._peak_total_value > 0 else 0

        # Violation counts
        violation_count = len(self.logger.get_regulation_log())

        return {
            "total_exposure": round(total_exposure, 2),
            "total_aum": round(total_aum, 2),
            "exposure_pct": round(exposure_pct, 1),
            "open_positions_count": open_positions,
            "active_agents": active_count,
            "violation_count": violation_count,
            "global_drawdown_pct": round(global_dd, 2),
            "circuit_breakers_active": self.circuit_breakers_active,
            "crash_active": self.crash_active,
        }

    # ------------------------------------------------------------------ #
    # Snapshot for frontend
    # ------------------------------------------------------------------ #

    def get_snapshot(self) -> dict:
        """
        Build a JSON-serialisable snapshot of the full simulation state.
        """
        if self.market is None:
            return {"error": "Simulation not initialised."}

        state = self.market.get_state()
        close = state["current_bar"]["Close"]

        agents_data = [
            agent.to_dict(close, self.ticker) for agent in self.agents
        ]

        return {
            "step": self.current_step,
            "max_steps": self.max_steps,
            "ticker": self.ticker,
            "period": self.period,
            "interval": self.interval,
            "finished": self.finished,
            "current_bar": state["current_bar"],
            "price_history": self.price_history,
            "agents": agents_data,
            "trade_log": self.logger.get_trade_log(),
            "regulation_log": self.logger.get_regulation_log(),
            "trades_at_step": self.trades_at_step,
            "system_risk": self.get_system_risk(),
            "crash_active": self.crash_active,
            "circuit_breakers_active": self.circuit_breakers_active,
        }
