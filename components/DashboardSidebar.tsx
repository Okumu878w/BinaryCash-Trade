'use client'

import { useEffect, useRef, useState } from 'react'

interface Activity {
  id: string
  username?: string
  message: string
  emoji?: string
  type: 'system' | 'user'
}

interface DashboardSidebarProps {
  activities?: Activity[]
}

const KENYAN_NAMES = [
  // Original 25
  'MikeKariuki', 'LucyAuma', 'Joseph9355', 'DavidKip', 'SharonAmani',
  'PeterGitau', 'Alic55', 'Realtoxic', 'Dalasguy', 'NjeriWan',
  'OmondiKe', 'FaithChep', 'BrianMutu', 'GraceNjoki', 'SamuelOti',
  'CynthiaKe', 'JohnMwangi', 'AnitaWeru', 'KevinOchieng', 'MaryNduta',
  'AlexKimani', 'RoseMuthoni', 'TonyNjenga', 'EvansMbugu', 'JulietAkinyi',
  
  // Added 45 to reach 70
  'IanKibet', 'JoyWanjiku', 'VictorOtieno', 'MercyKorir', 'DennisMutua',
  'JaneWamalwa', 'ErickOmondi', 'SarahNekesa', 'FelixKiprono', 'DianaNanjala',
  'EdwinMaina', 'LinetMoraa', 'GeorgeKiplagat', 'CarolineWambui', 'IsaacKamau',
  'StellaNyongesa', 'Amos254', 'Kelvin99', 'Winnie2020', 'Charles001',
  'Brenda88', 'Martin554', 'NaiBoyKe', 'NaliakaKe', 'KipKe',
  'WanjaKe', 'OtisKe', 'MumbiKe', 'NaiHustler', 'MombasaRider',
  'BondoFinest', 'KisumuDon', 'NakuruVibe', 'CoolKidKe', 'SimonWaweru',
  'AliceWanjiru', 'RichardOoko', 'EstherAkinyi', 'PaulNjoroge', 'LydiaChebet',
  'StephenOnyango', 'RuthWangari', 'TitusKoech', 'NaomiWanjau', 'PhilipMakori'
]

const USER_MESSAGES = [
  'Trade smart guys 🔥',
  'BUY now! 📈',
  'KES to the moon 🚀',
  'Just made 500 KES 🔥',
  'This platform is 🔥',
  'Who else is winning today? 💰',
  'SELL SELL SELL 📉',
  'Easy money 💸',
  'Lets gooo! 🎯',
  'On a winning streak 🏆',
  'Trust the chart 📊',
  'Big green candles today 💚',
  'Made back my deposit already 😎',
  'Always bet on green 💚',
  'Morning trades hitting different ☀️',
  'Green across the board today 💚',
  'Cashed out and smiling 😁',
  'Just doubled my money 🔥',
  'Charts looking juicy today 📈',
  'Another win in the books 🏆',
  'Loving these gains 💰',
  'Up since morning ☀️',
  'My portfolio is glowing 💎',
  'Patience pays guys 🙌',
  'Withdrew straight to Mpesa 📱',
  'No cap, this works 💯',
  'Stack those KES 📊',
  'Confidence is key 🔑',
  'Today is the day 🌟',
  'Hitting targets daily 🎯',
  'Profit secured ✅',
  'Up 20% this week 📈',
  'This community is everything 🙏',
  'Another deposit, another win 💵',
  'My best trading week yet 🔥',
  'Mpesa alert just hit 📲',
  'Consistency is the secret 🔐',
  'Poa kabisa, loving this 😎',
  'Noma! that trade paid off 🔥',
  'Fiti returns this week 💸',
]

const WITHDRAWAL_AMOUNTS = [195, 250, 300, 450, 500, 600, 700, 800, 1000, 1200, 1500, 2000, 2500]
const BONUS_AMOUNTS = [10, 20, 50, 100]

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateActivity(): Activity {
  const rand = Math.random()
  const id = Math.random().toString(36).slice(2)
  const name = randomItem(KENYAN_NAMES)

  if (rand < 0.55) {
    const amount = randomItem(WITHDRAWAL_AMOUNTS)
    return {
      id,
      type: 'system',
      emoji: '🎉',
      message: `CONGRATULATIONS @${name} on withdrawal of ${amount}.00 🎊`,
    }
  } else if (rand < 0.70) {
    const amount = randomItem(BONUS_AMOUNTS)
    return {
      id,
      type: 'system',
      emoji: '🎁',
      message: `${name}: BONUS of ${amount}.00 has been issued 🎁`,
    }
  } else {
    return {
      id,
      type: 'user',
      emoji: '👤',
      username: name,
      message: randomItem(USER_MESSAGES),
    }
  }
}

const SEED_ACTIVITIES: Activity[] = Array.from({ length: 12 }, generateActivity)

export function DashboardSidebar({ activities }: DashboardSidebarProps) {
  const [feed, setFeed] = useState<Activity[]>(
    activities && activities.length > 0 ? activities : SEED_ACTIVITIES
  )
  const [onlineCount, setOnlineCount] = useState(1281)
  const [message, setMessage] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll only inside the feed container, not the whole page
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [feed])

  // Add a new random activity every 2–4 seconds
  useEffect(() => {
    const schedule = () => {
      const delay = 2000 + Math.random() * 2000
      return setTimeout(() => {
        setFeed((prev) => {
          const next = [...prev, generateActivity()]
          return next.length > 50 ? next.slice(-50) : next
        })
        setOnlineCount((c) =>
          Math.max(1100, Math.min(1500, c + Math.floor((Math.random() - 0.45) * 5)))
        )
        timerRef.current = schedule()
      }, delay)
    }
    const timerRef = { current: schedule() }
    return () => clearTimeout(timerRef.current)
  }, [])

  const handleSend = () => {
    if (!message.trim()) return
    setFeed((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        type: 'user',
        emoji: '👤',
        username: 'You',
        message: message.trim(),
      },
    ])
    setMessage('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend()
  }

  return (
    <aside
      className="hidden lg:flex flex-col w-80 bg-surface border-r border-border"
      style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}
    >
      {/* Header — fixed, never scrolls */}
      <div className="flex-none px-4 py-4 border-b border-border flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Live Activity
        </h2>
        <span className="text-xs text-muted">{onlineCount.toLocaleString()} online</span>
      </div>

      {/* Feed — minHeight:0 is the critical fix */}
      <div
        className="flex-1 overflow-y-auto px-3 py-3 space-y-2"
        style={{ minHeight: 0 }}
      >
        {feed.map((activity) => (
          <div
            key={activity.id}
            className={`p-3 rounded-lg text-xs border transition-colors ${
              activity.type === 'system'
                ? 'bg-primary/5 border-primary/20'
                : 'bg-surface border-border/50'
            }`}
          >
            {activity.type === 'system' ? (
              <p className="text-primary leading-snug">
                {activity.emoji} {activity.message}
              </p>
            ) : (
              <div>
                <span className="text-foreground font-semibold">{activity.username}: </span>
                <span className="text-muted">{activity.message}</span>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Send Message — fixed at bottom, never scrolls */}
      <div className="flex-none border-t border-border p-3 flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Say something..."
          className="flex-1 px-3 py-2 bg-surface border border-border rounded text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={handleSend}
          className="px-4 py-2 bg-primary text-black font-bold rounded text-xs hover:bg-primary/90 transition-colors"
        >
          SEND
        </button>
      </div>
    </aside>
  )
}