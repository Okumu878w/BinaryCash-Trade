'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  id: string
  username: string
  email: string
  phone: string | null
  real_balance: number
  account_type: 'demo' | 'real'
  total_deposits: number
  total_withdrawals: number
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [phone, setPhone] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
          .select('*')
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

  const handleUpdateProfile = async () => {
    if (!profile) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ phone })
        .eq('id', profile.id)

      if (error) throw error

      setProfile({ ...profile, phone })
      setEditing(false)
      setMessage({ type: 'success', text: 'Profile updated successfully' })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error updating profile',
      })
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setMessage({ type: 'success', text: 'Password changed successfully' })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error changing password',
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <p className="text-text-muted">Loading...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background p-4">
        <p className="text-destructive">Failed to load profile</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-32 md:pb-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Profile</h1>
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

        {/* Account Details */}
        <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-bold">Account Details</h2>

          <div className="space-y-2">
            <label className="block text-sm text-text-muted">Username</label>
            <div className="bg-background border border-border rounded px-3 py-2 text-foreground">
              {profile.username}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-text-muted">Email</label>
            <div className="bg-background border border-border rounded px-3 py-2 text-foreground">
              {profile.email}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-text-muted">Phone (M-Pesa)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={!editing}
              placeholder="+254712345678"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-text-muted">Account Type</label>
            <div className="bg-background border border-border rounded px-3 py-2 text-foreground capitalize">
              {profile.account_type}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-primary text-background rounded font-semibold hover:bg-primary-hover"
              >
                Edit
              </button>
            ) : (
              <>
                <button
                  onClick={handleUpdateProfile}
                  className="px-4 py-2 bg-primary text-background rounded font-semibold hover:bg-primary-hover"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditing(false)
                    setPhone(profile.phone || '')
                  }}
                  className="px-4 py-2 bg-surface-hover border border-border rounded font-semibold"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {/* Account Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface border border-border rounded-lg p-4">
            <p className="text-text-muted text-sm">Balance</p>
            <p className="text-2xl font-bold text-primary">KES {(profile.real_balance ?? 0).toFixed(2)}</p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-4">
            <p className="text-text-muted text-sm">Total Deposits</p>
            <p className="text-2xl font-bold text-success">KES {profile.total_deposits.toFixed(2)}</p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-4">
            <p className="text-text-muted text-sm">Total Withdrawals</p>
            <p className="text-2xl font-bold text-destructive">KES {profile.total_withdrawals.toFixed(2)}</p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-4">
            <p className="text-text-muted text-sm">Created</p>
            <p className="text-2xl font-bold text-info">
              {new Date(profile.created_at || '').toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-bold">Change Password</h2>

          <div className="space-y-2">
            <label className="block text-sm text-text-muted">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
            />
            <p className="text-xs text-text-muted">Min 6 characters</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-text-muted">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <button
            onClick={handleChangePassword}
            className="w-full px-4 py-2 bg-primary text-background rounded font-semibold hover:bg-primary-hover"
          >
            Update Password
          </button>
        </div>
      </div>
    </div>
  )
}
