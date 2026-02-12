"""
Mean-Reversion Agent – buys at lower Bollinger Band, sells at upper.
"""

from agents.base_agent import TradingAgent


class MeanReversionAgent(TradingAgent):
    """
    Strategy:
    - Uses Bollinger Bands (20-period, configurable band_multiplier std).
    - If Close < BB_LOW → price oversold → BUY.
    - If Close > BB_UP  → price overbought → SELL / close position.
    - Medium position sizing (configurable, default 12 % of cash).
    """

    def __init__(self, name: str, initial_cash: float = 100_000.0, params: dict | None = None):
        super().__init__(name, initial_cash)
        params = params or {}
        self.POSITION_FRACTION = params.get("position_size_pct", 0.12)
        self.BAND_MULTIPLIER = params.get("band_multiplier", 2.0)

    def decide(self) -> dict:
        state = self._state
        if state is None:
            return {"type": "HOLD", "ticker": "", "quantity": 0}

        bar = state["current_bar"]
        ticker = bar.get("ticker", "")
        close = bar["Close"]
        bb_mid = bar.get("BB_MID", close)
        # Recompute custom bands using configurable multiplier
        # BB_UP/BB_LOW in data use 2σ; scale to our multiplier
        default_up = bar.get("BB_UP", close)
        default_low = bar.get("BB_LOW", close)
        half_width = (default_up - bb_mid) if bb_mid else 0
        scale = self.BAND_MULTIPLIER / 2.0 if half_width else 1.0
        bb_up = bb_mid + half_width * scale
        bb_low = bb_mid - half_width * scale

        held_qty = self.positions.get(ticker, 0)

        # ---------- Oversold → BUY ----------
        if close < bb_low:
            affordable = int(
                (self.cash * self.POSITION_FRACTION) / close
            ) if close > 0 else 0
            if affordable > 0:
                self.last_reason = (
                    f"Price {close:.2f} < BB_LOW {bb_low:.2f} → "
                    f"oversold, mean-reversion BUY "
                    f"(BB_MID={bb_mid:.2f}, BB_UP={bb_up:.2f})"
                )
                return {"type": "BUY", "ticker": ticker, "quantity": affordable}

        # ---------- Overbought → SELL ----------
        if close > bb_up and held_qty > 0:
            self.last_reason = (
                f"Price {close:.2f} > BB_UP {bb_up:.2f} → "
                f"overbought, closing {held_qty} shares "
                f"(BB_MID={bb_mid:.2f}, BB_LOW={bb_low:.2f})"
            )
            return {"type": "SELL", "ticker": ticker, "quantity": held_qty}

        self.last_reason = (
            f"HOLD – price {close:.2f} within bands "
            f"[{bb_low:.2f}, {bb_up:.2f}]"
        )
        return {"type": "HOLD", "ticker": ticker, "quantity": 0}
