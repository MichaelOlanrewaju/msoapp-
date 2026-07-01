import { useCallback, useEffect, useState } from "react"

const SCRIPT_URL = import.meta.env.VITE_SCRIPT_URL
const STATION_KEY = import.meta.env.VITE_STATION_KEY || "mso"
const MP_RATE = 0.0025
const ZM_RATE = 0.003

function todayISO() {
  return new Date().toISOString().split("T")[0]
}

export function useCashupData(username) {
  const [expected, setExpected] = useState({
    grandTotal: 0, pmsLitres: 0, agoLitres: 0,
    pmsPrice: 1269, agoPrice: 1799, pmsRevenue: 0, agoRevenue: 0, hasData: false,
  })
  const [loadingExpected, setLoadingExpected] = useState(true)
  const [posMP, setPosMP] = useState("")
  const [posZM, setPosZM] = useState("")
  const [cashAmt, setCashAmt] = useState("")
  const [expenses, setExpenses] = useState([{ desc: "", amt: "" }])
  const [lpgKg, setLpgKg] = useState("")
  const [lpgPrice, setLpgPrice] = useState("")
  const [lpgRemitted, setLpgRemitted] = useState("")
  const [saving, setSaving] = useState(false)

  const loadExpected = useCallback(() => {
    if (!SCRIPT_URL) {
      setLoadingExpected(false)
      return
    }
    setLoadingExpected(true)
    const url = new URL(SCRIPT_URL)
    url.searchParams.set("action", "getDashboard")
    url.searchParams.set("station", STATION_KEY)
    url.searchParams.set("username", username || "")

    fetch(url.toString(), { method: "GET", redirect: "follow" })
      .then(res => res.json())
      .then(d => {
        if (!d.ok || d.noData || !d.grandTotal) {
          setExpected(prev => ({ ...prev, hasData: false }))
          setLoadingExpected(false)
          return
        }
        setExpected({
          grandTotal: Number(d.grandTotal) || 0,
          pmsLitres: Number(d.pmsLitres) || 0,
          agoLitres: Number(d.agoLitres) || 0,
          pmsPrice: Number(d.pmsPrice) || 1269,
          agoPrice: Number(d.agoPrice) || 1799,
          pmsRevenue: Number(d.pmsRevenue) || 0,
          agoRevenue: Number(d.agoRevenue) || 0,
          hasData: true,
        })
        setLoadingExpected(false)
      })
      .catch(() => setLoadingExpected(false))
  }, [username])

  useEffect(() => {
    loadExpected()
  }, [loadExpected])

  const addExpense = useCallback(() => {
    setExpenses(prev => [...prev, { desc: "", amt: "" }])
  }, [])

  const updateExpense = useCallback((i, field, value) => {
    setExpenses(prev => prev.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)))
  }, [])

  const removeExpense = useCallback(i => {
    setExpenses(prev => {
      const next = prev.filter((_, idx) => idx !== i)
      return next.length ? next : [{ desc: "", amt: "" }]
    })
  }, [])

  const mp = Number(posMP) || 0
  const zm = Number(posZM) || 0
  const cash = Number(cashAmt) || 0
  const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amt) || 0), 0)
  const mpCharge = Math.round(mp * MP_RATE)
  const zmCharge = Math.round(zm * ZM_RATE)
  const mpNet = mp - mpCharge
  const zmNet = zm - zmCharge
  const totalCharges = mpCharge + zmCharge
  const grossTotal = mp + zm + cash
  const collected = mpNet + zmNet + cash - totalExpenses
  const cashToBank = Math.max(0, cash - totalExpenses - totalCharges)
  const variance = expected.hasData ? collected - expected.grandTotal : null

  const lpgKgNum = Number(lpgKg) || 0
  const lpgPriceNum = Number(lpgPrice) || 0
  const lpgSales = lpgKgNum * lpgPriceNum
  const lpgRemittedNum = Number(lpgRemitted) || 0
  const lpgVariance = lpgSales > 0 ? lpgRemittedNum - lpgSales : null

  let reconStatus = "pending"
  if (variance !== null && expected.grandTotal > 0) {
    if (Math.abs(variance) <= 500) reconStatus = "balanced"
    else if (variance < 0) reconStatus = "short"
    else reconStatus = "over"
  }

  const submit = useCallback(() => {
    if (mp === 0 && zm === 0 && cash === 0) {
      return Promise.resolve({ ok: false, error: "Enter at least one payment amount" })
    }
    const date = todayISO()
    const data = {
      pos_mp: mp, pos_zm: zm, cash: cash,
      total_expenses: totalExpenses, to_bank: Math.round(cashToBank),
      pos_mp_charge: mpCharge, pos_zm_charge: zmCharge,
      grand_total: expected.grandTotal || 0,
      pms_litres: expected.pmsLitres || 0, pms_price: expected.pmsPrice || 1269, pms_revenue: expected.pmsRevenue || 0,
      ago_litres: expected.agoLitres || 0, ago_price: expected.agoPrice || 1799, ago_revenue: expected.agoRevenue || 0,
      lpg_kg: lpgKgNum, lpg_price: lpgPriceNum, lpg_revenue: Math.round(lpgSales), lpg_remitted: lpgRemittedNum,
    }

    setSaving(true)
    return fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "saveDailyReport", station: STATION_KEY, username, date, data }),
      redirect: "follow",
    })
      .then(res => res.json())
      .then(d => {
        if (!d.ok) {
          setSaving(false)
          return d
        }
        const expSaves = expenses
          .filter(e => Number(e.amt) > 0 && e.desc)
          .map(e =>
            fetch(SCRIPT_URL, {
              method: "POST",
              headers: { "Content-Type": "text/plain" },
              body: JSON.stringify({ action: "saveExpense", station: STATION_KEY, username, date, description: e.desc, amount: Number(e.amt) }),
              redirect: "follow",
            })
          )
        return Promise.all(expSaves).then(() => {
          setSaving(false)
          return d
        })
      })
      .catch(() => {
        setSaving(false)
        return { ok: false, error: "Network error — check connection" }
      })
  }, [mp, zm, cash, totalExpenses, cashToBank, mpCharge, zmCharge, expected, expenses, username, lpgKgNum, lpgPriceNum, lpgSales, lpgRemittedNum])

  return {
    expected, loadingExpected, refreshExpected: loadExpected,
    posMP, setPosMP, posZM, setPosZM, cashAmt, setCashAmt,
    expenses, addExpense, updateExpense, removeExpense,
    mpCharge, zmCharge, mpNet, zmNet, totalCharges, totalExpenses,
    grossTotal, collected, cashToBank, variance, reconStatus,
    lpgKg, setLpgKg, lpgPrice, setLpgPrice, lpgRemitted, setLpgRemitted, lpgSales, lpgVariance,
    submit, saving,
  }
}
