'use client'

import { useEffect, useRef, useState } from 'react'
import {
  generateChartData,
  generateNextPrice,
  CHART_BASE_PRICE,
  type ChartPoint,
} from '@/lib/trading'

const INTERVAL_POINTS = {
  '30s': 60,
  '1m': 90,
  '2m': 130,
  '5m': 160,
} as const

type IntervalKey = keyof typeof INTERVAL_POINTS

// Fixed price window so the baseline (0.0) never moves on screen.
const FIXED_MIN_PRICE = -3
const FIXED_MAX_PRICE = 3

// Minimum pixel distance from baseline before a fill segment is drawn.
const FILL_EPSILON = 0.75

export function TradingChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dataRef = useRef<ChartPoint[]>([])
  const [selectedInterval, setSelectedInterval] = useState<IntervalKey>('30s')
  const [currentPrice, setCurrentPrice] = useState(0)
  const selectedIntervalRef = useRef(selectedInterval)

  // Generate the random seed data on the client only to avoid SSR/client
  // hydration mismatch (Math.random differs between server and client).
  if (dataRef.current.length === 0 && typeof window !== 'undefined') {
    dataRef.current = generateChartData(200)
  }

  useEffect(() => {
    selectedIntervalRef.current = selectedInterval
  }, [selectedInterval])

  const drawChart = (data: ChartPoint[]) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Handle device pixel ratio for crisp rendering.
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    const W = rect.width
    const H = rect.height
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
      canvas.width = W * dpr
      canvas.height = H * dpr
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const minPrice = FIXED_MIN_PRICE
    const maxPrice = FIXED_MAX_PRICE
    const priceRange = maxPrice - minPrice

    const padLeft = 44
    const plotW = W - padLeft - 16
    const toX = (i: number) => padLeft + (i / (data.length - 1)) * plotW
    const toY = (p: number) => H - ((p - minPrice) / priceRange) * H
    const baselineY = toY(CHART_BASE_PRICE)

    ctx.clearRect(0, 0, W, H)

    // Pure black background
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, W, H)

    // Dotted horizontal grid lines + axis labels at 3.0 / 1.5 / 0 / -1.5 / -3.0
    const labelValues = [3, 1.5, 0, -1.5, -3]
    ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    for (const value of labelValues) {
      const y = toY(value)

      ctx.strokeStyle = 'rgba(120, 130, 140, 0.28)'
      ctx.lineWidth = 1
      ctx.setLineDash([1, 6])
      ctx.beginPath()
      ctx.moveTo(padLeft, y)
      ctx.lineTo(W, y)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.fillStyle = '#7a8590'
      ctx.fillText(value.toFixed(1), 6, y)
    }

    // Build smoothed raw points (Catmull-Rom -> Bezier)
    const rawPoints = data.map((d, i) => ({ x: toX(i), y: toY(d.price) }))

    const buildSmoothPath = (pts: { x: number; y: number }[]): Path2D => {
      const path = new Path2D()
      if (pts.length === 0) return path
      path.moveTo(pts[0].x, pts[0].y)
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i]
        const p1 = pts[i]
        const p2 = pts[i + 1]
        const p3 = pts[i + 2] || p2
        const cp1x = p1.x + (p2.x - p0.x) / 6
        const cp1y = p1.y + (p2.y - p0.y) / 6
        const cp2x = p2.x - (p3.x - p1.x) / 6
        const cp2y = p2.y - (p3.y - p1.y) / 6
        path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y)
      }
      return path
    }

    const smoothLinePath = buildSmoothPath(rawPoints)

    // Densely sample the curve so fills clip accurately at the baseline.
    const sampledPoints: { x: number; y: number }[] = []
    for (let i = 0; i < rawPoints.length - 1; i++) {
      const p0 = rawPoints[i - 1] || rawPoints[i]
      const p1 = rawPoints[i]
      const p2 = rawPoints[i + 1]
      const p3 = rawPoints[i + 2] || p2
      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6

      const steps = 10
      for (let s = 0; s <= steps; s++) {
        if (i > 0 && s === 0) continue
        const t = s / steps
        const mt = 1 - t
        const x =
          mt * mt * mt * p1.x + 3 * mt * mt * t * cp1x + 3 * mt * t * t * cp2x + t * t * t * p2.x
        const y =
          mt * mt * mt * p1.y + 3 * mt * mt * t * cp1y + 3 * mt * t * t * cp2y + t * t * t * p2.y
        sampledPoints.push({ x, y })
      }
    }
    if (sampledPoints.length === 0 && rawPoints.length > 0) {
      sampledPoints.push(rawPoints[0])
    }

    // Solid fills: green above baseline, dark red below.
    const drawFillSegment = (seg: { x: number; y: number }[]) => {
      if (seg.length < 2) return
      const maxAbove = Math.max(0, baselineY - Math.min(...seg.map((p) => p.y)))
      const maxBelow = Math.max(0, Math.max(...seg.map((p) => p.y)) - baselineY)

      const fill = (clipAbove: boolean, color: string, extent: number) => {
        if (extent < FILL_EPSILON) return
        ctx.beginPath()
        ctx.moveTo(seg[0].x, baselineY)
        for (const pt of seg) {
          ctx.lineTo(pt.x, clipAbove ? Math.min(pt.y, baselineY) : Math.max(pt.y, baselineY))
        }
        ctx.lineTo(seg[seg.length - 1].x, baselineY)
        ctx.closePath()
        ctx.fillStyle = color
        ctx.fill()
      }

      fill(true, '#1f7a32', maxAbove)
      fill(false, '#4d1212', maxBelow)
    }

    let segment: { x: number; y: number }[] = [sampledPoints[0]]
    for (let i = 1; i < sampledPoints.length; i++) {
      const prev = sampledPoints[i - 1]
      const curr = sampledPoints[i]
      const prevSide = prev.y < baselineY ? 1 : prev.y > baselineY ? -1 : 0
      const currSide = curr.y < baselineY ? 1 : curr.y > baselineY ? -1 : 0
      if (prevSide !== 0 && currSide !== 0 && prevSide !== currSide) {
        const t = (baselineY - prev.y) / (curr.y - prev.y)
        const ix = prev.x + (curr.x - prev.x) * t
        const crossPoint = { x: ix, y: baselineY }
        segment.push(crossPoint)
        drawFillSegment(segment)
        segment = [crossPoint, curr]
      } else {
        segment.push(curr)
      }
    }
    drawFillSegment(segment)

    // Glowing bright-green price line
    ctx.save()
    ctx.shadowColor = 'rgba(74, 222, 128, 0.7)'
    ctx.shadowBlur = 8
    ctx.strokeStyle = '#4ade80'
    ctx.lineWidth = 2.5
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.stroke(smoothLinePath)
    ctx.restore()

    // Live dot at the end
    const lastX = toX(data.length - 1)
    const lastY = toY(data[data.length - 1].price)
    ctx.save()
    ctx.shadowColor = 'rgba(74, 222, 128, 0.9)'
    ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.arc(lastX, lastY, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#4ade80'
    ctx.fill()
    ctx.restore()
  }

  // On mount: ensure seed data exists, set the initial price, draw once.
  useEffect(() => {
    if (dataRef.current.length === 0) {
      dataRef.current = generateChartData(200)
    }
    const last = dataRef.current[dataRef.current.length - 1]
    if (last) setCurrentPrice(last.price)
    drawChart(dataRef.current.slice(-INTERVAL_POINTS[selectedIntervalRef.current]))
  }, [])

  // Tick: append a new price and redraw.
  useEffect(() => {
    const interval = setInterval(() => {
      const prev = dataRef.current
      const last = prev[prev.length - 1]
      const nextPrice = generateNextPrice(last.price)

      const newPoint: ChartPoint = {
        time: last.time + 1,
        price: nextPrice,
        baseline: CHART_BASE_PRICE,
        timestamp: new Date(),
      }

      const maxPoints = Math.max(...Object.values(INTERVAL_POINTS))
      const newData = [...prev, newPoint]
      dataRef.current = newData.length > maxPoints ? newData.slice(-maxPoints) : newData

      setCurrentPrice(nextPrice)

      const pointsToShow = INTERVAL_POINTS[selectedIntervalRef.current]
      drawChart(dataRef.current.slice(-pointsToShow))
    }, 300)

    return () => clearInterval(interval)
  }, [])

  // Redraw when interval changes or on resize.
  useEffect(() => {
    const redraw = () => {
      const pointsToShow = INTERVAL_POINTS[selectedInterval]
      drawChart(dataRef.current.slice(-pointsToShow))
    }
    redraw()
    window.addEventListener('resize', redraw)
    return () => window.removeEventListener('resize', redraw)
  }, [selectedInterval])

  return (
    <div className="w-full">
      {/* Controls row */}
      <div className="relative mb-3 flex items-center">
        <div className="flex items-center gap-2">
          {(Object.keys(INTERVAL_POINTS) as IntervalKey[]).map((interval) => (
            <button
              key={interval}
              onClick={() => setSelectedInterval(interval)}
              className={`rounded-md border px-3 py-1 font-mono text-xs font-medium transition-colors ${
                interval === selectedInterval
                  ? 'border-[#4ade80] text-[#4ade80]'
                  : 'border-[#2a2f37] text-[#8a929c] hover:text-white'
              }`}
            >
              {interval}
            </button>
          ))}
        </div>

        <div className="-translate-x-1/2 absolute left-1/2 rounded-md border border-[#3a4049] bg-[#0d0f12] px-4 py-1.5 font-mono text-sm text-white">
          Rate: {currentPrice.toFixed(4)}
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="block h-[560px] w-full"
        aria-label="Live trading rate chart"
        role="img"
      />
    </div>
  )
}
