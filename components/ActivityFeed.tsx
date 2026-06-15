'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ActivityItem {
  id: string
  event_type: string
  description: string
  amount: number | null
  created_at: string
}

interface ActivityFeedProps {
  userId: string
  limit?: number
}

export function ActivityFeed({ userId, limit = 5 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchActivities = async () => {
      if (!supabase) return

      try {
        const { data, error } = await supabase
          .from('live_feed')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (error) {
          console.error('Error fetching activities:', error)
          return
        }

        setActivities(data || [])
      } catch (error) {
        console.error('Error in fetchActivities:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()

    // Set up real-time subscription
    const channel = supabase?.channel(`live_feed:${userId}`)
    channel
      ?.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_feed',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setActivities((prev) => [payload.new as ActivityItem, ...prev.slice(0, limit - 1)])
        }
      )
      .subscribe()

    return () => {
      channel?.unsubscribe()
    }
  }, [userId, supabase, limit])

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'trade_win':
        return '↑'
      case 'trade_loss':
        return '↓'
      case 'deposit':
        return '+'
      case 'withdrawal':
        return '−'
      default:
        return '•'
    }
  }

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'trade_win':
        return 'text-success'
      case 'trade_loss':
        return 'text-destructive'
      case 'deposit':
        return 'text-success'
      case 'withdrawal':
        return 'text-warning'
      default:
        return 'text-text-muted'
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-lg p-4">
        <p className="text-text-muted text-sm">Loading activity...</p>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-4 space-y-2">
      <h3 className="font-bold text-sm uppercase text-text-muted mb-4">Recent Activity</h3>

      {activities.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-text-muted text-sm">No activity yet</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {activities.map((item) => (
            <div key={item.id} className="flex items-start gap-3 pb-2 border-b border-border last:border-0">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-background flex items-center justify-center font-bold ${getEventColor(item.event_type)}`}>
                {getEventIcon(item.event_type)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {item.description}
                </p>
                <p className="text-xs text-text-muted">
                  {formatTime(item.created_at)}
                </p>
              </div>

              {item.amount && (
                <div className={`flex-shrink-0 text-right ${item.amount >= 0 ? 'text-success' : 'text-destructive'}`}>
                  <p className="text-sm font-semibold">
                    {item.amount >= 0 ? '+' : ''}KES {Math.abs(item.amount).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
