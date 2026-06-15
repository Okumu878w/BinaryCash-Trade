'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Trade {
  id: string
  pair: string
  direction: 'buy' | 'sell'
  stake: number
  entry_price: number
  exit_price: number | null
  profit_loss: number | null
  result: 'win' | 'loss' | 'pending'
  created_at: string
  closed_at: string | null
}

export default function HistoryPage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'all' | 'win' | 'loss' | 'pending'>('all')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          router.push('/auth/login')
          return
        }

        let query = supabase
          .from('trades')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })

        const { data } = await query

        if (data) {
          setTrades(data)
        }
      } catch (error) {
        console.error('Error fetching trades:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTrades()
  }, [router, supabase])

  const filteredTrades =
    filterType === 'all'
      ? trades
      : trades.filter((t) => t.result === filterType)

  const stats = {
    total: trades.length,
    wins: trades.filter((t) => t.result === 'win').length,
    losses: trades.filter((t) => t.result === 'loss').length,
    winRate:
      trades.length > 0
        ? ((trades.filter((t) => t.result === 'win').length / trades.length) * 100).toFixed(1)
        : '0',
    totalProfit: trades.reduce((sum, t) => sum + (t.profit_loss || 0), 0),
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <p className="text-text-muted">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-32 md:pb-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">History</h1>
          <Link
            href="/dashboard"
            className="px-3 py-2 bg-surface rounded border border-border hover:border-primary"
          >
            Back
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
          <div className="bg-surface border border-border rounded-lg p-3 md:p-4">
            <p className="text-xs md:text-sm text-text-muted">Total Trades</p>
            <p className="text-lg md:text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-3 md:p-4">
            <p className="text-xs md:text-sm text-text-muted">Wins</p>
            <p className="text-lg md:text-2xl font-bold text-success">{stats.wins}</p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-3 md:p-4">
            <p className="text-xs md:text-sm text-text-muted">Losses</p>
            <p className="text-lg md:text-2xl font-bold text-destructive">{stats.losses}</p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-3 md:p-4">
            <p className="text-xs md:text-sm text-text-muted">Win Rate</p>
            <p className="text-lg md:text-2xl font-bold text-info">{stats.winRate}%</p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-3 md:p-4">
            <p className="text-xs md:text-sm text-text-muted">P&L</p>
            <p className={`text-lg md:text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
              KES {stats.totalProfit.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'win', 'loss', 'pending'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-2 rounded text-sm font-medium capitalize transition-colors ${
                filterType === type
                  ? 'bg-primary text-background'
                  : 'bg-surface border border-border hover:border-primary'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Trades List */}
        <div className="space-y-2">
          {filteredTrades.length === 0 ? (
            <div className="bg-surface border border-border rounded-lg p-8 text-center">
              <p className="text-text-muted">No trades yet</p>
            </div>
          ) : (
            filteredTrades.map((trade) => (
              <div
                key={trade.id}
                className="bg-surface border border-border rounded-lg p-4 flex justify-between items-center"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{trade.pair}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded font-medium ${
                        trade.direction === 'buy'
                          ? 'bg-success/20 text-success'
                          : 'bg-destructive/20 text-destructive'
                      }`}
                    >
                      {trade.direction.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    {new Date(trade.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-bold">
                    KES {trade.stake.toFixed(2)}
                  </p>
                  <p
                    className={`text-sm font-medium ${
                      trade.result === 'win'
                        ? 'text-success'
                        : trade.result === 'loss'
                          ? 'text-destructive'
                          : 'text-warning'
                    }`}
                  >
                    {trade.result === 'pending' ? 'Pending' : `${trade.result === 'win' ? '+' : ''}KES ${(trade.profit_loss || 0).toFixed(2)}`}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
