"""
Noise Trader – random actions to inject realistic market noise.

This agent is an **autonomous, goal-driven, rule-based decision maker**
(goal: inject realistic irrational trading activity into the market).
"""

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

    **Decision logic**:
        1. Each step, with probability ``trade_probability`` (default 15 %),
           decide to trade; otherwise HOLD.
        2. If trading: 50 % chance BUY a small random qty (up to 2 % of cash),
           50 % chance SELL a random portion of holdings.
        3. Provides a ``last_reason`` string explaining the random action.
    """

    def __init__(self, name: str, initial_cash: float = 100_000.0, params: dict | None = None):
        super().__init__(name, initial_cash)
        params = params or {}
        self.TRADE_PROBABILITY = params.get("trade_probability", 0.15)
        self.POSITION_FRACTION = params.get("position_size_pct", 0.02)

    def decide(self) -> dict:
        state = self._state
        if state is None:
            return {"type": "HOLD", "ticker": "", "quantity": 0}

        bar = state["current_bar"]
        ticker = bar.get("ticker", "")
        close = bar["Close"]
        held_qty = self.positions.get(ticker, 0)

        if random.random() > self.TRADE_PROBABILITY:
            self.last_reason = "No action this step (random skip)"
            return {"type": "HOLD", "ticker": ticker, "quantity": 0}

        # Random direction
        if random.random() < 0.5:
            # BUY
            affordable = int(
                (self.cash * self.POSITION_FRACTION) / close
            ) if close > 0 else 0
            if affordable > 0:
                qty = random.randint(1, max(1, affordable))
                self.last_reason = f"Random noise BUY of {qty} shares"
                return {"type": "BUY", "ticker": ticker, "quantity": qty}
        else:
            # SELL
            if held_qty > 0:
                sell_qty = random.randint(1, max(1, held_qty))
                self.last_reason = f"Random noise SELL of {sell_qty} shares"
                return {"type": "SELL", "ticker": ticker, "quantity": sell_qty}

        self.last_reason = "Random action considered but no position to sell / insufficient cash"
        return {"type": "HOLD", "ticker": ticker, "quantity": 0}
