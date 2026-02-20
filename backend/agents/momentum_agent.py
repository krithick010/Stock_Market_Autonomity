"""
Momentum Agent – trend-following strategy based on SMA crossovers.

This agent is an **autonomous, goal-driven, rule-based decision maker**.

Agentic loop:
    perceive()  → extracts price, SMA20, SMA50, ticker from market state
    reason()    → applies SMA crossover rules to decide intent
    act()       → converts intent into a concrete BUY/SELL/HOLD action
    step()      → inherited from TradingAgent (orchestrates the loop)
"""

from __future__ import annotations

from agents.base_agent import TradingAgent


class MomentumAgent(TradingAgent):
    """
    Autonomous Momentum Trading Agent.

    **Goal**: Maximise profit by riding established price trends and
    exiting when the trend reverses.

    **Inputs**:
        - SMA20, SMA50 (moving average crossover signals)
        - Current price (Close)

    **Decision logic** (implemented in ``reason()``):
        1. If SMA20 > SMA50 (golden cross / uptrend) and no position
           → BUY (default 15 % of cash).
        2. If SMA20 < SMA50 (death cross / downtrend) and holding
           → SELL entire position.
        3. Otherwise → HOLD.
    """

    def __init__(self, name: str, initial_cash: float = 100_000.0, params: dict | None = None):
        super().__init__(name, initial_cash)
        self.goal = "Ride short-term trends via SMA crossovers."
        params = params or {}
        self.POSITION_FRACTION = params.get("position_size_pct", 0.15)

    # ------------------------------------------------------------------ #
    # Agentic overrides
    # ------------------------------------------------------------------ #

    def reason(self, observation: dict) -> dict:
        """Rule-based SMA crossover strategy.

        Returns a *decision_plan* dict with ``intent``, ``size_factor``,
        ``ticker``, and ``notes``.
        """
        price = observation.get("price", 0)
        sma20 = observation.get("sma20", price)
        sma50 = observation.get("sma50", price)
        ticker = observation.get("ticker", "")
        held_qty = self.positions.get(ticker, 0)

        # ---------- Uptrend detected (golden cross zone) ----------
        if sma20 > sma50:
            if held_qty == 0 and price > 0:
                return {
                    "intent": "BUY",
                    "size_factor": self.POSITION_FRACTION,
                    "ticker": ticker,
                    "notes": (
                        f"SMA20 ({sma20:.2f}) > SMA50 ({sma50:.2f}), "
                        f"uptrend detected -> enter long at {price:.2f}."
                    ),
                }
            # Already holding – ride the trend
            return {
                "intent": "HOLD",
                "size_factor": 0.0,
                "ticker": ticker,
                "notes": (
                    f"SMA20 ({sma20:.2f}) > SMA50 ({sma50:.2f}), "
                    f"riding uptrend -> HOLD."
                ),
            }

        # ---------- Downtrend / death cross zone ----------
        if sma20 < sma50 and held_qty > 0:
            return {
                "intent": "SELL",
                "size_factor": 1.0,          # sell entire position
                "ticker": ticker,
                "notes": (
                    f"SMA20 ({sma20:.2f}) < SMA50 ({sma50:.2f}), "
                    f"trend reversal detected -> closing position of {held_qty}."
                ),
            }

        # ---------- No clear signal ----------
        return {
            "intent": "HOLD",
            "size_factor": 0.0,
            "ticker": ticker,
            "notes": (
                f"SMA20 ({sma20:.2f}), SMA50 ({sma50:.2f}), "
                f"no clear signal -> HOLD."
            ),
        }
