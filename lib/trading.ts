const BASE_PRICE = 0.0

export interface ChartPoint {
  time: number
  price: number
  baseline: number
  timestamp: Date
}

// ── Volatility ─────────────────────────────────────────────────────────────
// Volatility regime derived from the live chart data.
// Low    → chart is calm, small price swings
// Medium → chart is moving moderately
// High   → chart is spiking hard in either direction

export type VolatilityRegime = 'low' | 'medium' | 'high'

export interface VolatilitySnapshot {
  regime: VolatilityRegime
  value: number          // raw stddev of recent prices
  multiplier: number     // payout multiplier adjusted for regime
  minStake: number       // minimum stake for this regime
  maxStake: number       // maximum stake for this regime
  label: string          // UI display label e.g. "High Volatility"
  description: string    // short hint shown to the trader
}

/**
 * Compute volatility from the most recent `window` points of the chart.
 * Returns a VolatilitySnapshot with the regime, adjusted multiplier,
 * and stake limits — all derived from how much the chart is moving.
 *
 * Call this on every new tick and pass the result into your trade UI.
 */
export function getVolatilitySnapshot(
  chartData: ChartPoint[],
  window: number = 10
): VolatilitySnapshot {
  if (chartData.length < 2) {
    return {
      regime: 'low',
      value: 0,
      multiplier: 1.75,
      minStake: 50,
      maxStake: 10000,
      label: 'Low Volatility',
      description: 'Market is calm. Lower payouts, lower risk.',
    }
  }

  // Slice the last `window` points
  const recent = chartData.slice(-window).map(p => p.price)

  // Standard deviation of recent prices
  const mean = recent.reduce((s, v) => s + v, 0) / recent.length
  const variance = recent.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / recent.length
  const stddev = Math.sqrt(variance)

  // Classify into regime
  // Chart prices range roughly -2.9 to +2.9, so stddev thresholds:
  //   < 0.25  → low
  //   0.25–0.7 → medium
  //   > 0.7   → high
  let regime: VolatilityRegime
  let multiplier: number
  let minStake: number
  let maxStake: number
  let label: string
  let description: string

  if (stddev < 0.25) {
    regime = 'low'
    multiplier = 1.75   // lower reward — chart barely moves
    minStake = 50
    maxStake = 10000
    label = 'Low Volatility'
    description = 'Market is calm. Lower payouts, lower risk.'
  } else if (stddev < 0.7) {
    regime = 'medium'
    multiplier = 1.85   // standard reward
    minStake = 50
    maxStake = 10000
    label = 'Medium Volatility'
    description = 'Normal market conditions.'
  } else {
    regime = 'high'
    multiplier = 2.1    // higher reward — chart is spiking
    minStake = 50
    maxStake = 5000     // tighter cap during high volatility
    label = 'High Volatility'
    description = 'Market is spiking. Higher payouts but riskier.'
  }

  return {
    regime,
    value: parseFloat(stddev.toFixed(4)),
    multiplier,
    minStake,
    maxStake,
    label,
    description,
  }
}

/**
 * Returns the dominant direction of the chart over the last `window` ticks.
 * Useful for giving the trader a visual cue (trending up / down / flat).
 */
export function getChartTrend(
  chartData: ChartPoint[],
  window: number = 10
): 'up' | 'down' | 'flat' {
  if (chartData.length < 2) return 'flat'
  const recent = chartData.slice(-window)
  const first = recent[0].price
  const last = recent[recent.length - 1].price
  const delta = last - first
  if (Math.abs(delta) < 0.05) return 'flat'
  return delta > 0 ? 'up' : 'down'
}

// ── Chart generation ───────────────────────────────────────────────────────

// Balanced random walk that oscillates around the baseline (0) with
// occasional spikes up/down, mean-reverting so it never drifts away.
function nextStep(price: number, momentum: number): { price: number; momentum: number } {
  const spikeTrigger = Math.random()

  // Bias: the further price is from baseline, the more likely the next
  // spike pulls it back toward zero.
  const bias = Math.max(-0.25, Math.min(0.25, -price * 0.15))
  const upThreshold = 0.6 - bias
  const downThreshold = 0.4 - bias

  let newMomentum = momentum
  if (spikeTrigger > upThreshold) {
    newMomentum = (Math.random() * 1.0 + 0.35)
  } else if (spikeTrigger < downThreshold) {
    newMomentum = -(Math.random() * 1.0 + 0.35)
  }

  // Decay momentum fast and apply mean reversion
  newMomentum *= 0.5
  const reversion = -price * 0.15
  const noise = (Math.random() - 0.5) * 0.1
  const rawPrice = Math.max(-2.9, Math.min(2.9, price + newMomentum + reversion + noise))

  // Light exponential smoothing toward the new value
  const smoothed = parseFloat((price + (rawPrice - price) * 0.7).toFixed(4))

  return { price: smoothed, momentum: newMomentum }
}

export function generateChartData(length = 50, startPrice: number = BASE_PRICE): ChartPoint[] {
  const data: ChartPoint[] = []
  let price = startPrice
  let momentum = 0

  for (let i = 0; i < length; i++) {
    const step = nextStep(price, momentum)
    price = step.price
    momentum = step.momentum

    data.push({
      time: i,
      price,
      baseline: BASE_PRICE,
      timestamp: new Date(Date.now() - (length - i) * 1000),
    })
  }

  return data
}

// Note: `trend` param kept for backwards compatibility but unused.
export function generateNextPrice(lastPrice: number, trend: number = 0): number {
  const step = nextStep(lastPrice, 0)
  return step.price
}

// ── Trade result helpers ───────────────────────────────────────────────────

export function calculateTradeResult(
  entryPrice: number,
  exitPrice: number,
  direction: 'buy' | 'sell'
): 'win' | 'loss' {
  if (direction === 'buy') {
    return exitPrice > entryPrice ? 'win' : 'loss'
  } else {
    return exitPrice < entryPrice ? 'win' : 'loss'
  }
}

/**
 * Final P&L when the user manually closes a trade.
 * Pass in the VolatilitySnapshot.multiplier so payout reflects
 * the volatility regime that was active when the trade was opened.
 */
export function calculateProfitLoss(
  entryPrice: number,
  exitPrice: number,
  direction: 'buy' | 'sell',
  stake: number,
  multiplier: number = 1.85
): number {
  const result = calculateTradeResult(entryPrice, exitPrice, direction)
  if (result === 'win') {
    return parseFloat((stake * (multiplier - 1)).toFixed(2))
  } else {
    return -stake
  }
}

/**
 * Live P&L while the trade is still open (called on every chart tick).
 * Pass in the same multiplier that was captured at trade entry.
 */
export function getLivePnL(
  entryPrice: number,
  currentPrice: number,
  direction: 'buy' | 'sell',
  stake: number,
  multiplier: number = 1.85
): {
  pnl: number
  isWinning: boolean
  result: 'win' | 'loss'
} {
  const result = calculateTradeResult(entryPrice, currentPrice, direction)
  const pnl =
    result === 'win'
      ? parseFloat((stake * (multiplier - 1)).toFixed(2))
      : -stake

  return { pnl, isWinning: result === 'win', result }
}

// ── Formatting ─────────────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatPrice(price: number): string {
  return price.toFixed(4)
}

export function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return 0
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100
}

// ── Stake validation ───────────────────────────────────────────────────────

/**
 * Validate a stake against the user's balance AND the current volatility
 * regime's stake limits. Pass in a VolatilitySnapshot to enforce
 * regime-specific min/max limits.
 */
export function validateStake(
  stake: number,
  balance: number,
  minStake: number = 50,
  maxStake: number = 10000
): { valid: boolean; error?: string } {
  if (isNaN(stake) || stake <= 0) {
    return { valid: false, error: 'Enter a valid stake amount' }
  }
  if (stake < minStake) {
    return { valid: false, error: `Minimum stake is KES ${minStake}` }
  }
  if (stake > maxStake) {
    return { valid: false, error: `Maximum stake is KES ${maxStake.toLocaleString()}` }
  }
  if (stake > balance) {
    return {
      valid: false,
      error: `Insufficient balance. Available: KES ${balance.toFixed(2)}`,
    }
  }
  return { valid: true }
}

/**
 * Convenience wrapper — validates stake using the limits from the
 * current volatility snapshot rather than hardcoded defaults.
 */
export function validateStakeForVolatility(
  stake: number,
  balance: number,
  snapshot: VolatilitySnapshot
): { valid: boolean; error?: string } {
  return validateStake(stake, balance, snapshot.minStake, snapshot.maxStake)
}

// ── Payout preview ─────────────────────────────────────────────────────────

/**
 * Show the trader what they stand to win/lose before placing a trade.
 * Pass in VolatilitySnapshot.multiplier so the preview is accurate
 * for the current market regime.
 */
export function calculatePotentialPayout(
  stake: number,
  multiplier: number = 1.85
): { profit: number; payout: number; loss: number } {
  return {
    profit: parseFloat((stake * (multiplier - 1)).toFixed(2)),
    payout: parseFloat((stake * multiplier).toFixed(2)),
    loss: -stake,
  }
}

export const CHART_BASE_PRICE = BASE_PRICE