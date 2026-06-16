// lib/hooks/useOnlineCount.ts
'use client'

import { useEffect, useState } from 'react'

export function useOnlineCount(min = 1200, max = 1300) {
  const [count, setCount] = useState(() => Math.round((min + max) / 2))

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    const tick = () => {
      timer = setTimeout(() => {
        setCount((prev) => {
          const step = Math.floor((Math.random() - 0.5) * 6) // -3..+3 per tick
          return Math.max(min, Math.min(max, prev + step))
        })
        tick()
      }, 1500 + Math.random() * 2500) // every 1.5–4s
    }

    tick()
    return () => clearTimeout(timer)
  }, [min, max])

  return count
}