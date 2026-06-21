import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ToastProvider, useToast } from "../components/layout/ToastProvider"
import SafeAreaDebug from "../components/ui/SafeAreaDebug"
import DateRow from "../components/dip/DateRow"
import StatusStrip from "../components/dip/StatusStrip"
import ModeToggle from "../components/dip/ModeToggle"
import StepProgress from "../components/dip/StepProgress"
import WizardNav from "../components/dip/WizardNav"
import { PumpStepPanel } from "../components/sales/PumpStepPanel"
import PumpStepsDrawer from "../components/sales/PumpStepsDrawer"
import PhotoCapture from "../components/dip/PhotoCapture"
import { useAuth, dashboardPathFor } from "../hooks/useAuth"
import { usePrices } from "../hooks/usePrices"
import { useSalesEntry } from "../hooks/useSalesEntry"
import { usePageTitle } from "../hooks/usePageTitle"
import { PUMPS } from "../config/pumps"

function todayISO() {
  return new Date().toISOString().split("T")[0]
}

const STEPS = PUMPS.map(p => ({ pump: { ...p, id: p.pumpId || p.id } }))

function SalesInner() {
  const auth = useAuth({ requireAuth: true })
  const [date, setDate] = useState(todayISO())

  const {
    status, readings, hasOpening, hasClosing,
    updateReading, submit, savePhoto, saving: submitting, refresh,
  } = useSalesEntry(auth.username, auth.name, date)
  const { prices } = usePrices()

  const navigate = useNavigate()
  const toast = useToast()
  usePageTitle("Pump Metres — MSO Limpid")

  const [mode, setMode] = useState("open")
  const [current, setCurrent] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notes] = useState("")
  const [photos, setPhotos] = useState({})

  useEffect(() => {
    if (status === "ready") {
      if (hasOpening || hasClosing) setMode("close")
      else setMode("open")
      if (hasOpening || hasClosing) {
        toast.showToast("Data loaded", `Existing pump readings found for ${date}`, "ok")
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  useEffect(() => {
    setTimeout(() => {
      const el = document.getElementById("mainInp")
      if (el) el.focus()
    }, 100)
  }, [current])

  if (auth.loading || !auth.user) {
    return <div className="min-h-screen bg-pagebg" />
  }

  const step = STEPS[current]
  const isLast = current === STEPS.length - 1
  const stepKey = step.pump.id

  const handleDateChange = newDate => {
    setDate(newDate)
    setCurrent(0)
    setPhotos({})
  }

  const handlePhoto = (dataUrl, mimeType) => {
    setPhotos(prev => ({ ...prev, [stepKey]: { saved: false } }))
    savePhoto(date, mode === "open" ? "Morning" : "Evening", stepKey, dataUrl, mimeType).then(d => {
      setPhotos(prev => ({ ...prev, [stepKey]: { saved: true } }))
      toast.showToast(d.ok ? "Photo saved" : "Photo captured", d.ok ? "Uploaded to Drive" : "Will retry on next sync", d.ok ? "ok" : "warn")
    })
  }

  const handleSubmit = async () => {
    const result = await submit(date, prices, notes)
    if (!result.ok) {
      toast.showToast("Could not save", result.error || "Please try again", "err")
      return
    }
    if (navigator.vibrate) navigator.vibrate([50, 30, 80])
    toast.showToast("Saved", mode === "open" ? "Opening metres saved — return at shift end for closing" : "All pump readings saved", "ok")
    refresh()
    setTimeout(() => navigate(dashboardPathFor({ role: auth.role, station: auth.station })), 1200)
  }

  const goNext = () => {
    if (navigator.vibrate) navigator.vibrate(30)
    if (current < STEPS.length - 1) {
      setCurrent(c => c + 1)
      window.scrollTo(0, 0)
    } else {
      handleSubmit()
    }
  }

  const goPrev = () => {
    if (current > 0) {
      setCurrent(c => c - 1)
      window.scrollTo(0, 0)
    } else if (window.confirm("Leave without saving?")) {
      navigate(dashboardPathFor({ role: auth.role, station: auth.station }))
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #F5F3FF 0%, #F1F5FB 220px)" }}>
      <SafeAreaDebug />
      <div
        className="sticky top-0 z-[200] px-4 pb-4 text-white shadow-lg"
        style={{ paddingTop: "max(var(--sat), 52px)", background: "linear-gradient(135deg, #130656 0%, #1a0875 100%)" }}
      >
        <div className="mx-auto max-w-[640px]">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[1.4px] text-cyan">
                Step {current + 1} of {STEPS.length}
              </div>
              <div className="text-[16px] font-extrabold text-white">
                Pump {step.pump.id} — {mode === "open" ? "Opening Metre" : "Closing Metre"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] border border-white/15 bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              <i className="bi bi-list-ul" />
            </button>
          </div>
          <StepProgress total={STEPS.length} current={current} />
        </div>
      </div>

      <div className="px-4 py-4 pb-[100px]">
        <div className="mx-auto max-w-[640px]">
          <DateRow date={date} onChange={handleDateChange} supName={auth.name || auth.username} />
          <ModeToggle mode={mode} onChange={setMode} hasOpening={hasOpening} hasClosing={hasClosing} />
          <StatusStrip hasOpening={hasOpening} hasClosing={hasClosing} hasCash={false} />

          <div className="overflow-hidden rounded-card border border-cyan/15 bg-white shadow-card">
            <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, #130656, #179DD0)" }} />
            <div className="p-5">
              {status === "loading" ? (
                <div className="flex items-center justify-center py-10 text-[13px] text-ink-4">
                  <span className="mr-2 h-4 w-4 animate-spin-fast rounded-full border-2 border-cyan/20 border-t-cyan" />
                  Loading readings for {date}…
                </div>
              ) : (
                <PumpStepPanel
                  pump={step.pump}
                  readings={readings}
                  mode={mode}
                  onChange={updateReading}
                  price={step.pump.product === "AGO" ? prices.ago : prices.pms}
                />
              )}

              {status !== "loading" && (
                <PhotoCapture
                  photo={photos[stepKey]}
                  onCapture={handlePhoto}
                  label={`Add Pump ${step.pump.id} photo`}
                  sub="Optional evidence photo"
                />
              )}
            </div>
          </div>

          <div
            className="mt-3 flex items-center justify-between rounded-[14px] px-4 py-3 text-white shadow-card"
            style={{ background: "linear-gradient(135deg, #130656 0%, #179DD0 140%)" }}
          >
            <div className="flex items-center gap-2 text-[12.5px] font-medium text-white/85">
              <span className="h-2 w-2 rounded-full bg-green" style={{ boxShadow: "0 0 6px rgba(34,197,94,.7)" }} />
              Live price
            </div>
            <div className="font-mono text-[13px] font-bold text-white">
              PMS ₦{prices.pms.toLocaleString("en-NG")} · AGO ₦{prices.ago.toLocaleString("en-NG")}
            </div>
          </div>
        </div>
      </div>

      <WizardNav onBack={goPrev} onNext={goNext} isLast={isLast} saving={submitting} />

      <PumpStepsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        steps={STEPS}
        current={current}
        mode={mode}
        readings={readings}
        onJump={setCurrent}
      />
    </div>
  )
}

export default function SalesPage() {
  return (
    <ToastProvider>
      <SalesInner />
    </ToastProvider>
  )
}
