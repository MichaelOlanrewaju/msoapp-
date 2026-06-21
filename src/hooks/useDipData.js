import { useCallback, useEffect, useRef, useState } from "react"
import { TANKS } from "../config/pumps"

const SCRIPT_URL = import.meta.env.VITE_SCRIPT_URL
const STATION_KEY = import.meta.env.VITE_STATION_KEY || "mso"

export { TANKS }

function emptyTankState() {
  return { TK1: { open: 0, close: 0 }, TK2: { open: 0, close: 0 }, TK3: { open: 0, close: 0 }, TK4: { open: 0, close: 0 } }
}

function post(payload) {
  return fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(payload),
    redirect: "follow",
  }).then(res => res.json())
}

function preservedFields(rawReport) {
  // Every field saveDailyReport writes that ISN'T a tank-stock field —
  // pulled from the existing row so a dip save never zeroes out
  // pump-metre, cash/POS/expense/LPG data that Sales or a cashier
  // already submitted for this date. saveDailyReport does a full
  // 50-column row overwrite, not a merge, so this matters every time.
  const r = rawReport || {}
  return {
    pms_margin: r.pms_margin || 0,
    pms_litres: r.pms_litres || 0,
    pms_price: r.pms_price || 0,
    pms_revenue: r.pms_revenue || 0,
    ago_margin: r.ago_margin || 0,
    ago_litres: r.ago_litres || 0,
    ago_price: r.ago_price || 0,
    ago_revenue: r.ago_revenue || 0,
    grand_total: r.grand_total || 0,
    pos_mp: r.pos_mp || 0,
    pos_zm: r.pos_zm || 0,
    trf_mp: r.trf_mp || 0,
    trf_zb_amelia: r.trf_zb_amelia || 0,
    trf_fcmb_truck: r.trf_fcmb_truck || 0,
    trf_fcmb_md: r.trf_fcmb_md || 0,
    cash: r.cash || 0,
    total_expenses: r.total_expenses || 0,
    to_bank: r.to_bank || 0,
    pos_mp_charge: r.pos_mp_charge || 0,
    pos_zm_charge: r.pos_zm_charge || 0,
    emtl_counts: r.emtl_counts || 0,
    lubricant_rev: r.lubricant_rev || 0,
    lpg_kg: r.lpg_kg || 0,
    lpg_price: r.lpg_price || 0,
    lpg_revenue: r.lpg_revenue || 0,
    lpg_remitted: r.lpg_remitted || 0,
    pms_cash_summary: r.pms_cash_summary || 0,
    oil_cash_summary: r.oil_cash_summary || 0,
    gas_cash_summary: r.gas_cash_summary || 0,
    total_cash_summary: r.total_cash_summary || 0,
  }
}

export function useDipData(username, selectedDate) {
  const [status, setStatus] = useState("loading")
  const [tankState, setTankState] = useState(emptyTankState())
  const [hasOpening, setHasOpening] = useState(false)
  const [hasClosing, setHasClosing] = useState(false)
  const [hasCash, setHasCash] = useState(false)
  const rawReportRef = useRef(null)
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
      setTankState(emptyTankState())
      setHasOpening(false)
      setHasClosing(false)
      setHasCash(false)
      rawReportRef.current = null

      const url = new URL(SCRIPT_URL)
      url.searchParams.set("action", "getDailyReport")
      url.searchParams.set("station", STATION_KEY)
      url.searchParams.set("date", date)
      url.searchParams.set("username", username || "")

      fetch(url.toString(), { method: "GET", redirect: "follow" })
        .then(res => res.json())
        .then(d => {
          if (!isMounted.current) return
          if (!d.ok || !d.report) {
            setStatus("ready")
            return
          }
          const r = d.report
          rawReportRef.current = r
          const next = emptyTankState()
          ;["TK1", "TK2", "TK3", "TK4"].forEach(id => {
            const k = id.toLowerCase()
            next[id] = {
              open: Number(r[`${k}_opening`]) || 0,
              close: Number(r[`${k}_closing`]) || 0,
            }
          })
          setTankState(next)

          const openDone = Number(next.TK1.open) > 0 || Number(next.TK2.open) > 0
          const closeDone = Number(next.TK1.close) > 0 || Number(next.TK2.close) > 0
          const cashDone = Number(r.to_bank || 0) > 0
          setHasOpening(openDone)
          setHasClosing(closeDone)
          setHasCash(cashDone)
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

  const updateTank = useCallback((tankId, field, value) => {
    setTankState(prev => ({ ...prev, [tankId]: { ...prev[tankId], [field]: Number(value) || 0 } }))
  }, [])

  const saveOpening = useCallback(
    date => {
      const hasAny = TANKS.some(t => tankState[t.id].open > 0)
      if (!hasAny) return Promise.resolve({ ok: false, error: "Enter at least one opening stock reading" })

      const data = {
        tk1_opening: tankState.TK1.open, tk2_opening: tankState.TK2.open, tk3_opening: tankState.TK3.open, tk4_opening: tankState.TK4.open,
        tk1_closing: 0, tk2_closing: 0, tk3_closing: 0, tk4_closing: 0,
        tk1_diff: 0, tk2_diff: 0, tk3_diff: 0, tk4_diff: 0,
        tk1_margin: 0, tk2_margin: 0, tk3_margin: 0, tk4_margin: 0,
        ...preservedFields(rawReportRef.current),
      }

      return post({ action: "saveDailyReport", station: STATION_KEY, username, date, data }).then(d => {
        if (!d.ok) return d
        rawReportRef.current = { ...rawReportRef.current, ...data }
        return d
      })
    },
    [tankState, username]
  )

  const saveClosing = useCallback(
    date => {
      // Dip only ever reports the raw stock difference now — margin
      // (dip diff minus pump diff) is computed on the Records page,
      // once both Dip and Sales data exist for the date.
      const tankDiffs = {}
      let anyDiff = false

      TANKS.forEach(tk => {
        const s = tankState[tk.id]
        const diff = s.open > 0 && s.close > 0 && s.open > s.close ? s.open - s.close : 0
        tankDiffs[tk.id] = diff
        if (diff > 0) anyDiff = true
      })

      if (!anyDiff) {
        return Promise.resolve({ ok: false, error: "Enter closing stock readings first" })
      }

      // Existing margin values are preserved as-is (not recalculated
      // here) since margin depends on pump data Dip no longer touches.
      // The Records page is responsible for writing fresh margin
      // figures once pump readings are also in for this date.
      const prevReport = rawReportRef.current || {}
      const data = {
        tk1_opening: tankState.TK1.open, tk1_closing: tankState.TK1.close, tk1_diff: tankDiffs.TK1, tk1_margin: prevReport.tk1_margin || 0,
        tk2_opening: tankState.TK2.open, tk2_closing: tankState.TK2.close, tk2_diff: tankDiffs.TK2, tk2_margin: prevReport.tk2_margin || 0,
        tk3_opening: tankState.TK3.open, tk3_closing: tankState.TK3.close, tk3_diff: tankDiffs.TK3, tk3_margin: prevReport.tk3_margin || 0,
        tk4_opening: tankState.TK4.open, tk4_closing: tankState.TK4.close, tk4_diff: tankDiffs.TK4, tk4_margin: prevReport.tk4_margin || 0,
        ...preservedFields(rawReportRef.current),
      }

      return post({ action: "saveDailyReport", station: STATION_KEY, username, date, data }).then(d => {
        if (!d.ok) return d
        rawReportRef.current = { ...rawReportRef.current, ...data }
        return d
      })
    },
    [tankState, username]
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
    status,
    tankState,
    hasOpening,
    hasClosing,
    hasCash,
    updateTank,
    saveOpening,
    saveClosing,
    savePhoto,
    refresh: () => loadForDate(selectedDate || new Date().toISOString().split("T")[0]),
    configured: Boolean(SCRIPT_URL),
  }
}
