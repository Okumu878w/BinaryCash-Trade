'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  id: string
  username: string
  phone: string | null
  real_balance: number
}

export default function WithdrawPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState(100)
  const [phone, setPhone] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (!supabase) {
          router.push('/auth/login')
          return
        }

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          router.push('/auth/login')
          return
        }

        const { data } = await supabase
          .from('profiles')
          .select('id, username, phone, real_balance')
          .eq('id', session.user.id)
          .single()

        if (data) {
          setProfile(data)
          setPhone(data.phone || '')
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [router, supabase])

  const handleWithdraw = async () => {
    if (!profile || !phone || amount < 100) {
      setMessage({ type: 'error', text: 'Please fill in all fields. Minimum withdrawal is KES 100.' })
      return
    }

    if (amount > profile.real_balance) {
      setMessage({ type: 'error', text: 'Insufficient balance for this withdrawal.' })
      return
    }

    setProcessing(true)

    try {
      // Create transaction record
      const { data, error } = await supabase?.from('transactions').insert({
        user_id: profile.id,
        type: 'withdrawal',
        amount,
        currency: 'KES',
        method: 'm-pesa',
        phone,
        status: 'pending',
      })

      if (error) throw error

      setMessage({
        type: 'success',
        text: `Withdrawal of KES ${amount} has been initiated. Funds will arrive within 24 hours.`,
      })

      // Simulate completion after 3 seconds (in real scenario, this would be a webhook)
      setTimeout(async () => {
        if (data && data[0]) {
          await supabase?.from('transactions').update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          }).eq('id', data[0].id)

          // Update profile balance
          const { data: currentProfile } = await supabase
            ?.from('profiles')
            .select('real_balance, total_withdrawals')
            .eq('id', profile.id)
            .single()

          if (currentProfile) {
            await supabase?.from('profiles').update({
              real_balance: currentProfile.real_balance - amount,
              total_withdrawals: currentProfile.total_withdrawals + amount,
            }).eq('id', profile.id)

            // Add to live feed
            await supabase?.from('live_feed').insert({
              user_id: profile.id,
              event_type: 'withdrawal',
              description: `Withdrew KES ${amount}`,
              amount: -amount,
            })
          }

          setAmount(100)
          setShowConfirm(false)
          setTimeout(() => router.push('/dashboard'), 2000)
        }
      }, 3000)
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error processing withdrawal',
      })
    } finally {
      setProcessing(false)
    }
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
      <div className="max-w-md mx-auto mt-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Withdraw Funds</h1>
          <Link
            href="/dashboard"
            className="px-3 py-2 bg-surface rounded border border-border hover:border-primary"
          >
            Back
          </Link>
        </div>

        {message && (
          <div
            className={`p-4 rounded border ${
              message.type === 'success'
                ? 'bg-success/10 border-success/30 text-success'
                : 'bg-destructive/10 border-destructive/30 text-destructive'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
          <div className="bg-background/50 rounded p-4 border border-border">
            <p className="text-sm text-text-muted">Available Balance</p>
            <p className="text-3xl font-bold text-primary">KES {profile?.real_balance.toFixed(2)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-3">
              SELECT AMOUNT (KES)
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[100, 200, 500, 1000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setAmount(amt)}
                  disabled={showConfirm || amt > (profile?.real_balance || 0)}
                  className={`px-3 py-3 rounded font-semibold transition-colors ${
                    amount === amt
                      ? 'bg-primary text-background'
                      : 'bg-surface-hover border border-border hover:border-primary'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {amt}
                </button>
              ))}
            </div>

            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Math.max(100, parseInt(e.target.value) || 0))}
              disabled={showConfirm}
              placeholder="Custom amount"
              min="100"
              className="w-full"
            />
            <p className="text-xs text-text-muted mt-2">Minimum withdrawal: KES 100</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              M-PESA PHONE NUMBER
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={showConfirm}
              placeholder="254712345678"
              className="w-full"
            />
          </div>

          {showConfirm ? (
            <div className="space-y-3">
              <div className="bg-background/50 rounded p-4 text-center border border-border">
                <p className="text-sm text-text-muted mb-1">Amount to withdraw:</p>
                <p className="text-2xl font-bold text-primary">KES {amount.toFixed(2)}</p>
                <p className="text-xs text-text-muted mt-2">Funds arrive within 24 hours</p>
              </div>

              <button
                onClick={handleWithdraw}
                disabled={processing}
                className="w-full py-3 bg-destructive text-foreground font-bold rounded hover:opacity-90 disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Confirm Withdrawal'}
              </button>

              <button
                onClick={() => setShowConfirm(false)}
                disabled={processing}
                className="w-full py-3 bg-surface-hover border border-border rounded font-bold hover:border-primary disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={amount < 100 || !phone || amount > (profile?.real_balance || 0)}
              className="w-full py-3 bg-primary text-background font-bold rounded hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Select Amount
            </button>
          )}
        </div>

        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 text-sm text-warning">
          <p className="font-semibold mb-2">Withdrawal Details:</p>
          <ol className="space-y-1 text-xs">
            <li>1. Select the amount you want to withdraw</li>
            <li>2. Enter your M-Pesa phone number</li>
            <li>3. Confirm the withdrawal</li>
            <li>4. Funds will be sent to your phone within 24 hours</li>
            <li>5. Accept the M-Pesa prompt to complete</li>
          </ol>
        </div>
      </div>
    </div>
  )
}