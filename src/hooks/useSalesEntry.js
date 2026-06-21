import { useCallback, useEffect, useRef, useState } from "react"
import { PUMPS } from "../config/pumps"

const SCRIPT_URL = import.meta.env.VITE_SCRIPT_URL
const STATION_KEY = import.meta.env.VITE_STATION_KEY || "mso"

function pumpId(p) {
  return p.pumpId || p.id
}

function emptyReadings() {
  const readings = {}
  PUMPS.forEach(p => {
    readings[pumpId(p)] = { open: "", close: "" }
  })
  return readings
}

function diffFor(r) {
  const op = Number(r.open) || 0
  const cl = Number(r.close) || 0
  if (op === 0 && cl === 0) return null
  if (cl < op) return "err"
  return cl - op
}

function post(payload) {
  return fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(payload),
    redirect: "follow",
  }).then(res => res.json())
}

export function useSalesEntry(username, name, selectedDate) {
  const [status, setStatus] = useState("loading")
  const [readings, setReadings] = useState(emptyReadings)
  const [hasOpening, setHasOpening] = useState(false)
  const [hasClosing, setHasClosing] = useState(false)
  const [saving, setSaving] = useState(false)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const loadForDate = useCallback(
    date => {
      if (!SCRIPT_URL) {
        setStatus("idle")
        return
      }
      setStatus("loading")
      setReadings(emptyReadings())
      setHasOpening(false)
      setHasClosing(false)

      const url = new URL(SCRIPT_URL)
      url.searchParams.set("action", "getDailyReport")
      url.searchParams.set("station", STATION_KEY)
      url.searchParams.set("date", date)
      url.searchParams.set("username", username || "")

      fetch(url.toString(), { method: "GET", redirect: "follow" })
        .then(res => res.json())
        .then(d => {
          if (!isMounted.current) return
          if (!d.ok || !d.report || !d.report.pumpMetres) {
            setStatus("ready")
            return
          }
          const pm = d.report.pumpMetres
          const next = emptyReadings()
          let anyOpen = false
          let anyClose = false

          PUMPS.forEach(p => {
            const pid = pumpId(p)
            const session = pm[pid] && pm[pid].sessions && pm[pid].sessions[0]
            if (session) {
              if (session.open > 0) anyOpen = true
              if (session.close > 0) anyClose = true
              next[pid] = { open: session.open || "", close: session.close || "" }
            }
          })

          setReadings(next)
          setHasOpening(anyOpen)
          setHasClosing(anyClose)
          setStatus("ready")
        })
        .catch(() => {
          if (!isMounted.current) return
          setStatus("error")
        })
    },
    [username]
  )

  useEffect(() => {
    if (selectedDate) loadForDate(selectedDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate])

  const updateReading = useCallback((pid, field, value) => {
    setReadings(prev => ({ ...prev, [pid]: { ...prev[pid], [field]: value } }))
  }, [])

  const clearAll = useCallback(() => {
    setReadings(emptyReadings())
  }, [])

  const grandTotals = useCallback(
    prices => {
      let pmsL = 0, agoL = 0
      let hasError = false
      PUMPS.forEach(p => {
        const pid = pumpId(p)
        const d = diffFor(readings[pid])
        if (d === "err") hasError = true
        else if (typeof d === "number") {
          if (p.product === "AGO") agoL += d
          else pmsL += d
        }
      })
      return {
        pmsL,
        agoL,
        pmsRev: Math.round(pmsL * prices.pms),
        agoRev: Math.round(agoL * prices.ago),
        hasError,
      }
    },
    [readings]
  )

  const tankAverage = useCallback(
    (tankId, field) => {
      const ps = PUMPS.filter(p => p.tank === tankId)
      const vals = ps.map(p => Number(readings[pumpId(p)][field]) || 0).filter(v => v > 0)
      if (!vals.length) return 0
      return vals.reduce((a, b) => a + b, 0) / vals.length
    },
    [readings]
  )

  const tankSum = useCallback(
    tankId => {
      const ps = PUMPS.filter(p => p.tank === tankId)
      return ps.reduce((sum, p) => {
        const d = diffFor(readings[pumpId(p)])
        return sum + (typeof d === "number" ? d : 0)
      }, 0)
    },
    [readings]
  )

  const hasAnyReading = useCallback(
    field => PUMPS.some(p => Number(readings[pumpId(p)][field]) > 0),
    [readings]
  )

  const submit = useCallback(
    (date, prices, notes) => {
      const { pmsL, agoL, pmsRev, agoRev, hasError } = grandTotals(prices)
      if (hasError) return Promise.resolve({ ok: false, error: "Fix errors before submitting" })
      if (!hasAnyReading("open") && !hasAnyReading("close")) {
        return Promise.resolve({ ok: false, error: "Enter at least one pump reading" })
      }

      const data = {
        tk1_opening: tankAverage("TK1", "open"), tk1_closing: tankAverage("TK1", "close"), tk1_diff: tankSum("TK1"), tk1_margin: 0,
        tk2_opening: tankAverage("TK2", "open"), tk2_closing: tankAverage("TK2", "close"), tk2_diff: tankSum("TK2"), tk2_margin: 0,
        tk3_opening: tankAverage("TK3", "open"), tk3_closing: tankAverage("TK3", "close"), tk3_diff: tankSum("TK3"), tk3_margin: 0,
        tk4_opening: tankAverage("TK4", "open"), tk4_closing: tankAverage("TK4", "close"), tk4_diff: agoL, tk4_margin: 0,
        pms_litres: pmsL, pms_price: prices.pms, pms_revenue: pmsRev, pms_margin: 0,
        ago_litres: agoL, ago_price: prices.ago, ago_revenue: agoRev, ago_margin: 0,
        grand_total: pmsRev + agoRev,
      }

      setSaving(true)
      return post({ action: "saveDailyReport", station: STATION_KEY, username, date, data })
        .then(d => {
          if (!d.ok) {
            setSaving(false)
            return d
          }
          const saves = PUMPS.map(p => {
            const pid = pumpId(p)
            const r = readings[pid]
            const op = Number(r.open) || 0
            const cl = Number(r.close) || 0
            if (op === 0 && cl === 0) return Promise.resolve()
            const price = p.product === "AGO" ? prices.ago : prices.pms
            const diff = cl >= op ? cl - op : 0

            const metreSave = post({
              action: "savePumpMetre", station: STATION_KEY, username, date,
              pump: pid, product: p.product, tank: p.tank,
              openingMetre: op, closingMetre: cl, diff, price,
              amount: Math.round(diff * price), sessionNum: 1,
            })

            if (diff <= 0) return metreSave

            const saleSave = post({
              action: "saveSale", station: STATION_KEY, username, date,
              tank: p.tank, pump: pid, product: p.product,
              litres: diff, pricePerL: price, amount: Math.round(diff * price),
              payMethod: "Mixed", attendant: name || username, notes: notes || "",
            })

            return Promise.all([metreSave, saleSave])
          })

          return Promise.all(saves).then(() => {
            setSaving(false)
            return d
          })
        })
        .catch(() => {
          setSaving(false)
          return { ok: false, error: "Network error — check connection" }
        })
    },
    [readings, username, name, grandTotals, tankAverage, tankSum, hasAnyReading]
  )

  const savePhoto = useCallback(
    (date, session, subject, dataUrl, mimeType) => {
      const base64 = dataUrl.split(",")[1]
      return post({
        action: "savePhoto", station: STATION_KEY, username, date,
        session, subject, mimeType: mimeType || "image/jpeg", base64,
      }).catch(() => ({ ok: false }))
    },
    [username]
  )

  return {
    status, readings, hasOpening, hasClosing,
    updateReading, clearAll, grandTotals, submit, savePhoto, saving,
    refresh: () => loadForDate(selectedDate),
  }
}
