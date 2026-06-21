import { useCallback, useEffect, useRef, useState } from "react"

const SCRIPT_URL = import.meta.env.VITE_SCRIPT_URL
const STATION_KEY = import.meta.env.VITE_STATION_KEY || "mso"

export function useDashboardData(username) {
  const [status, setStatus] = useState("idle")
  const [data, setData] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const load = useCallback(() => {
    if (!SCRIPT_URL) {
      setStatus("idle")
      return
    }

    setStatus("loading")

    const url = new URL(SCRIPT_URL)
    url.searchParams.set("action", "getDashboard")
    url.searchParams.set("station", STATION_KEY)
    url.searchParams.set("username", username || "owner")

    fetch(url.toString(), { method: "GET", redirect: "follow" })
      .then(res => res.json())
      .then(payload => {
        if (!isMounted.current) return

        if (!payload.ok) {
          setStatus("error")
          setData(null)
          return
        }
        if (payload.noData) {
          setStatus("no-data")
          setData(null)
          setUpdatedAt(new Date())
          return
        }
        if (payload.openingOnly) {
          setStatus("opening")
          setData(payload)
          setUpdatedAt(new Date())
          return
        }
        setStatus("ready")
        setData(payload)
        setUpdatedAt(new Date())
      })
      .catch(() => {
        if (!isMounted.current) return
        setStatus("error")
        setData(null)
      })
  }, [username])

  useEffect(() => {
    load()
  }, [load])

  return {
    status,
    data,
    updatedAt,
    loading: status === "loading",
    refresh: load,
    configured: Boolean(SCRIPT_URL),
  }
}
