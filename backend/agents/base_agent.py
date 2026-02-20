"""
Base trading agent class.
Every concrete agent inherits from TradingAgent and implements ``decide()``.

All agents in this system are **autonomous, goal-driven, rule-based decision
makers** – they observe market state, apply their strategy independently,
and produce a structured decision dict with a human-readable reasoning string.
They are NOT chatbots or simple wrappers around an LLM.

Agentic loop:
    Perception → Memory → Reasoning → Action

Concrete agents override ``reason()`` (and optionally ``perceive()`` / ``act()``).
The orchestrator calls ``agent.step(market_state, step_index)``.
Legacy ``observe_market_state()`` + ``decide()`` path is still supported.
"""

from __future__ import annotations

import math


class TradingAgent:
    """
    Abstract base class for all autonomous trading agents.

    Each subclass defines a distinct **goal** (e.g., "maximise trend profits",
    "exploit mean-reversion") and implements the ``decide()`` method that
    returns a structured decision dict.

    Attributes:
        name                   – human-readable agent name
        cash                   – available cash balance
        positions              – dict {ticker: quantity}
        avg_cost               – dict {ticker: average_cost_basis}
        portfolio_value_history – list of portfolio values over time
        last_action            – string label of last action ("BUY"/"SELL"/"HOLD")
        last_reasoning         – human-readable explanation of last decision
        last_reason            – alias kept for backward compatibility
        goal                   – strategic objective (set by subclasses)
        halted                 – True when circuit breaker has halted this agent
        active                 – whether agent participates in simulation steps
    """

    def __init__(self, name: str, initial_cash: float = 100_000.0):
        self.name = name
        self.cash = initial_cash
        self.initial_cash = initial_cash
        self.positions: dict[str, int] = {}
        self.avg_cost: dict[str, float] = {}
        self.portfolio_value_history: list[float] = []
        self.last_action: str = ""
        self.last_reasoning: str = ""
        self.last_reason: str = ""            # backward-compat alias
        self.goal: str = ""                   # set by subclasses
        self._state: dict | None = None
        self.halted: bool = False
        self.active: bool = True
        self._peak_value: float = initial_cash

        # ---- Agentic memory & performance tracking ---- #
        self.memory: list[dict] = []
        self.performance_stats: dict = {
            "pnl": 0.0,
            "wins": 0,
            "losses": 0,
            "trades": 0,
        }

    # ------------------------------------------------------------------ #
    # Interface methods (override in subclasses)
    # ------------------------------------------------------------------ #

    def observe_market_state(self, state: dict):
        """Store the current market state for use in ``decide()``.

        Retained for backward compatibility.  New code should call
        ``step(market_state, step_index)`` directly.
        """
        self._state = state

    def decide(self) -> dict:
        """Backwards-compatible wrapper around ``step()``.

        Assumes ``observe_market_state()`` has already been called.
        Prefer calling ``step(market_state)`` in new code.
        """
        market_state = self._state or {}
        return self.step(market_state)

    # ------------------------------------------------------------------ #
    # Agentic loop: Perception → Memory → Reasoning → Action
    # ------------------------------------------------------------------ #

    def perceive(self, market_state: dict) -> dict:
        """Extract an observation dict from raw *market_state*.

        Default implementation stores *market_state* into ``self._state``
        (backward compatibility) and pulls common features.
        Subclasses may override to add extra features.
        """
        self._state = market_state

        bar = market_state.get("current_bar", market_state)
        price = (
            bar.get("SimulatedPrice")
            or bar.get("simulated_price")
            or bar.get("Close")
            or bar.get("close", 0)
        )
        return {
            "price": price,
            "ticker": bar.get("ticker", ""),
            "sma20": bar.get("SMA20", price),
            "sma50": bar.get("SMA50", price),
            "bb_up": bar.get("BB_Upper", bar.get("bb_up", None)),
            "bb_low": bar.get("BB_Lower", bar.get("bb_low", None)),
            "volatility": bar.get("Volatility", bar.get("volatility", None)),
        }

    def reason(self, observation: dict) -> dict:
        """Produce an internal *decision_plan* from an *observation*.

        Base class returns a neutral HOLD plan.  Concrete agents **must**
        override this with their own rule-based strategy logic.
        """
        return {
            "intent": "HOLD",
            "size_factor": 0.0,
            "ticker": observation.get("ticker", ""),
            "notes": "Base agent has no strategy.",
        }

    def act(self, decision_plan: dict) -> dict:
        """Convert *decision_plan* (from ``reason()``) into the canonical
        action dict consumed by the simulator.

        Default implementation maps *intent* → action, computes a quantity
        from *size_factor*, and builds a reasoning string.
        """
        intent = decision_plan.get("intent", "HOLD")
        size_factor = decision_plan.get("size_factor", 0.0)
        ticker = decision_plan.get("ticker", "")
        notes = decision_plan.get("notes", "")

        price = (
            (self._state or {}).get("current_bar", self._state or {})
        )
        if isinstance(price, dict):
            price = (
                price.get("SimulatedPrice")
                or price.get("simulated_price")
                or price.get("Close")
                or price.get("close", 0)
            )
        price = price or 0

        quantity = 0
        if intent == "BUY" and price > 0:
            quantity = int((self.cash * size_factor) / price)
        elif intent == "SELL":
            held = self.positions.get(ticker, 0)
            quantity = max(int(held * size_factor), 0) if size_factor < 1.0 else held

        reasoning = self.build_reasoning(
            intent=intent,
            notes=notes,
            goal=self.goal,
        )

        return {
            "action": intent,
            "ticker": ticker,
            "quantity": quantity,
            "reasoning": reasoning,
        }

    def step(self, market_state: dict, step_index: int | None = None) -> dict:
        """Main agentic entry-point: **Perceive → Reason → Act**.

        The orchestrator should call this instead of
        ``observe_market_state()`` + ``decide()``.
        """
        # Snapshot portfolio value *before* acting
        bar = market_state.get("current_bar", market_state)
        price_before = (
            bar.get("SimulatedPrice")
            or bar.get("simulated_price")
            or bar.get("Close")
            or bar.get("close", 0)
        ) or 0
        old_pv = self.get_portfolio_value(price_before)

        # --- Perception → Reasoning → Action ---
        observation = self.perceive(market_state)
        decision_plan = self.reason(observation)
        action = self.act(decision_plan)

        # Update canonical state attributes
        self.last_action = action.get("action", "HOLD")
        self.last_reasoning = action.get("reasoning", "")
        self.last_reason = self.last_reasoning

        # Compute simple reward (change in portfolio value)
        new_pv = self.get_portfolio_value(price_before)
        reward = new_pv - old_pv

        self._record_memory(
            step=step_index or 0,
            observation=observation,
            decision_plan=decision_plan,
            action=action,
            reward=reward,
        )

        return action

    # ------------------------------------------------------------------ #
    # Memory & performance tracking
    # ------------------------------------------------------------------ #

    def _record_memory(
        self,
        step: int,
        observation: dict,
        decision_plan: dict,
        action: dict,
        reward: float,
    ) -> None:
        """Append a record to ``self.memory`` and update ``self.performance_stats``."""
        self.memory.append({
            "step": step,
            "observation": observation,
            "decision_plan": decision_plan,
            "action": action,
            "reward": reward,
        })

        act_type = action.get("action", "HOLD")
        if act_type in ("BUY", "SELL"):
            self.performance_stats["trades"] += 1

        self.performance_stats["pnl"] += reward
        if reward > 0:
            self.performance_stats["wins"] += 1
        elif reward < 0:
            self.performance_stats["losses"] += 1

    # ------------------------------------------------------------------ #
    # Explanation helper
    # ------------------------------------------------------------------ #

    def explain_last_action(self) -> str:
        """Return a human-readable explanation for the last action taken."""
        return self.last_reasoning or "No action taken yet."

    # ------------------------------------------------------------------ #
    # Reasoning helper
    # ------------------------------------------------------------------ #

    def build_reasoning(self, **kwargs) -> str:
        """
        Utility to build a concise, human-readable reasoning string
        from key indicators.

        Example::

            self.build_reasoning(RSI=25, price_vs_BB="below BB_LOW",
                                 expectation="mean reversion")
            # → "RSI=25, price_vs_BB=below BB_LOW, expectation=mean reversion"
        """
        if not kwargs:
            return "No additional indicators."
        parts = [f"{k}={v}" for k, v in kwargs.items()]
        return ", ".join(parts)

    def update_after_step(self, reward: float, new_state: dict):
        """Hook called after each simulation step (for adaptation logic)."""
        pass

    # ------------------------------------------------------------------ #
    # Portfolio helpers
    # ------------------------------------------------------------------ #

    def get_portfolio_value(self, current_price: float, ticker: str = "") -> float:
        """
        Compute total portfolio value = cash + sum(positions * current_price).
        For single-ticker simulation, pass the ticker or leave blank
        (will sum all positions).
        """
        holdings_value = 0.0
        for t, qty in self.positions.items():
            if ticker and t != ticker:
                continue
            holdings_value += qty * current_price
        return self.cash + holdings_value

    def execute_action(self, action: dict, current_price: float):
        """
        Actually apply a trade to cash / positions.
        Assumes the action has already been reviewed by the regulator.
        """
        # Support both old ("type") and new ("action") key names
        action_type = action.get("action") or action.get("type", "HOLD")
        ticker = action.get("ticker", "")
        quantity = action.get("quantity", 0)

        if action_type == "BUY" and quantity > 0:
            cost = quantity * current_price
            if cost <= self.cash:
                self.cash -= cost
                prev_qty = self.positions.get(ticker, 0)
                prev_cost = self.avg_cost.get(ticker, 0.0)
                new_qty = prev_qty + quantity
                # Update average cost basis
                if new_qty > 0:
                    self.avg_cost[ticker] = (
                        (prev_cost * prev_qty + current_price * quantity) / new_qty
                    )
                self.positions[ticker] = new_qty

        elif action_type == "SELL" and quantity > 0:
            current_qty = self.positions.get(ticker, 0)
            sell_qty = min(quantity, current_qty)  # cannot sell more than held
            if sell_qty > 0:
                self.cash += sell_qty * current_price
                self.positions[ticker] = current_qty - sell_qty
                if self.positions[ticker] == 0:
                    self.positions.pop(ticker, None)
                    self.avg_cost.pop(ticker, None)

        # Keep structured dict on the instance for backward compat,
        # but also update the canonical string attributes.
        self.last_action = action_type
        reasoning = action.get("reasoning", "")
        if reasoning:
            self.last_reasoning = reasoning
            self.last_reason = reasoning

    # ------------------------------------------------------------------ #
    # Risk metrics
    # ------------------------------------------------------------------ #

    def get_risk_metrics(self, current_price: float, ticker: str = "") -> dict:
        """
        Compute per-agent risk metrics:
        - return_pct       – total return since inception
        - max_drawdown_pct – worst peak-to-trough decline
        - sharpe_ratio     – annualised Sharpe (risk-free = 0%)
        """
        pv = self.get_portfolio_value(current_price, ticker)

        # Return %
        return_pct = ((pv - self.initial_cash) / self.initial_cash) * 100 if self.initial_cash > 0 else 0.0

        # Max drawdown
        peak = self.initial_cash
        max_dd = 0.0
        for v in self.portfolio_value_history:
            if v > peak:
                peak = v
            dd = (v - peak) / peak if peak > 0 else 0
            if dd < max_dd:
                max_dd = dd

        # current drawdown from peak for circuit-breaker
        if pv > self._peak_value:
            self._peak_value = pv
        current_dd = (pv - self._peak_value) / self._peak_value if self._peak_value > 0 else 0

        # Sharpe ratio (step-wise returns)
        if len(self.portfolio_value_history) >= 2:
            returns = []
            for i in range(1, len(self.portfolio_value_history)):
                prev = self.portfolio_value_history[i - 1]
                if prev > 0:
                    returns.append((self.portfolio_value_history[i] - prev) / prev)
            if returns:
                avg_r = sum(returns) / len(returns)
                std_r = math.sqrt(sum((r - avg_r) ** 2 for r in returns) / len(returns)) if len(returns) > 1 else 0
                sharpe = (avg_r / std_r) if std_r > 0 else 0.0
            else:
                sharpe = 0.0
        else:
            sharpe = 0.0

        return {
            "return_pct": round(return_pct, 2),
            "max_drawdown_pct": round(max_dd * 100, 2),
            "sharpe_ratio": round(sharpe, 2),
            "current_drawdown_pct": round(current_dd * 100, 2),
        }

    def to_dict(self, current_price: float, ticker: str = "") -> dict:
        """Serialise agent state for the frontend."""
        pv = self.get_portfolio_value(current_price, ticker)
        risk = self.get_risk_metrics(current_price, ticker)

        # Determine agent status label (used by OrchestratorAgent snapshot)
        if not self.active:
            status = "DISABLED"
        elif self.halted:
            status = "HALTED"
        else:
            status = "ACTIVE"

        return {
            "name": self.name,
            "cash": round(self.cash, 2),
            "positions": dict(self.positions),
            "portfolio_value": round(pv, 2),
            "last_action": self.last_action,
            "last_reasoning": self.last_reasoning,
            "last_reason": self.last_reason,
            "goal": self.goal,
            "halted": self.halted,
            "active": self.active,
            "status": status,
            "return_pct": risk["return_pct"],
            "max_drawdown_pct": risk["max_drawdown_pct"],
            "sharpe_ratio": risk["sharpe_ratio"],
            "pnl": round(self.performance_stats["pnl"], 2),
            "wins": self.performance_stats["wins"],
            "losses": self.performance_stats["losses"],
            "trades": self.performance_stats["trades"],
        }
