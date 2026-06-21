import { useCallback, useEffect, useRef, useState } from "react"

const SCRIPT_URL = import.meta.env.VITE_SCRIPT_URL
const STATION_KEY = import.meta.env.VITE_STATION_KEY || "mso"

export function usePrices() {
  const [prices, setPrices] = useState({ pms: 1272, ago: 1819 })
  const [loading, setLoading] = useState(true)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const load = useCallback(() => {
    if (!SCRIPT_URL) {
      setLoading(false)
      return
    }
    const url = new URL(SCRIPT_URL)
    url.searchParams.set("action", "getCurrentPrices")
    url.searchParams.set("station", STATION_KEY)
    fetch(url.toString(), { method: "GET", redirect: "follow" })
      .then(res => res.json())
      .then(d => {
        if (!isMounted.current || !d.ok) return
        setPrices({ pms: d.pmsPrice ? Number(d.pmsPrice) : 1272, ago: d.agoPrice ? Number(d.agoPrice) : 1819 })
        setLoading(false)
      })
      .catch(() => {
        if (isMounted.current) setLoading(false)
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { prices, loading, refresh: load }
}
