'use client'

import { useEffect, useState } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { generateChartData, generateNextPrice } from '@/lib/trading'

interface TradingChartProps {
  direction: 'buy' | 'sell'
  isTradeActive?: boolean
  onPriceUpdate?: (price: number) => void
}

// Map each interval to how many data points should be visible
const INTERVAL_POINTS: Record<string, number> = {
  '30s': 30,
  '1m': 50,
  '2m': 80,
  '5m': 150,
}

export function TradingChart({
  direction,
  isTradeActive = false,
  onPriceUpdate,
}: TradingChartProps) {
  const [data, setData] = useState(() => generateChartData(200)) // larger rolling buffer for zoom
  const [trend] = useState(() => (Math.random() - 0.5) * 0.001)
  const [selectedInterval, setSelectedInterval] = useState<keyof typeof INTERVAL_POINTS>('1m')

  // ✅ Always update chart every 500ms regardless of trade state
  useEffect(() => {
  const interval = setInterval(() => {
    setData((prevData) => {
      const lastPrice = prevData[prevData.length - 1].price
      const lastTime = prevData[prevData.length - 1].time
      const nextPrice = generateNextPrice(lastPrice, trend)

      const newData = [
        ...prevData,
        {
          time: lastTime + 1,
          price: nextPrice,
          timestamp: new Date(),
        },
      ]

      // Keep buffer capped at the largest interval window
      const maxPoints = Math.max(...Object.values(INTERVAL_POINTS))
      return newData.length > maxPoints ? newData.slice(-maxPoints) : newData
    })
  }, 500)

  return () => clearInterval(interval)
}, [trend])

  // ✅ CORRECT - notify parent inside useEffect, never during render
  const currentPrice = data[data.length - 1]?.price ?? 0

  useEffect(() => {
    if (onPriceUpdate) {
      onPriceUpdate(currentPrice)
    }
  }, [currentPrice, onPriceUpdate])

  const previousPrice = data[0]?.price ?? 0
  const changePercent =
    previousPrice !== 0
      ? ((currentPrice - previousPrice) / previousPrice) * 100
      : 0
  const isPositive = changePercent >= 0

  // ✅ Slice to the window for the selected interval — this is the zoom
  const pointsToShow = INTERVAL_POINTS[selectedInterval]
  const visibleData = data.slice(-pointsToShow)

  return (
    <div className="space-y-3">
      {/* Price Display Card */}
      <div className="bg-surface border border-border rounded-lg p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-1">
              Current Rate
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-5xl font-bold text-primary font-mono">
                {currentPrice.toFixed(4)}
              </p>
              <p
                className={`text-lg font-bold ${
                  isPositive ? 'text-primary' : 'text-destructive'
                }`}
              >
                {isPositive ? '+' : ''}
                {changePercent.toFixed(2)}%
              </p>
            </div>
          </div>
          <div className="text-right">
            <div
              className={`inline-block px-3 py-1 rounded-lg font-mono text-sm border ${
                isTradeActive
                  ? 'bg-primary/20 border-primary text-primary'
                  : 'bg-surface border-border text-muted'
              }`}
            >
              Rate: {currentPrice.toFixed(4)}
            </div>
            {isTradeActive && (
              <div className="text-xs text-primary font-semibold mt-2 animate-pulse">
                ● TRADE ACTIVE
              </div>
            )}
          </div>
        </div>

        {/* Interval Tabs — now functional zoom controls */}
        <div className="flex gap-1 mt-3">
          {(Object.keys(INTERVAL_POINTS) as Array<keyof typeof INTERVAL_POINTS>).map((interval) => (
            <button
              key={interval}
              onClick={() => setSelectedInterval(interval)}
              className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                interval === selectedInterval
                  ? 'bg-primary text-black'
                  : 'text-muted hover:text-foreground bg-surface border border-border'
              }`}
            >
              {interval}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div
        className={`bg-surface border rounded-lg p-4 h-64 md:h-80 transition-all ${
          isTradeActive
            ? 'border-primary shadow-lg shadow-primary/20'
            : 'border-border'
        }`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={visibleData}
            margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
  dataKey="timestamp"
  stroke="#9ca3af"
  tick={{ fontSize: 10 }}
  tickFormatter={(value: Date) =>
    new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }
/>
            <YAxis
              stroke="#9ca3af"
              tick={{ fontSize: 10 }}
              domain={['dataMin - 0.0005', 'dataMax + 0.0005']}
              width={55}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1f28',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
              formatter={(value: any) => [
                (value as number).toFixed(4),
                'Price',
              ]}
              labelStyle={{ color: '#9ca3af' }}
            />
            <Bar
              dataKey="price"
              fill={
                direction === 'buy'
                  ? 'rgba(34, 197, 94, 0.1)'
                  : 'rgba(239, 68, 68, 0.1)'
              }
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke={direction === 'buy' ? '#22c55e' : '#ef4444'}
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}