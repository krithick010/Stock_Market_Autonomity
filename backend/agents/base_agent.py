"""
Base trading agent class.
Every concrete agent inherits from TradingAgent and implements `decide()`.
"""

import math


class TradingAgent:
    """
    Abstract base class for all autonomous trading agents.

    Attributes:
        name                   – human-readable agent name
        cash                   – available cash balance
        positions              – dict {ticker: quantity}
        avg_cost               – dict {ticker: average_cost_basis}
        portfolio_value_history – list of portfolio values over time
        last_action            – last action dict or None
        last_reason            – human-readable explanation of last decision
        halted                 – True when circuit breaker has halted this agent
        active                 – whether agent participates in simulation steps
    """

    def __init__(self, name: str, initial_cash: float = 100_000.0):
        self.name = name
        self.cash = initial_cash
        self.initial_cash = initial_cash
        self.positions: dict[str, int] = {}
        self.avg_cost: dict[str, float] = {}
        self.portfolio_value_history: list[float] = []
        self.last_action: dict | None = None
        self.last_reason: str = ""
        self._state: dict | None = None
        self.halted: bool = False
        self.active: bool = True
        self._peak_value: float = initial_cash

    # ------------------------------------------------------------------ #
    # Interface methods (override in subclasses)
    # ------------------------------------------------------------------ #

    def observe_market_state(self, state: dict):
        """Store the current market state for use in `decide()`."""
        self._state = state

    def decide(self) -> dict:
        """
        Decide on a trading action.

        Returns:
            dict with keys:
                type     – "BUY" | "SELL" | "HOLD"
                ticker   – str
                quantity – int  (>= 0)
        """
        raise NotImplementedError("Subclasses must implement decide()")

    def update_after_step(self, reward: float, new_state: dict):
        """Hook called after each simulation step (for adaptation logic)."""
        pass

    # ------------------------------------------------------------------ #
    # Portfolio helpers
    # ------------------------------------------------------------------ #

    def get_portfolio_value(self, current_price: float, ticker: str = "") -> float:
        """
        Compute total portfolio value = cash + sum(positions * current_price).
        For single-ticker simulation, pass the ticker or leave blank
        (will sum all positions).
        """
        holdings_value = 0.0
        for t, qty in self.positions.items():
            if ticker and t != ticker:
                continue
            holdings_value += qty * current_price
        return self.cash + holdings_value

    def execute_action(self, action: dict, current_price: float):
        """
        Actually apply a trade to cash / positions.
        Assumes the action has already been reviewed by the regulator.
        """
        action_type = action.get("type", "HOLD")
        ticker = action.get("ticker", "")
        quantity = action.get("quantity", 0)

        if action_type == "BUY" and quantity > 0:
            cost = quantity * current_price
            if cost <= self.cash:
                self.cash -= cost
                prev_qty = self.positions.get(ticker, 0)
                prev_cost = self.avg_cost.get(ticker, 0.0)
                new_qty = prev_qty + quantity
                # Update average cost basis
                if new_qty > 0:
                    self.avg_cost[ticker] = (
                        (prev_cost * prev_qty + current_price * quantity) / new_qty
                    )
                self.positions[ticker] = new_qty

        elif action_type == "SELL" and quantity > 0:
            current_qty = self.positions.get(ticker, 0)
            sell_qty = min(quantity, current_qty)  # cannot sell more than held
            if sell_qty > 0:
                self.cash += sell_qty * current_price
                self.positions[ticker] = current_qty - sell_qty
                if self.positions[ticker] == 0:
                    self.positions.pop(ticker, None)
                    self.avg_cost.pop(ticker, None)

        self.last_action = action

    # ------------------------------------------------------------------ #
    # Risk metrics
    # ------------------------------------------------------------------ #

    def get_risk_metrics(self, current_price: float, ticker: str = "") -> dict:
        """
        Compute per-agent risk metrics:
        - return_pct       – total return since inception
        - max_drawdown_pct – worst peak-to-trough decline
        - sharpe_ratio     – annualised Sharpe (risk-free = 0%)
        """
        pv = self.get_portfolio_value(current_price, ticker)

        # Return %
        return_pct = ((pv - self.initial_cash) / self.initial_cash) * 100 if self.initial_cash > 0 else 0.0

        # Max drawdown
        peak = self.initial_cash
        max_dd = 0.0
        for v in self.portfolio_value_history:
            if v > peak:
                peak = v
            dd = (v - peak) / peak if peak > 0 else 0
            if dd < max_dd:
                max_dd = dd

        # current drawdown from peak for circuit-breaker
        if pv > self._peak_value:
            self._peak_value = pv
        current_dd = (pv - self._peak_value) / self._peak_value if self._peak_value > 0 else 0

        # Sharpe ratio (step-wise returns)
        if len(self.portfolio_value_history) >= 2:
            returns = []
            for i in range(1, len(self.portfolio_value_history)):
                prev = self.portfolio_value_history[i - 1]
                if prev > 0:
                    returns.append((self.portfolio_value_history[i] - prev) / prev)
            if returns:
                avg_r = sum(returns) / len(returns)
                std_r = math.sqrt(sum((r - avg_r) ** 2 for r in returns) / len(returns)) if len(returns) > 1 else 0
                sharpe = (avg_r / std_r) if std_r > 0 else 0.0
            else:
                sharpe = 0.0
        else:
            sharpe = 0.0

        return {
            "return_pct": round(return_pct, 2),
            "max_drawdown_pct": round(max_dd * 100, 2),
            "sharpe_ratio": round(sharpe, 2),
            "current_drawdown_pct": round(current_dd * 100, 2),
        }

    def to_dict(self, current_price: float, ticker: str = "") -> dict:
        """Serialise agent state for the frontend."""
        pv = self.get_portfolio_value(current_price, ticker)
        risk = self.get_risk_metrics(current_price, ticker)
        return {
            "name": self.name,
            "cash": round(self.cash, 2),
            "positions": dict(self.positions),
            "portfolio_value": round(pv, 2),
            "last_action": self.last_action,
            "last_reason": self.last_reason,
            "halted": self.halted,
            "active": self.active,
            "return_pct": risk["return_pct"],
            "max_drawdown_pct": risk["max_drawdown_pct"],
            "sharpe_ratio": risk["sharpe_ratio"],
        }
