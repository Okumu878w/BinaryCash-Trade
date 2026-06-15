'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface DashboardHeaderProps {
  username: string
  balance: number
  accountType: 'demo' | 'real'
  onToggleAccount?: () => void
}

export function DashboardHeader({
  username,
  balance,
  accountType,
  onToggleAccount,
}: DashboardHeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const stats = {
    volume24h: 2400000,
    tradersOnline: 1281,
    totalPayouts: 18700000,
  }

  const AccountToggle = () => (
    <button
      onClick={onToggleAccount}
      className={`px-4 py-1.5 rounded-full text-sm font-bold border-2 transition-all ${
        accountType === 'demo'
          ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black'
          : 'bg-primary/20 border-primary text-primary hover:bg-primary hover:text-black'
      }`}
    >
      {accountType === 'demo' ? 'Demo' : 'Real'}
    </button>
  )

  return (
    <>
      {/* Desktop Header */}
      <header className="hidden md:flex items-center justify-between bg-surface border-b border-border px-6 py-3 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-black font-bold text-lg">B</span>
          </div>
          <span className="text-lg font-semibold text-foreground">BinaryCash Trade</span>
        </div>

        {/* Center Stats */}
        <div className="hidden lg:flex items-center gap-8 text-xs flex-1 justify-center">
          <div>
            <div className="text-muted uppercase tracking-wide">24H VOLUME</div>
            <div className="text-primary font-bold">KES {(stats.volume24h / 1000000).toFixed(1)}M</div>
          </div>
          <div>
            <div className="text-muted uppercase tracking-wide">TRADERS ONLINE</div>
            <div className="text-foreground font-bold">{stats.tradersOnline.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-muted uppercase tracking-wide">TOTAL PAYOUTS</div>
            <div className="text-yellow-400 font-bold">KES {(stats.totalPayouts / 1000000).toFixed(1)}M</div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-surface rounded-lg transition-colors">
            <svg className="w-5 h-5 text-muted" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          </button>

          <AccountToggle />

          <div className="text-right">
            <div className="text-xs text-muted">Balance</div>
            <div className="font-bold text-primary">K {balance.toFixed(2)}</div>
          </div>

          {/* Deposit icon button */}
          <Link
            href="/deposit"
            title="Deposit"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-primary text-black font-bold text-xl hover:bg-green-600 transition-colors"
          >
            +
          </Link>

          {/* Withdraw icon button */}
          <Link
            href="/withdraw"
            title="Withdraw"
            className="w-9 h-9 flex items-center justify-center rounded-full border-2 border-border text-foreground hover:bg-surface/80 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Link>

          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-1.5 text-foreground hover:bg-surface/80 rounded-lg transition-colors text-sm">
              {/* User icon */}
              <div className="w-7 h-7 rounded-full bg-surface border border-border flex items-center justify-center">
                <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              {username}
              <svg className="w-3 h-3 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <Link
                href="/profile"
                className="block px-4 py-2 text-foreground hover:bg-surface-hover rounded-t text-sm"
              >
                Profile Settings
              </Link>
              <Link
                href="/history"
                className="block px-4 py-2 text-foreground hover:bg-surface-hover text-sm"
              >
                Transactions
              </Link>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-destructive hover:bg-surface-hover rounded-b text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between bg-surface border-b border-border px-4 py-3 sticky top-0 z-40">
        {/* Left: Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-black font-bold text-sm">B</span>
          </div>
          <span className="font-semibold text-foreground text-sm">BinaryCash 254</span>
        </div>

        {/* Right: Toggle + Balance + Deposit + Withdraw */}
        <div className="flex items-center gap-2">
          <AccountToggle />

          <div className="text-right">
            <div className="text-xs text-muted">Balance</div>
            <div className="font-bold text-primary text-sm">K {balance.toFixed(2)}</div>
          </div>

          {/* Deposit button */}
          <Link
            href="/deposit"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-black font-bold text-lg hover:bg-green-600 transition-colors"
            title="Deposit"
          >
            +
          </Link>

          {/* Withdraw button */}
          <Link
            href="/withdraw"
            className="w-8 h-8 flex items-center justify-center rounded-full border-2 border-border text-foreground hover:bg-surface transition-colors"
            title="Withdraw"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Link>

          {/* Username with user icon */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-2 py-1 text-foreground hover:bg-surface/80 rounded-lg transition-colors">
              <div className="w-7 h-7 rounded-full bg-surface border border-border flex items-center justify-center">
                <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="text-xs font-medium max-w-[60px] truncate">{username}</span>
              <svg className="w-3 h-3 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute right-0 mt-2 w-44 bg-surface border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <Link
                href="/profile"
                className="block px-4 py-2 text-foreground hover:bg-surface-hover rounded-t text-sm"
              >
                Profile Settings
              </Link>
              <Link
                href="/history"
                className="block px-4 py-2 text-foreground hover:bg-surface-hover text-sm"
              >
                Transactions
              </Link>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-destructive hover:bg-surface-hover rounded-b text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>
    </>
  )
}