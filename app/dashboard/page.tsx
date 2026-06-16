'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useBalance } from '@/lib/hooks/useBalance'
import { DashboardHeader } from '@/components/DashboardHeader'
import { DashboardSidebar } from '@/components/DashboardSidebar'
import { TradingChart } from '@/components/TradingChart'
import { TradingControls } from '@/components/TradingControls'
import { LicenseFooter } from '@/components/LicenseFooter'

interface Profile {
  id: string
  username: string
  email: string
  phone: string | null
  account_type: 'demo' | 'real'
  total_deposits: number
  total_withdrawals: number
}

const GUEST_PROFILE: Profile = {
  id: 'guest',
  username: 'Guest',
  email: '',
  phone: null,
  account_type: 'demo',
  total_deposits: 0,
  total_withdrawals: 0,
}

const GUEST_DEMO_BALANCE = 200

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [accountType, setAccountType] = useState<'demo' | 'real'>('demo')
  const [isTradeActive, setIsTradeActive] = useState(false)
  const [activeDirection, setActiveDirection] = useState<'buy' | 'sell' | null>(null)
  const [isGuest, setIsGuest] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const { demoBalance, realBalance, loading: balanceLoading } = useBalance()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          setProfile(GUEST_PROFILE)
          setAccountType('demo')
          setIsGuest(true)
          setProfileLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, email, phone, account_type, total_deposits, total_withdrawals')
          .eq('id', session.user.id)
          .single()

        if (error) {
          console.error('Profile fetch error:', error)
          return
        }

        if (data) {
          setProfile(data)
          setAccountType(data.account_type ?? 'demo')
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setProfileLoading(false)
      }
    }

    fetchProfile()
  }, [router, supabase])

  const handleToggleAccount = async () => {
    if (!profile) return

    if (isGuest) {
      router.push('/auth/login')
      return
    }

    const newType = accountType === 'demo' ? 'real' : 'demo'
    setAccountType(newType)

    await supabase
      .from('profiles')
      .update({ account_type: newType })
      .eq('id', profile.id)
  }

  const handleTradeCreated = useCallback(() => {
    setIsTradeActive(false)
  }, [])

  const activeBalance = isGuest
    ? GUEST_DEMO_BALANCE
    : accountType === 'demo'
    ? demoBalance
    : realBalance

  const loading = profileLoading || (!isGuest && balanceLoading)

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-primary mb-4">
            <span className="text-black font-bold text-2xl">B</span>
          </div>
          <p className="text-muted">Loading...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-destructive">Failed to load profile</p>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <DashboardHeader
        username={profile.username}
        balance={activeBalance}
        accountType={accountType}
        onToggleAccount={handleToggleAccount}
      />

      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar activities={[]} />

        <div className="flex-1 flex flex-col overflow-auto">
          <div className="flex-1 p-3 md:p-4 space-y-3 overflow-auto">

            {/* Guest sign-up banner */}
            {isGuest && (
              <div className="rounded-lg px-3 py-2 text-xs font-medium flex items-center justify-between bg-blue-500/10 border border-blue-500/30 text-blue-400">
                <span className="hidden sm:inline">
                  👋 You're viewing a demo — sign up to trade with real KES
                </span>
                <span className="sm:hidden">👋 Demo mode — sign up to trade</span>
                <div className="flex gap-2 ml-3 shrink-0">
                  <Link
                    href="/auth/login"
                    className="text-xs bg-blue-500/20 hover:bg-blue-500/30 px-2 py-1 rounded transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/auth/sign-up"
                    className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors"
                  >
                    Sign up
                  </Link>
                </div>
              </div>
            )}

           

            {/* Chart — stats (24H HIGH/LOW/SPREAD) are now inside the chart header */}
            <TradingChart
              direction={activeDirection ?? 'buy'}
              isTradeActive={isTradeActive}
              high24h={2.4878}
              low24h={-2.4000}
              spread={0.0012}
            />

            {/* Trading Controls */}
            {isGuest ? (
              <div className="rounded-lg border border-border bg-surface p-6 text-center space-y-3">
                <p className="text-muted text-sm">Create a free account to start trading</p>
                <div className="flex gap-3 justify-center">
                  <Link
                    href="/auth/login"
                    className="px-4 py-2 rounded-md border border-border text-sm hover:bg-surface/80 transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/auth/sign-up"
                    className="px-4 py-2 rounded-md bg-primary text-black text-sm font-semibold hover:bg-primary/90 transition-colors"
                  >
                    Sign up free
                  </Link>
                </div>
              </div>
            ) : (
              <TradingControls
                userId={profile.id}
                balance={activeBalance}
                accountType={accountType}
                onTradeCreated={handleTradeCreated}
                onTradeStarted={() => setIsTradeActive(true)}
                onDirectionChange={setActiveDirection}
              />
            )}

          </div>
        </div>
      </div>

      {/* Desktop footer */}
      <div className="hidden md:flex items-center justify-center border-t border-border bg-surface py-2">
        <LicenseFooter variant="compact" />
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-50">
        <div className="flex justify-around items-center">
          <Link
            href="/dashboard"
            className="flex-1 flex flex-col items-center justify-center py-3 text-primary border-t-2 border-primary text-xs font-medium gap-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            TRADE
          </Link>
          <Link
            href="/deposit"
            className="flex-1 flex flex-col items-center justify-center py-3 text-muted text-xs font-medium gap-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            DEPOSIT
          </Link>
          <Link
            href="/history"
            className="flex-1 flex flex-col items-center justify-center py-3 text-muted text-xs font-medium gap-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            HISTORY
          </Link>
          <Link
            href="/profile"
            className="flex-1 flex flex-col items-center justify-center py-3 text-muted text-xs font-medium gap-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            PROFILE
          </Link>
        </div>
        <LicenseFooter variant="compact" className="py-1.5 border-t border-border/50" />
      </nav>

      {/* Spacer for mobile bottom nav */}
      <div className="md:hidden h-28" />
    </div>
  )
}