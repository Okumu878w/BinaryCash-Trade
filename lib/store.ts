import { create } from 'zustand'

export interface UserState {
  id: string | null
  username: string | null
  email: string | null
  phone: string | null
  balance_kes: number
  total_deposits: number
  total_withdrawals: number
  account_type: 'demo' | 'real'
  created_at: string | null
}

export interface TradeState {
  id: string | null
  direction: 'buy' | 'sell' | null
  stake: number
  entry_price: number | null
  result: 'win' | 'loss' | 'pending' | null
  pnl: number | null
}

export interface ChartState {
  currentRate: number
  priceHistory: { time: string; price: number }[]
  selectedInterval: '30s' | '1m' | '2m' | '5m'
}

interface Store {
  // User state
  user: UserState | null
  setUser: (user: UserState | null) => void
  updateBalance: (amount: number) => void

  // Trade state
  currentTrade: TradeState | null
  setCurrentTrade: (trade: TradeState | null) => void
  openTrades: TradeState[]
  addTrade: (trade: TradeState) => void
  resolveTrade: (tradeId: string, result: 'win' | 'loss') => void

  // Chart state
  chart: ChartState
  setChart: (chart: Partial<ChartState>) => void
  updateRate: (rate: number) => void

  // UI state
  isDemoMode: boolean
  setDemoMode: (demo: boolean) => void
  isMobile: boolean
  setIsMobile: (mobile: boolean) => void
}

export const useStore = create<Store>((set) => ({
  // User state
  user: null,
  setUser: (user) => set({ user }),
  updateBalance: (amount) =>
    set((state) => ({
      user: state.user
        ? { ...state.user, balance_kes: state.user.balance_kes + amount }
        : null,
    })),

  // Trade state
  currentTrade: null,
  setCurrentTrade: (trade) => set({ currentTrade: trade }),
  openTrades: [],
  addTrade: (trade) =>
    set((state) => ({
      openTrades: [...state.openTrades, trade],
    })),
  resolveTrade: (tradeId, result) =>
    set((state) => ({
      openTrades: state.openTrades.filter((t) => t.id !== tradeId),
    })),

  // Chart state
  chart: {
    currentRate: 0.0211,
    priceHistory: [],
    selectedInterval: '1m',
  },
  setChart: (updates) =>
    set((state) => ({
      chart: { ...state.chart, ...updates },
    })),
  updateRate: (rate) =>
    set((state) => ({
      chart: {
        ...state.chart,
        currentRate: rate,
        priceHistory: [
          ...state.chart.priceHistory,
          {
            time: new Date().toLocaleTimeString(),
            price: rate,
          },
        ].slice(-100), // Keep last 100 data points
      },
    })),

  // UI state
  isDemoMode: true,
  setDemoMode: (demo) => set({ isDemoMode: demo }),
  isMobile: true,
  setIsMobile: (mobile) => set({ isMobile: mobile }),
}))
