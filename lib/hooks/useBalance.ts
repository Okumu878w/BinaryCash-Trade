'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useBalance() {
  const [demoBalance, setDemoBalance] = useState(0)
  const [realBalance, setRealBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    let isMounted = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (isMounted) setLoading(false)
        return
      }

      // Initial fetch
      const { data, error } = await supabase
        .from('profiles')
        .select('demo_balance, real_balance')
        .eq('id', user.id)
        .single()

      if (!error && data && isMounted) {
        setDemoBalance(data.demo_balance ?? 0)
        setRealBalance(data.real_balance ?? 0)
      }
      if (isMounted) setLoading(false)

      // ✅ Remove any stale channel with the same name first
      // (handles React StrictMode / Next.js dev double-effect)
      const channelName = `profile-balance-${user.id}`
      const existing = supabase.getChannels().find(
        (c) => c.topic === `realtime:${channelName}`
      )
      if (existing) {
        await supabase.removeChannel(existing)
      }

      if (!isMounted) return

      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            const updated = payload.new as { demo_balance: number; real_balance: number }
            setDemoBalance(updated.demo_balance ?? 0)
            setRealBalance(updated.real_balance ?? 0)
          }
        )
        .subscribe()
    }

    init()

    return () => {
      isMounted = false
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [])

  return { demoBalance, realBalance, loading }
}