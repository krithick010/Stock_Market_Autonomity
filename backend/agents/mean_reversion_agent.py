"""
Mean-Reversion Agent – buys at lower Bollinger Band, sells at upper.

This agent is an **autonomous, goal-driven, rule-based decision maker**.

Agentic loop:
    perceive()  → extracts price, BB_MID, BB_UP, BB_LOW, ticker
    reason()    → applies Bollinger Band oversold/overbought rules
    act()       → inherited from TradingAgent
    step()      → inherited from TradingAgent (orchestrates the loop)
"""

from __future__ import annotations

from agents.base_agent import TradingAgent


class MeanReversionAgent(TradingAgent):
    """
    Autonomous Mean-Reversion Trading Agent.

    **Goal**: Profit from the statistical tendency of prices to revert
    to their moving average after extreme deviations.

    **Inputs**:
        - Current price (Close)
        - Bollinger Band Mid (BB_MID = SMA20)
        - Bollinger Band Upper (BB_UP) and Lower (BB_LOW)

    **Decision logic** (implemented in ``reason()``):
        1. If price < BB_LOW → price is oversold → BUY (default 12 %
           of cash).
        2. If price > BB_UP and holding → price overbought → SELL
           entire position.
        3. Otherwise → HOLD (price is within normal bands).
    """

    def __init__(self, name: str, initial_cash: float = 100_000.0, params: dict | None = None):
        super().__init__(name, initial_cash)
        self.goal = "Buy oversold, sell overbought using Bollinger bands."
        params = params or {}
        self.POSITION_FRACTION = params.get("position_size_pct", 0.12)
        self.BAND_MULTIPLIER = params.get("band_multiplier", 2.0)

    # ------------------------------------------------------------------ #
    # Agentic overrides
    # ------------------------------------------------------------------ #

    def perceive(self, market_state: dict) -> dict:
        """Extract observation with Bollinger Band details."""
        obs = super().perceive(market_state)

        # Pull BB_MID for custom-multiplier band recomputation
        bar = market_state.get("current_bar", market_state)
        obs["bb_mid"] = bar.get("BB_MID", obs["sma20"])
        return obs

    def reason(self, observation: dict) -> dict:
        """Bollinger Band mean-reversion strategy."""
        price = observation.get("price", 0)
        ticker = observation.get("ticker", "")
        bb_mid = observation.get("bb_mid", price)

        # Recompute custom bands using configurable multiplier
        default_up = observation.get("bb_up") or price
        half_width = (default_up - bb_mid) if bb_mid else 0
        scale = self.BAND_MULTIPLIER / 2.0 if half_width else 1.0
        bb_up = bb_mid + half_width * scale
        bb_low = bb_mid - half_width * scale

        held_qty = self.positions.get(ticker, 0)

        # ---------- Oversold → BUY ----------
        if price < bb_low and price > 0:
            return {
                "intent": "BUY",
                "size_factor": self.POSITION_FRACTION,
                "ticker": ticker,
                "notes": (
                    f"Price {price:.2f} < BB_LOW {bb_low:.2f}, "
                    f"oversold region -> expecting mean reversion. "
                    f"(BB_MID={bb_mid:.2f}, BB_UP={bb_up:.2f})"
                ),
            }

        # ---------- Overbought → SELL ----------
        if price > bb_up and held_qty > 0:
            return {
                "intent": "SELL",
                "size_factor": 1.0,
                "ticker": ticker,
                "notes": (
                    f"Price {price:.2f} > BB_UP {bb_up:.2f}, "
                    f"overbought -> closing {held_qty} shares. "
                    f"(BB_MID={bb_mid:.2f}, BB_LOW={bb_low:.2f})"
                ),
            }

        return {
            "intent": "HOLD",
            "size_factor": 0.0,
            "ticker": ticker,
            "notes": (
                f"Price {price:.2f} within bands "
                f"[{bb_low:.2f}, {bb_up:.2f}] -> HOLD."
            ),
        }
