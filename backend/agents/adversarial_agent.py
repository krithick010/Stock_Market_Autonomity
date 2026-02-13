"""
Adversarial Agent – simulates pump-and-dump manipulation.

This agent is an **autonomous, goal-driven, rule-based decision maker**
(goal: stress-test the Regulator by attempting manipulative trading).
"""

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

    **Decision logic**:
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
        params = params or {}
        self.PUMP_FRACTION = params.get("pump_fraction", 0.25)
        self.DUMP_THRESHOLD = params.get("dump_threshold", 0.03)
        self.VOLUME_LOW_PCTILE = params.get("volume_low_pctile", 0.30)
        self.PUMP_PROBABILITY = params.get("pump_probability", 0.20)
        self._volume_history: list[float] = []
        self._phase = "idle"  # "idle" | "pumping" | "ready_to_dump"

    def observe_market_state(self, state: dict):
        super().observe_market_state(state)
        bar = state.get("current_bar", {})
        vol = bar.get("Volume", 0)
        self._volume_history.append(vol)

    def _is_low_volume(self) -> bool:
        """Check if current volume is in the lower quartile of history."""
        if len(self._volume_history) < 5:
            return False
        current = self._volume_history[-1]
        sorted_vols = sorted(self._volume_history)
        idx = int(len(sorted_vols) * self.VOLUME_LOW_PCTILE)
        threshold = sorted_vols[idx]
        return current <= threshold

    def decide(self) -> dict:
        state = self._state
        if state is None:
            return {"type": "HOLD", "ticker": "", "quantity": 0}

        bar = state["current_bar"]
        ticker = bar.get("ticker", "")
        close = bar["Close"]
        held_qty = self.positions.get(ticker, 0)
        avg = self.avg_cost.get(ticker, 0)

        # ---------- Dump phase ----------
        if held_qty > 0 and avg > 0:
            gain_pct = (close - avg) / avg
            if gain_pct >= self.DUMP_THRESHOLD:
                self._phase = "dump"
                self.last_reason = (
                    f"DUMP phase: gain {gain_pct*100:.1f}% >= "
                    f"{self.DUMP_THRESHOLD*100:.0f}% threshold, "
                    f"dumping {held_qty} shares at {close:.2f}"
                )
                return {"type": "SELL", "ticker": ticker, "quantity": held_qty}

        # ---------- Pump phase ----------
        if self._is_low_volume() and random.random() < self.PUMP_PROBABILITY:
            affordable = int(
                (self.cash * self.PUMP_FRACTION) / close
            ) if close > 0 else 0
            if affordable > 0:
                self._phase = "pump"
                self.last_reason = (
                    f"PUMP phase: low-volume zone detected, "
                    f"burst-buying {affordable} shares at {close:.2f}"
                )
                return {"type": "BUY", "ticker": ticker, "quantity": affordable}

        self._phase = "idle"
        self.last_reason = "Adversarial agent idle – conditions not met"
        return {"type": "HOLD", "ticker": ticker, "quantity": 0}
