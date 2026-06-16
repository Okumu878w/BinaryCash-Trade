'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createTrade, closeTrade } from '@/lib/api'
import {
  generateNextPrice,
  validateStake,
  calculatePotentialPayout,
} from '@/lib/trading'

// ── Win probability ────────────────────────────────────────────────────────
// House edge: trader wins 45% of the time, loses 55%.
// Swap to 0.5 for a fair coin, or lower for a stronger house edge.
const WIN_PROBABILITY = 0.45

function resolveOutcome(): 'win' | 'loss' {
  return Math.random() < WIN_PROBABILITY ? 'win' : 'loss'
}

// ── Types ──────────────────────────────────────────────────────────────────

interface TradingControlsProps {
  userId: string
  balance: number
  accountType: 'demo' | 'real'
  onTradeCreated?: (result: 'win' | 'loss', pnl: number) => void
  onTradeStarted?: () => void
  onDirectionChange?: (direction: 'buy' | 'sell' | null) => void
}

// ── Component ──────────────────────────────────────────────────────────────

export function TradingControls({
  userId,
  balance,
  accountType,
  onTradeCreated,
  onTradeStarted,
  onDirectionChange,
}: TradingControlsProps) {
  const [stake, setStake] = useState(200)
  const [autosellTime, setAutosellTime] = useState(30)
  const [timeLeft, setTimeLeft] = useState(0)
  const [activeDirection, setActiveDirection] = useState<'buy' | 'sell' | null>(null)
  const [loading, setLoading] = useState(false)
  const [entryPrice, setEntryPrice] = useState<number | null>(null)
  const [displayPrice, setDisplayPrice] = useState<number>(0)
  const [tradeId, setTradeId] = useState<string | null>(null)
  const [profitLoss, setProfitLoss] = useState<number | null>(null)
  const [tradeResult, setTradeResult] = useState<'win' | 'loss' | null>(null)
  const [closing, setClosing] = useState(false)
  const [stakeError, setStakeError] = useState<string | null>(null)
  const [isWinning, setIsWinning] = useState<boolean | null>(null)

  // Multiplier is fixed at 1.85 for now (can be wired to VolatilitySnapshot later)
  const MULTIPLIER = 1.85

  // ── Internal price ticker ────────────────────────────────────────────────
  // Runs independently of the chart; drives entryPrice and the live P&L display.

  const priceRef = useRef<number>(0)

  useEffect(() => {
    const ticker = setInterval(() => {
      const next = generateNextPrice(priceRef.current)
      priceRef.current = next
      setDisplayPrice(next)

      // While a trade is active, update the live "is winning?" indicator
      // based on current simulated price vs entry (visual only — outcome
      // is still determined by resolveOutcome() when the timer expires).
      setIsWinning((prev) => {
        // only update when trade is live
        if (entryPrice === null || closing) return prev
        if (activeDirection === 'buy') return next > entryPrice
        if (activeDirection === 'sell') return next < entryPrice
        return prev
      })
    }, 300)

    return () => clearInterval(ticker)
  }, [entryPrice, activeDirection, closing])

  // ── Notify parent of direction changes ───────────────────────────────────

  useEffect(() => {
    onDirectionChange?.(activeDirection)
  }, [activeDirection, onDirectionChange])

  // ── Stake validation ─────────────────────────────────────────────────────

  useEffect(() => {
    if (activeDirection) return
    const validation = validateStake(stake, balance)
    setStakeError(validation.valid ? null : validation.error ?? null)
  }, [stake, balance, activeDirection])

  // ── Settle the trade ─────────────────────────────────────────────────────

  const settleTrade = useCallback(async () => {
    if (!activeDirection || !tradeId || closing) return
    setClosing(true)

    const result = resolveOutcome()
    const pnl =
      result === 'win'
        ? parseFloat((stake * (MULTIPLIER - 1)).toFixed(2))
        : -stake

    // Use whatever price the internal ticker is at as the "exit price" for
    // the API record — it's cosmetic since outcome is already decided.
    const exitPrice = priceRef.current

    try {
      await closeTrade(tradeId, exitPrice, result)
    } catch (err) {
      console.error('closeTrade API error:', err)
    }

    setProfitLoss(pnl)
    setTradeResult(result)

    setTimeout(() => {
      setActiveDirection(null)
      setTimeLeft(0)
      setEntryPrice(null)
      setTradeId(null)
      setProfitLoss(null)
      setTradeResult(null)
      setIsWinning(null)
      setClosing(false)
      onTradeCreated?.(result, pnl)
    }, 2000)
  }, [activeDirection, tradeId, closing, stake, onTradeCreated])

  // ── Timer countdown ──────────────────────────────────────────────────────

  const settleRef = useRef(settleTrade)
  useEffect(() => { settleRef.current = settleTrade }, [settleTrade])

  useEffect(() => {
    if (!activeDirection) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          settleRef.current()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [activeDirection])

  // ── Manual early close ───────────────────────────────────────────────────

  const handleManualClose = async () => {
    if (closing) return
    await settleTrade()
  }

  // ── Open a trade ─────────────────────────────────────────────────────────

  const handleTrade = async (direction: 'buy' | 'sell') => {
    if (loading || activeDirection) return

    const validation = validateStake(stake, balance)
    if (!validation.valid) {
      setStakeError(validation.error ?? null)
      return
    }

    setLoading(true)
    setTradeResult(null)
    setStakeError(null)

    try {
      const entry = priceRef.current
      setEntryPrice(entry)
      setActiveDirection(direction)
      setTimeLeft(autosellTime)
      onTradeStarted?.()

      const expiresAt = new Date(Date.now() + autosellTime * 1000)
      const tradeData = await createTrade(
        userId,
        'KES/USD',
        direction,
        stake,
        entry,
        accountType,
        expiresAt
      )

      if (tradeData && tradeData.length > 0) {
        setTradeId(tradeData[0].id)
      }
    } catch (error) {
      console.error('Error initiating trade:', error)
      setActiveDirection(null)
    } finally {
      setLoading(false)
    }
  }

  // ── Derived display values ───────────────────────────────────────────────

  const timerProgress = autosellTime > 0 ? (timeLeft / autosellTime) * 100 : 0
  const payout = calculatePotentialPayout(stake, MULTIPLIER)

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="bg-surface border border-border rounded-lg p-4 md:p-6 space-y-4">

      {/* Trade Result Banner */}
      {tradeResult && (
        <div className={`border rounded-lg p-4 text-center ${
          tradeResult === 'win'
            ? 'bg-primary/20 border-primary animate-pulse'
            : 'bg-destructive/20 border-destructive animate-pulse'
        }`}>
          <div className="text-2xl font-bold mb-1">
            {tradeResult === 'win' ? '🎉 YOU WIN!' : '❌ YOU LOSE'}
          </div>
          <div className={`text-3xl font-bold font-mono ${
            tradeResult === 'win' ? 'text-primary' : 'text-destructive'
          }`}>
            {profitLoss !== null && (profitLoss >= 0 ? '+' : '')}
            {profitLoss?.toFixed(2)} KES
          </div>
          <div className="text-xs text-muted mt-2">
            {tradeResult === 'win'
              ? `KES ${payout.payout.toFixed(2)} returned to your balance`
              : `KES ${stake} deducted from your balance`}
          </div>
        </div>
      )}

      {/* Live P&L Display during active trade */}
      {activeDirection && !tradeResult && (
        <div className={`border rounded-lg p-4 text-center transition-all duration-300 ${
          isWinning === true
            ? 'bg-primary/10 border-primary'
            : isWinning === false
            ? 'bg-destructive/10 border-destructive'
            : 'bg-surface border-border'
        }`}>
          <div className="text-xs text-muted uppercase tracking-wider font-semibold mb-1">
            LIVE PRICE
          </div>
          <div className="text-4xl font-bold font-mono text-foreground">
            {displayPrice.toFixed(4)}
          </div>
          <div className="text-xs text-muted mt-2 space-x-2">
            <span>Entry: <span className="text-foreground">{entryPrice?.toFixed(4)}</span></span>
            <span>|</span>
            <span>Direction: <span className="text-foreground uppercase">{activeDirection}</span></span>
            <span>|</span>
            <span>Max win: <span className="text-primary">+{payout.profit.toFixed(2)} KES</span></span>
          </div>
          {isWinning !== null && (
            <div className={`text-xs font-semibold mt-2 ${isWinning ? 'text-primary' : 'text-destructive'}`}>
              {isWinning ? '📈 Currently WINNING' : '📉 Currently LOSING'}
            </div>
          )}
          <div className="text-xs text-muted mt-1 italic">
            * Final result is determined when timer expires
          </div>
        </div>
      )}

      {/* Stake and Autosell — only shown when no active trade */}
      {!activeDirection && (
        <>
          {/* Stake Amount */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-muted uppercase tracking-wider">
              STAKE AMOUNT
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[200, 500, 1000, 2000].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setStake(amount)}
                  className={`px-3 py-2 rounded font-medium text-sm transition-all ${
                    stake === amount
                      ? 'bg-primary text-black ring-2 ring-primary/50'
                      : 'bg-surface border border-border text-foreground hover:border-primary/50'
                  }`}
                >
                  {amount}
                </button>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-foreground font-semibold text-sm">KES</span>
              <input
                type="number"
                value={stake}
                onChange={(e) => setStake(Math.max(1, parseInt(e.target.value) || 0))}
                className="flex-1"
                placeholder="Custom amount"
                min={50}
              />
            </div>
            {stakeError && (
              <p className="text-destructive text-xs">{stakeError}</p>
            )}
          </div>

          {/* Autosell Time */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-muted uppercase tracking-wider">
              AUTOSELL TIME
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[30, 60, 120, 300].map((time) => (
                <button
                  key={time}
                  onClick={() => setAutosellTime(time)}
                  className={`px-3 py-2 rounded font-medium text-sm transition-all ${
                    autosellTime === time
                      ? 'bg-primary text-black ring-2 ring-primary/50'
                      : 'bg-surface border border-border text-foreground hover:border-primary/50'
                  }`}
                >
                  {time}s
                </button>
              ))}
            </div>
          </div>

          {/* Potential payout preview */}
          <div className="bg-surface border border-border rounded-lg p-3 text-xs text-center space-x-3">
            <span className="text-muted">Potential win:</span>
            <span className="text-primary font-bold">+KES {payout.profit.toFixed(2)}</span>
            <span className="text-muted">|</span>
            <span className="text-muted">Payout:</span>
            <span className="text-primary font-bold">KES {payout.payout.toFixed(2)}</span>
            <span className="text-muted">|</span>
            <span className="text-muted">Risk:</span>
            <span className="text-destructive font-bold">-KES {stake}</span>
          </div>
        </>
      )}

      {/* Timer with Progress Bar */}
      {activeDirection && timeLeft > 0 && !tradeResult && (
        <div className="bg-surface border border-primary rounded-lg p-4 text-center space-y-3">
          <div className="text-xs text-muted uppercase tracking-wider font-semibold">
            {activeDirection.toUpperCase()} — TIME REMAINING
          </div>
          <div className="text-5xl font-bold text-primary font-mono">{timeLeft}s</div>
          <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-1000"
              style={{ width: `${timerProgress}%` }}
            />
          </div>
          <p className="text-xs text-muted">
            Trade auto-closes when timer reaches 0
          </p>
          <button
            onClick={handleManualClose}
            disabled={closing}
            className="w-full py-2 bg-destructive/20 border border-destructive text-destructive font-semibold rounded-lg hover:bg-destructive hover:text-white transition-all disabled:opacity-50 text-sm"
          >
            {closing ? 'Closing...' : '⏹ Close Trade Now'}
          </button>
        </div>
      )}

      {/* BUY / SELL Buttons */}
      {!activeDirection && (
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => handleTrade('buy')}
            disabled={loading || !!stakeError}
            className={`py-4 font-bold rounded-lg text-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              accountType === 'demo'
                ? 'bg-green-500 hover:bg-green-500 text-black'
                : 'bg-primary hover:bg-green-600 text-black'
            }`}
          >
            {loading ? 'Starting...' : '↑ BUY'}
          </button>
          <button
            onClick={() => handleTrade('sell')}
            disabled={loading || !!stakeError}
            className={`py-4 font-bold rounded-lg text-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              accountType === 'demo'
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-destructive hover:bg-red-600 text-white'
            }`}
          >
            {loading ? 'Starting...' : '↓ SELL'}
          </button>
        </div>
      )}

      {/* Balance info */}
      {!activeDirection && (
        <div className="text-center text-xs text-muted">
          Available balance:{' '}
          <span className={balance < stake ? 'text-destructive font-bold' : 'text-primary font-bold'}>
            KES {balance.toFixed(2)}
          </span>
          {' '}({accountType === 'demo' ? 'Demo' : 'Real'} account)
        </div>
      )}
    </div>
  )
}