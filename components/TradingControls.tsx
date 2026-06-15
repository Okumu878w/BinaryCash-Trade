'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createTrade, closeTrade } from '@/lib/api'
import {
  calculateTradeResult,
  calculateProfitLoss,
  getLivePnL,
  validateStake,
  calculatePotentialPayout,
} from '@/lib/trading'

interface TradingControlsProps {
  userId: string
  balance: number
  accountType: 'demo' | 'real'
  onTradeCreated?: (result: 'win' | 'loss', pnl: number) => void
  onTradeStarted?: () => void
  onDirectionChange?: (direction: 'buy' | 'sell' | null) => void 
  currentPrice?: number | null
}

export function TradingControls({
  userId,
  balance,
  accountType,
  onTradeCreated,
  onTradeStarted,
  onDirectionChange,
  currentPrice: propCurrentPrice,
}: TradingControlsProps) {
  const [stake, setStake] = useState(100)
  const [autosellTime, setAutosellTime] = useState(30)
  const [timeLeft, setTimeLeft] = useState(0)
  const [activeDirection, setActiveDirection] = useState<'buy' | 'sell' | null>(null)
  const [loading, setLoading] = useState(false)
  const [entryPrice, setEntryPrice] = useState<number | null>(null)
  const [tradeId, setTradeId] = useState<string | null>(null)
  const [profitLoss, setProfitLoss] = useState<number | null>(null)
  const [tradeResult, setTradeResult] = useState<'win' | 'loss' | null>(null)
  const [closing, setClosing] = useState(false)
  const [stakeError, setStakeError] = useState<string | null>(null)

  const displayCurrentPrice = propCurrentPrice ?? null

  // ✅ Live P&L using getLivePnL
   useEffect(() => {
    onDirectionChange?.(activeDirection)
  }, [activeDirection, onDirectionChange])

  // Validate stake on change
  useEffect(() => {
    if (activeDirection) return
    const validation = validateStake(stake, balance)
    setStakeError(validation.valid ? null : validation.error ?? null)
  }, [stake, balance, activeDirection])

  const resetTrade = useCallback((result: 'win' | 'loss', pnl: number) => {
    setTradeResult(result)
    setTimeout(() => {
      setActiveDirection(null)
      setTimeLeft(0)
      setEntryPrice(null)
      setTradeId(null)
      setProfitLoss(null)
      setTradeResult(null)
      setClosing(false)
      onTradeCreated?.(result, pnl)
    }, 2000)
  }, [onTradeCreated])

  // Core close trade logic — addLiveFeed handled inside closeTrade in api.ts
const closeTradeFn = useCallback(async (exitPrice: number) => {
  console.log('closeTradeFn: called', { activeDirection, entryPrice, tradeId, closing, exitPrice })
  if (!activeDirection || !entryPrice || !tradeId || closing) {
    console.log('closeTradeFn: guard blocked execution')
    return
  }
  setClosing(true)
  console.log('closeTradeFn: setClosing(true) called')

  try {
    const result = calculateTradeResult(entryPrice, exitPrice, activeDirection)
    const pnl = calculateProfitLoss(entryPrice, exitPrice, activeDirection, stake)
    console.log('closeTradeFn: computed', { result, pnl })

    console.log('closeTradeFn: awaiting closeTrade API...')
    await closeTrade(tradeId, exitPrice, result)
    console.log('closeTradeFn: closeTrade API resolved')

    resetTrade(result, pnl)
    console.log('closeTradeFn: resetTrade called')
  } catch (error) {
    console.error('closeTradeFn: caught error', error)
    setClosing(false)
    setActiveDirection(null)
  }
}, [activeDirection, entryPrice, tradeId, closing, stake, resetTrade])

  // Auto-sell when timer hits 0
  const handleAutoSell = useCallback(async () => {
    if (!displayCurrentPrice) return
    await closeTradeFn(displayCurrentPrice)
  }, [displayCurrentPrice, closeTradeFn])

  // Manual stop
  const handleManualClose = async () => {
    if (!displayCurrentPrice || closing) return
    await closeTradeFn(displayCurrentPrice)
  }

  // Keep a ref to the latest handleAutoSell so the interval always
  // calls the freshest version without needing to be recreated
  const handleAutoSellRef = useRef(handleAutoSell)
  useEffect(() => {
    handleAutoSellRef.current = handleAutoSell
  }, [handleAutoSell])

  // Timer countdown — only depends on activeDirection now
  useEffect(() => {
    if (!activeDirection) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleAutoSellRef.current()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [activeDirection])

  // ✅ Uses live chart price as entry
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
      // ✅ Use current live chart price as entry (not a generated one)
      const entry = displayCurrentPrice ?? 0
      if (entry === 0) {
        console.error('No live price available')
        setLoading(false)
        return
      }

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

  const isWinning = profitLoss !== null && profitLoss > 0
  const isLosing = profitLoss !== null && profitLoss < 0
  const timerProgress = autosellTime > 0 ? (timeLeft / autosellTime) * 100 : 0
  const payout = calculatePotentialPayout(stake)

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
      {activeDirection && profitLoss !== null && !tradeResult && (
        <div className={`border rounded-lg p-4 text-center transition-all duration-300 ${
          isWinning
            ? 'bg-primary/10 border-primary'
            : isLosing
            ? 'bg-destructive/10 border-destructive'
            : 'bg-surface border-border'
        }`}>
          <div className="text-xs text-muted uppercase tracking-wider font-semibold mb-1">
            LIVE PROFIT / LOSS
          </div>
          <div className={`text-4xl font-bold font-mono transition-colors ${
            isWinning ? 'text-primary' : isLosing ? 'text-destructive' : 'text-foreground'
          }`}>
            {profitLoss >= 0 ? '+' : ''}{profitLoss.toFixed(2)} KES
          </div>
          <div className="text-xs text-muted mt-2 space-x-2">
            <span>Entry: <span className="text-foreground">{entryPrice?.toFixed(4)}</span></span>
            <span>|</span>
            <span>Now: <span className="text-foreground">{displayCurrentPrice?.toFixed(4)}</span></span>
            <span>|</span>
            <span>Max win: <span className="text-primary">+{payout.profit.toFixed(2)} KES</span></span>
          </div>
          <div className={`text-xs font-semibold mt-2 ${isWinning ? 'text-primary' : 'text-destructive'}`}>
            {isWinning ? '📈 Currently WINNING' : '📉 Currently LOSING'}
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
              {[50, 100, 200, 500].map((amount) => (
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
                ? 'bg-yellow-500 hover:bg-yellow-400 text-black'
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
                ? 'bg-purple-600 hover:bg-purple-500 text-white'
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