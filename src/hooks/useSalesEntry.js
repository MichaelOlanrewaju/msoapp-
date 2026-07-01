import { useCallback, useEffect, useRef, useState } from "react"
import { PUMPS } from "../config/pumps"
import { compressImage } from "../utils/compressImage"
import { postWithProgress } from "../utils/postWithProgress"

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
  const [existingPhotos, setExistingPhotos] = useState({}) // { [pumpId__session]: { session, fileId, submittedBy } }
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const loadPhotos = useCallback(date => {
    if (!SCRIPT_URL) return
    const url = new URL(SCRIPT_URL)
    url.searchParams.set("action", "getPhotos")
    url.searchParams.set("station", STATION_KEY)
    url.searchParams.set("date", date)
    fetch(url.toString(), { method: "GET", redirect: "follow" })
      .then(res => res.json())
      .then(d => {
        if (!isMounted.current || !d.ok) return
        const map = {}
        ;(d.photos || []).forEach(p => {
          const key = `${p.subject}__${p.session}`
          map[key] = { session: p.session, fileId: p.fileId, submittedBy: p.submittedBy }
        })
        setExistingPhotos(map)
      })
      .catch(() => {
        // silent — worst case a previously-captured pump photo just
        // doesn't show a thumbnail this load, nothing is lost
      })
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
      setExistingPhotos({})

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

      loadPhotos(date)
    },
    [username, loadPhotos]
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
          const failedPumps = []
          const pumpsWithReadings = PUMPS.filter(p => {
            const r = readings[pumpId(p)]
            return Number(r.open) > 0 || Number(r.close) > 0
          })

          // Saved in small batches rather than all at once — firing up to
          // 14 simultaneous POSTs (2 per pump x 7 pumps) at Apps Script
          // in one Promise.all was a plausible cause of an occasional
          // silent drop under load. A few at a time is still fast but
          // much less likely to overwhelm the script's concurrency limits.
          const BATCH_SIZE = 3
          const savePump = p => {
            const pid = pumpId(p)
            const r = readings[pid]
            const op = Number(r.open) || 0
            const cl = Number(r.close) || 0
            const price = p.product === "AGO" ? prices.ago : prices.pms
            const diff = cl >= op ? cl - op : 0

            return post({
              action: "savePumpMetre", station: STATION_KEY, username, date,
              pump: pid, product: p.product, tank: p.tank,
              openingMetre: op, closingMetre: cl, diff, price,
              amount: Math.round(diff * price), sessionNum: 1,
            })
              .then(res => {
                if (!res || !res.ok) failedPumps.push(pid)
                return res
              })
              .catch(() => {
                failedPumps.push(pid)
                return { ok: false }
              })
              .then(() => {
                if (diff <= 0) return null
                // saleSave failing doesn't lose the metre reading itself —
                // it's the SalesLog/transactions feed, not the reading of
                // record, so it's logged but doesn't fail the whole pump.
                return post({
                  action: "saveSale", station: STATION_KEY, username, date,
                  tank: p.tank, pump: pid, product: p.product,
                  litres: diff, pricePerL: price, amount: Math.round(diff * price),
                  payMethod: "Mixed", attendant: name || username, notes: notes || "",
                }).catch(() => null)
              })
          }

          let chain = Promise.resolve()
          for (let i = 0; i < pumpsWithReadings.length; i += BATCH_SIZE) {
            const batch = pumpsWithReadings.slice(i, i + BATCH_SIZE)
            chain = chain.then(() => Promise.all(batch.map(savePump)))
          }

          return chain.then(() => {
            setSaving(false)
            if (failedPumps.length > 0) {
              return { ok: false, error: `Reading didn't save for: ${failedPumps.join(", ")}. Please try those pumps again.` }
            }
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
    async (date, session, subject, dataUrl, mimeType, onProgress) => {
      let toSend = dataUrl
      let sendMime = mimeType || "image/jpeg"
      try {
        const compressed = await compressImage(dataUrl)
        toSend = compressed.dataUrl
        sendMime = compressed.mimeType
      } catch (e) {
        // fall back to original image if compression fails for any reason
      }

      const base64 = toSend.split(",")[1]
      try {
        return await postWithProgress(
          SCRIPT_URL,
          { action: "savePhoto", station: STATION_KEY, username, date, session, subject, mimeType: sendMime, base64 },
          onProgress
        )
      } catch (e) {
        return { ok: false }
      }
    },
    [username]
  )

  return {
    status, readings, hasOpening, hasClosing, existingPhotos,
    updateReading, clearAll, grandTotals, submit, savePhoto, saving,
    refresh: () => loadForDate(selectedDate),
  }
}
