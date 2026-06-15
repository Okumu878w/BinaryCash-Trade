import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistance } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'KES'): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

export function formatPrice(price: number, decimals = 4): string {
  return price.toFixed(decimals)
}

export function formatTimeAgo(date: Date | string): string {
  return formatDistance(new Date(date), new Date(), { addSuffix: true })
}

export function formatPhoneNumber(phone: string): string {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  const last4 = cleaned.slice(-4)
  return `+254•••••${last4}`
}

export function calculateWinRate(wins: number, total: number): number {
  if (total === 0) return 0
  return (wins / total) * 100
}

export function calculatePnL(
  stake: number,
  multiplier = 1.85,
  isWin: boolean
): number {
  return isWin ? stake * (multiplier - 1) : -stake
}

export function generateRandomWalk(
  startPrice = 0.0211,
  steps = 60,
  volatility = 0.15
): number[] {
  const prices: number[] = [startPrice]
  let currentPrice = startPrice

  for (let i = 1; i < steps; i++) {
    const change = (Math.random() - 0.5) * volatility
    currentPrice = Math.max(currentPrice + change, -3.0)
    prices.push(currentPrice)
  }

  return prices
}

export function getMockLiveFeedMessages(): Array<{
  id: string
  username: string
  type: 'deposit' | 'withdrawal' | 'trade_win' | 'bonus'
  amount: number
  emoji: string
  timestamp: Date
}> {
  const messages = [
    {
      id: '1',
      username: 'David Kip',
      type: 'withdrawal' as const,
      amount: 195,
      emoji: '🎉',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
    },
    {
      id: '2',
      username: 'Ryan Odera',
      type: 'withdrawal' as const,
      amount: 300,
      emoji: '🎉',
      timestamp: new Date(Date.now() - 1000 * 60 * 10),
    },
    {
      id: '3',
      username: 'System',
      type: 'bonus' as const,
      amount: 10,
      emoji: '🎁',
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
    },
    {
      id: '4',
      username: 'Rose Nyambura',
      type: 'withdrawal' as const,
      amount: 450,
      emoji: '🎉',
      timestamp: new Date(Date.now() - 1000 * 60 * 20),
    },
    {
      id: '5',
      username: 'Peter Gitau',
      type: 'withdrawal' as const,
      amount: 1200,
      emoji: '🎉',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
    },
    {
      id: '6',
      username: 'Sharon Amani',
      type: 'withdrawal' as const,
      amount: 450,
      emoji: '🎉',
      timestamp: new Date(Date.now() - 1000 * 60 * 40),
    },
  ]

  return messages
}

