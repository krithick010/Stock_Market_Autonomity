"""
Momentum Agent – trend-following strategy based on SMA crossovers.

This agent is an **autonomous, goal-driven, rule-based decision maker**.
"""

from agents.base_agent import TradingAgent


class MomentumAgent(TradingAgent):
    """
    Autonomous Momentum Trading Agent.

    **Goal**: Maximise profit by riding established price trends and
    exiting when the trend reverses.

    **Inputs**:
        - SMA20, SMA50 (moving average crossover signals)
        - Current price (Close)

    **Decision logic**:
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

    def decide(self) -> dict:
        state = self._state
        if state is None:
            self.last_action = "HOLD"
            self.last_reasoning = "No market state available."
            return {"action": "HOLD", "ticker": "", "quantity": 0, "reasoning": self.last_reasoning}

        bar = state["current_bar"]
        ticker = bar.get("ticker", "")
        # Use simulated price as the actual trading price
        close = bar.get("SimulatedPrice", bar.get("Close", 0))
        sma20 = bar.get("SMA20", close)
        sma50 = bar.get("SMA50", close)

        held_qty = self.positions.get(ticker, 0)

        # ---------- Uptrend detected (golden cross zone) ----------
        if sma20 > sma50:
            if held_qty == 0:
                affordable = int(
                    (self.cash * self.POSITION_FRACTION) / close
                ) if close > 0 else 0
                if affordable > 0:
                    reasoning = (
                        f"SMA20 ({sma20:.2f}) > SMA50 ({sma50:.2f}), "
                        f"uptrend detected -> enter long at {close:.2f}."
                    )
                    self.last_action = "BUY"
                    self.last_reasoning = reasoning
                    self.last_reason = reasoning
                    return {"action": "BUY", "ticker": ticker, "quantity": affordable, "reasoning": reasoning}
            # Already holding – ride the trend
            reasoning = (
                f"SMA20 ({sma20:.2f}) > SMA50 ({sma50:.2f}), "
                f"riding uptrend -> HOLD."
            )
            self.last_action = "HOLD"
            self.last_reasoning = reasoning
            self.last_reason = reasoning
            return {"action": "HOLD", "ticker": ticker, "quantity": 0, "reasoning": reasoning}

        # ---------- Downtrend / death cross zone ----------
        if sma20 < sma50 and held_qty > 0:
            reasoning = (
                f"SMA20 ({sma20:.2f}) < SMA50 ({sma50:.2f}), "
                f"trend reversal detected -> closing position of {held_qty}."
            )
            self.last_action = "SELL"
            self.last_reasoning = reasoning
            self.last_reason = reasoning
            return {"action": "SELL", "ticker": ticker, "quantity": held_qty, "reasoning": reasoning}

        reasoning = (
            f"SMA20 ({sma20:.2f}), SMA50 ({sma50:.2f}), "
            f"no clear signal -> HOLD."
        )
        self.last_action = "HOLD"
        self.last_reasoning = reasoning
        self.last_reason = reasoning
        return {"action": "HOLD", "ticker": ticker, "quantity": 0, "reasoning": reasoning}
