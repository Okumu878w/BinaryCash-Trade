// Generate oscillating price data — prices between -3 and +3 like the screenshots
export function generateChartData(length: number = 50, startPrice: number = 0) {
  const data = []
  let price = startPrice
  const volatility = 0.15

  for (let i = 0; i < length; i++) {
    const change = (Math.random() - 0.48) * volatility
    price = Math.max(-2.9, Math.min(2.9, price + change))

    data.push({
      time: i,
      price: parseFloat(price.toFixed(4)),
      timestamp: new Date(Date.now() - (length - i) * 1000),
    })
  }

  return data
}

// Generate next price in real-time
export function generateNextPrice(lastPrice: number, trend: number = 0): number {
  const volatility = 0.15
  const change = (Math.random() - 0.48) * volatility + trend
  const price = Math.max(-2.9, Math.min(2.9, lastPrice + change))
  return parseFloat(price.toFixed(4))
}

// Win/loss based on direction vs price movement
export function calculateTradeResult(
  entryPrice: number,
  exitPrice: number,
  direction: 'buy' | 'sell'
): 'win' | 'loss' {
  if (direction === 'buy') {
    // BUY wins if price went UP from entry
    return exitPrice > entryPrice ? 'win' : 'loss'
  } else {
    // SELL wins if price went DOWN from entry
    return exitPrice < entryPrice ? 'win' : 'loss'
  }
}

// Fixed multiplier P&L — binary options style
// Win: +85% of stake (1.85x multiplier)
// Loss: -100% of stake
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

// Get live P&L during active trade
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

  return {
    pnl,
    isWinning: result === 'win',
    result,
  }
}

// Format currency in KES
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Format price to 4 decimal places
export function formatPrice(price: number): string {
  return price.toFixed(4)
}

// Calculate percentage change between two values
export function calculatePercentageChange(
  oldValue: number,
  newValue: number
): number {
  if (oldValue === 0) return 0
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100
}

// Validate stake amount
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

// Calculate potential payout before trade
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