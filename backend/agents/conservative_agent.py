"""
Conservative Agent – low-risk, small positions, only trades in calm markets.
Supports configurable risk_pct and stop_loss_pct via params dict.

This agent is an **autonomous, goal-driven, rule-based decision maker**.

Agentic loop:
    perceive()  → extracts price, SMA20, SMA50, volatility, ticker
    reason()    → applies volatility filter + stop-loss + entry rules
    act()       → inherited from TradingAgent
    step()      → inherited from TradingAgent (orchestrates the loop)
"""

from __future__ import annotations

from agents.base_agent import TradingAgent


class ConservativeAgent(TradingAgent):
    """
    Autonomous Conservative Trading Agent.

    **Goal**: Preserve capital and achieve small, steady returns by only
    entering positions during low-volatility (calm) market conditions.

    **Inputs**:
        - Current price (Close)
        - SMA20, SMA50 (trend indicators)
        - Rolling Volatility (risk filter)
        - Average cost basis (for stop-loss)

    **Decision logic** (implemented in ``reason()``):
        1. If holding and price drops below stop-loss threshold → SELL all.
        2. If volatility > threshold → HOLD (market too risky).
        3. If price < SMA50 AND SMA20 > SMA50 (mild uptrend, not overextended)
           → BUY a small position (default 7 % of cash).
        4. Otherwise → HOLD.
    """

    def __init__(self, name: str, initial_cash: float = 100_000.0, params: dict | None = None):
        super().__init__(name, initial_cash)
        self.goal = "Stable low-risk returns using volatility filters."
        params = params or {}
        self.VOLATILITY_THRESHOLD = params.get("volatility_threshold", 0.02)
        self.POSITION_FRACTION = params.get("risk_pct", 0.07)
        self.STOP_LOSS_PCT = params.get("stop_loss_pct", 0.03)

    # ------------------------------------------------------------------ #
    # Agentic overrides
    # ------------------------------------------------------------------ #

    def reason(self, observation: dict) -> dict:
        """Conservative rule-based strategy: volatility filter + stop-loss."""
        price = observation.get("price", 0)
        sma20 = observation.get("sma20", price)
        sma50 = observation.get("sma50", price)
        vol = observation.get("volatility", 0) or 0
        ticker = observation.get("ticker", "")

        held_qty = self.positions.get(ticker, 0)
        avg = self.avg_cost.get(ticker, 0)

        # ---------- Stop-loss check ----------
        if held_qty > 0 and avg > 0:
            if price < avg * (1 - self.STOP_LOSS_PCT):
                return {
                    "intent": "SELL",
                    "size_factor": 1.0,
                    "ticker": ticker,
                    "notes": (
                        f"Stop-loss triggered: price {price:.2f} < "
                        f"{avg*(1-self.STOP_LOSS_PCT):.2f} "
                        f"(avg_cost {avg:.2f} - {self.STOP_LOSS_PCT*100}%)"
                    ),
                }

        # ---------- Volatility filter ----------
        if vol > self.VOLATILITY_THRESHOLD:
            return {
                "intent": "HOLD",
                "size_factor": 0.0,
                "ticker": ticker,
                "notes": (
                    f"Volatility {vol:.4f} > max {self.VOLATILITY_THRESHOLD}, "
                    f"risk too high -> stay in cash."
                ),
            }

        # ---------- Entry condition ----------
        if price < sma50 and sma20 > sma50 and held_qty == 0:
            return {
                "intent": "BUY",
                "size_factor": self.POSITION_FRACTION,
                "ticker": ticker,
                "notes": (
                    f"Low volatility ({vol:.4f}), price {price:.2f} < SMA50 "
                    f"{sma50:.2f}, SMA20 {sma20:.2f} > SMA50 -> small long entry"
                ),
            }

        return {
            "intent": "HOLD",
            "size_factor": 0.0,
            "ticker": ticker,
            "notes": "Conditions not met for conservative entry -> HOLD.",
        }
