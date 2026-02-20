"""
Noise Trader – random actions to inject realistic market noise.

This agent is an **autonomous, goal-driven, rule-based decision maker**
(goal: inject realistic irrational trading activity into the market).

Agentic loop:
    perceive()  → extracts price, ticker from market state
    reason()    → rolls dice to decide random BUY / SELL / HOLD
    act()       → converts intent into a concrete action (with random qty)
    step()      → inherited from TradingAgent (orchestrates the loop)
"""

from __future__ import annotations

import random
from agents.base_agent import TradingAgent


class NoiseTrader(TradingAgent):
    """
    Autonomous Noise Trading Agent.

    **Goal**: Simulate irrational / retail-style market activity by
    placing small random trades, adding realistic noise to the
    multi-agent simulation.

    **Inputs**:
        - Current price (Close)
        - Internal random number generator
        - Current position (for sell decisions)

    **Decision logic** (implemented in ``reason()``):
        1. Each step, with probability ``trade_probability`` (default 15 %),
           decide to trade; otherwise HOLD.
        2. If trading: 50 % chance BUY a small random qty (up to 2 % of cash),
           50 % chance SELL a random portion of holdings.
        3. Provides a ``last_reason`` string explaining the random action.
    """

    def __init__(self, name: str, initial_cash: float = 100_000.0, params: dict | None = None):
        super().__init__(name, initial_cash)
        self.goal = "Add realistic random liquidity."
        params = params or {}
        self.TRADE_PROBABILITY = params.get("trade_probability", 0.15)
        self.POSITION_FRACTION = params.get("position_size_pct", 0.02)

    # ------------------------------------------------------------------ #
    # Agentic overrides
    # ------------------------------------------------------------------ #

    def reason(self, observation: dict) -> dict:
        """Random-trade strategy: roll dice for trade/skip, then direction."""
        price = observation.get("price", 0)
        ticker = observation.get("ticker", "")
        held_qty = self.positions.get(ticker, 0)

        # --- Random skip ---
        if random.random() > self.TRADE_PROBABILITY:
            return {
                "intent": "HOLD",
                "size_factor": 0.0,
                "ticker": ticker,
                "notes": "No action this step (random skip).",
            }

        # --- Random direction ---
        if random.random() < 0.5:
            # BUY attempt
            affordable = int(
                (self.cash * self.POSITION_FRACTION) / price
            ) if price > 0 else 0
            if affordable > 0:
                qty = random.randint(1, max(1, affordable))
                # Encode the exact random qty in size_factor so act() reproduces it
                size_factor = (qty * price / self.cash) if self.cash > 0 else 0.0
                return {
                    "intent": "BUY",
                    "size_factor": size_factor,
                    "ticker": ticker,
                    "notes": f"Random noise BUY of {qty} shares at {price:.2f}.",
                }
        else:
            # SELL attempt
            if held_qty > 0:
                sell_qty = random.randint(1, max(1, held_qty))
                size_factor = sell_qty / held_qty if held_qty > 0 else 1.0
                return {
                    "intent": "SELL",
                    "size_factor": size_factor,
                    "ticker": ticker,
                    "notes": f"Random noise SELL of {sell_qty} shares at {price:.2f}.",
                }

        return {
            "intent": "HOLD",
            "size_factor": 0.0,
            "ticker": ticker,
            "notes": "Random action considered but no position to sell / insufficient cash.",
        }
