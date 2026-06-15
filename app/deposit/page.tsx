'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  id: string
  username: string
  phone: string | null
}

export default function DepositPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState(200)
  const [phone, setPhone] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          router.push('/auth/login')
          return
        }

        const { data } = await supabase
          .from('profiles')
          .select('id, username, phone')
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

  const handleDeposit = async () => {
    if (!profile || !phone || amount < 200) {
      setMessage({ type: 'error', text: 'Please fill in all fields. Minimum deposit is KES 200.' })
      return
    }

    setProcessing(true)
    setMessage(null)

    try {
      const res = await fetch('/api/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, phone, userId: profile.id }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setMessage({
        type: 'success',
        text: 'STK Push sent! Check your phone and enter your M-Pesa PIN.',
      })

      // Poll for completion
      pollStatus(data.transactionId)
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Deposit failed',
      })
      setProcessing(false)
    }
  }

  const pollStatus = (transactionId: string) => {
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('transactions')
        .select('status')
        .eq('id', transactionId)
        .single()

      if (data?.status === 'completed') {
        clearInterval(interval)
        setProcessing(false)
        setShowConfirm(false)
        router.push('/dashboard')
      }

      if (data?.status === 'failed') {
        clearInterval(interval)
        setProcessing(false)
        setMessage({ type: 'error', text: 'Payment failed or was cancelled.' })
      }
    }, 2000)

    // Stop polling after 2 minutes
    setTimeout(() => {
      clearInterval(interval)
      setProcessing(false)
    }, 120000)
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
          <h1 className="text-3xl font-bold">Deposit Funds</h1>
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
          <div>
            <label className="block text-sm font-medium text-text-muted mb-3">
              SELECT AMOUNT (KES)
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[200, 500, 1000, 2000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setAmount(amt)}
                  disabled={showConfirm}
                  className={`px-3 py-3 rounded font-semibold transition-colors ${
                    amount === amt
                      ? 'bg-primary text-background'
                      : 'bg-surface-hover border border-border hover:border-primary'
                  } disabled:opacity-50`}
                >
                  {amt}
                </button>
              ))}
            </div>

            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Math.max(200, parseInt(e.target.value) || 0))}
              disabled={showConfirm}
              placeholder="Custom amount"
              min="200"
              className="w-full"
            />
            <p className="text-xs text-text-muted mt-2">Minimum deposit: KES 200</p>
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
              placeholder="2547....."
              className="w-full"
            />
          </div>

          {showConfirm ? (
            <div className="space-y-3">
              <div className="bg-background/50 rounded p-4 text-center border border-border">
                <p className="text-sm text-text-muted mb-1">Amount to deposit:</p>
                <p className="text-2xl font-bold text-primary">KES {amount.toFixed(2)}</p>
                <p className="text-xs text-text-muted mt-2">Confirm payment on your phone</p>
              </div>

              <button
                onClick={handleDeposit}
                disabled={processing}
                className="w-full py-3 bg-primary text-background font-bold rounded hover:bg-primary-hover disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Confirm Deposit'}
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
              disabled={amount < 200 || !phone}
              className="w-full py-3 bg-primary text-background font-bold rounded hover:bg-primary-hover disabled:opacity-50"
            >
              Select Amount
            </button>
          )}
        </div>

        <div className="bg-info/10 border border-info/30 rounded-lg p-4 text-sm text-info">
          <p className="font-semibold mb-2">How it works:</p>
          <ol className="space-y-1 text-xs">
            <li>1. Select the amount you want to deposit</li>
            <li>2. Enter your M-Pesa phone number</li>
            <li>3. Confirm the deposit</li>
            <li>4. Follow the prompt on your phone to complete payment</li>
            <li>5. Funds appear instantly in your account</li>
          </ol>
        </div>
      </div>
    </div>
  )
}