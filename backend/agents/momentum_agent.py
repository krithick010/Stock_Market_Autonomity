"""
Momentum Agent – trend-following strategy based on SMA crossovers.
"""

from agents.base_agent import TradingAgent


class MomentumAgent(TradingAgent):
    """
    Strategy:
    - Uses SMA20 / SMA50 crossover to detect trend direction.
    - If SMA20 > SMA50 and not holding → BUY (trend is up).
    - If SMA20 < SMA50 and holding → SELL (trend reversing).
    - Position size: configurable (default 15 % of cash).
    - No short selling.
    """

    def __init__(self, name: str, initial_cash: float = 100_000.0, params: dict | None = None):
        super().__init__(name, initial_cash)
        params = params or {}
        self.POSITION_FRACTION = params.get("position_size_pct", 0.15)

    def decide(self) -> dict:
        state = self._state
        if state is None:
            return {"type": "HOLD", "ticker": "", "quantity": 0}

        bar = state["current_bar"]
        ticker = bar.get("ticker", "")
        close = bar["Close"]
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
                    self.last_reason = (
                        f"SMA20 ({sma20:.2f}) > SMA50 ({sma50:.2f}) → "
                        f"uptrend detected, entering long at {close:.2f}"
                    )
                    return {"type": "BUY", "ticker": ticker, "quantity": affordable}
            # Already holding – ride the trend
            self.last_reason = (
                f"HOLD – SMA20 ({sma20:.2f}) > SMA50 ({sma50:.2f}), "
                "riding uptrend"
            )
            return {"type": "HOLD", "ticker": ticker, "quantity": 0}

        # ---------- Downtrend / death cross zone ----------
        if sma20 < sma50 and held_qty > 0:
            self.last_reason = (
                f"SMA20 ({sma20:.2f}) < SMA50 ({sma50:.2f}) → "
                f"trend reversal, closing position of {held_qty}"
            )
            return {"type": "SELL", "ticker": ticker, "quantity": held_qty}

        self.last_reason = (
            f"HOLD – SMA20 ({sma20:.2f}), SMA50 ({sma50:.2f}), "
            f"no clear signal"
        )
        return {"type": "HOLD", "ticker": ticker, "quantity": 0}
