'use client'

interface DashboardSidebarProps {
  activities: Array<{
    id: string
    username?: string
    message: string
    amount?: number
    emoji?: string
    type: 'system' | 'user'
  }>
}

export function DashboardSidebar({ activities }: DashboardSidebarProps) {
  // Mock live activities if none provided
  const liveActivities = activities && activities.length > 0 ? activities : [
    {
      id: '1',
      username: 'System',
      message: 'CONGRATULATIONS @David_Kip on withdrawal of 195.00',
      emoji: '🎉',
      type: 'system',
    },
    {
      id: '2',
      username: 'System',
      message: 'CONGRATULATIONS @RyanOdera on withdrawal of 300.00',
      emoji: '🎉',
      type: 'system',
    },
    {
      id: '3',
      username: 'LucyAuma',
      message: 'BUY now!',
      type: 'user',
    },
    {
      id: '4',
      username: 'System',
      message: 'CONGRATULATIONS @Masaicaleb on withdrawal of 2000.00',
      emoji: '🎉',
      type: 'system',
    },
    {
      id: '5',
      username: 'System',
      message: 'CONGRATULATIONS @joseph9355 on withdrawal of 800.00',
      emoji: '🎉',
      type: 'system',
    },
  ]

  return (
    <div className="hidden lg:flex flex-col w-80 bg-surface border-r border-border h-screen overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
          Live Activity
        </h2>
        <p className="text-xs text-text-muted mt-1">{liveActivities.length} traders online</p>
      </div>

      {/* Activities Feed */}
      <div className="flex-1 overflow-y-auto space-y-2 px-3 py-3">
        {liveActivities.map((activity) => (
          <div
            key={activity.id}
            className="p-3 rounded-lg bg-surface-hover border border-border/50 hover:border-border transition-colors text-xs"
          >
            <div className="flex items-start gap-2">
              <span className="text-lg">{activity.emoji || '👤'}</span>
              <div className="flex-1 min-w-0">
                {activity.type === 'system' ? (
                  <p className="text-success text-xs leading-tight">
                    {activity.message}
                  </p>
                ) : (
                  <div>
                    <p className="text-foreground font-medium">{activity.username}:</p>
                    <p className="text-text-muted">{activity.message}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Send Message */}
      <div className="border-t border-border p-3 space-y-2">
        <input
          type="text"
          placeholder="Say something..."
          className="w-full px-3 py-2 bg-surface-hover border border-border rounded text-xs text-foreground placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button className="w-full px-3 py-2 bg-success text-background font-medium rounded text-xs hover:opacity-90 transition-opacity">
          SEND
        </button>
      </div>
    </div>
  )
}
