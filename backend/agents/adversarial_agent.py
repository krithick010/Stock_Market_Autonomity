"""
Adversarial Agent – simulates pump-and-dump manipulation.

This agent is an **autonomous, goal-driven, rule-based decision maker**
(goal: stress-test the Regulator by attempting manipulative trading).

Agentic loop:
    perceive()  → extracts price, volume, ticker; tracks volume history
    reason()    → applies pump-and-dump rules (volume percentile + gain threshold)
    act()       → inherited from TradingAgent
    step()      → inherited from TradingAgent (orchestrates the loop)
"""

from __future__ import annotations

import random
from agents.base_agent import TradingAgent


class AdversarialAgent(TradingAgent):
    """
    Autonomous Adversarial Trading Agent.

    **Goal**: Simulate pump-and-dump market manipulation to stress-test
    the Regulator agent's detection and enforcement capabilities.

    **Inputs**:
        - Current price (Close)
        - Volume (to detect low-volume windows)
        - Average cost basis (for dump-threshold check)
        - Internal volume history (to compute percentile)

    **Decision logic** (implemented in ``reason()``):
        1. **Dump phase**: if holding shares and unrealised gain >=
           dump_threshold (default 3 %) → SELL entire position.
        2. **Pump phase**: if current volume is in the lower quartile
           of recent history AND random trigger fires → BUY large
           position (default 25 % of cash).
        3. Otherwise → HOLD (idle).

    All actions are clearly labelled as "PUMP phase" or "DUMP phase"
    in ``last_reason`` so the Regulator can flag them.
    """

    def __init__(self, name: str, initial_cash: float = 100_000.0, params: dict | None = None):
        super().__init__(name, initial_cash)
        self.goal = "Stress-test compliance with manipulative behaviour."
        params = params or {}
        self.PUMP_FRACTION = params.get("pump_fraction", 0.25)
        self.DUMP_THRESHOLD = params.get("dump_threshold", 0.03)
        self.VOLUME_LOW_PCTILE = params.get("volume_low_pctile", 0.30)
        self.PUMP_PROBABILITY = params.get("pump_probability", 0.20)
        self._volume_history: list[float] = []
        self._phase = "idle"  # "idle" | "pumping" | "ready_to_dump"

    # ------------------------------------------------------------------ #
    # Agentic overrides
    # ------------------------------------------------------------------ #

    def perceive(self, market_state: dict) -> dict:
        """Extract observation and track volume history for low-volume detection."""
        obs = super().perceive(market_state)

        bar = market_state.get("current_bar", market_state)
        volume = bar.get("Volume", 0)
        self._volume_history.append(volume)
        obs["volume"] = volume
        return obs

    def _is_low_volume(self) -> bool:
        """Check if current volume is in the lower quartile of history."""
        if len(self._volume_history) < 5:
            return False
        current = self._volume_history[-1]
        sorted_vols = sorted(self._volume_history)
        idx = int(len(sorted_vols) * self.VOLUME_LOW_PCTILE)
        threshold = sorted_vols[idx]
        return current <= threshold

    def reason(self, observation: dict) -> dict:
        """Pump-and-dump strategy: exploit low-volume windows."""
        price = observation.get("price", 0)
        ticker = observation.get("ticker", "")
        held_qty = self.positions.get(ticker, 0)
        avg = self.avg_cost.get(ticker, 0)

        # ---------- Dump phase ----------
        if held_qty > 0 and avg > 0 and price > 0:
            gain_pct = (price - avg) / avg
            if gain_pct >= self.DUMP_THRESHOLD:
                self._phase = "dump"
                return {
                    "intent": "SELL",
                    "size_factor": 1.0,
                    "ticker": ticker,
                    "notes": (
                        f"DUMP phase: gain {gain_pct*100:.1f}% >= "
                        f"{self.DUMP_THRESHOLD*100:.0f}% threshold, "
                        f"dumping {held_qty} shares at {price:.2f}. "
                        f"Detected low liquidity after pump phase -> initiating 100% dump."
                    ),
                }

        # ---------- Pump phase ----------
        if self._is_low_volume() and random.random() < self.PUMP_PROBABILITY:
            self._phase = "pump"
            return {
                "intent": "BUY",
                "size_factor": self.PUMP_FRACTION,
                "ticker": ticker,
                "notes": (
                    f"PUMP phase: low-volume zone detected, "
                    f"burst-buying at {price:.2f}."
                ),
            }

        self._phase = "idle"
        return {
            "intent": "HOLD",
            "size_factor": 0.0,
            "ticker": ticker,
            "notes": "Adversarial agent idle - conditions not met for pump or dump.",
        }
