import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ToastProvider, useToast } from "../components/layout/ToastProvider"
import SafeAreaDebug from "../components/ui/SafeAreaDebug"
import DateRow from "../components/dip/DateRow"
import StatusStrip from "../components/dip/StatusStrip"
import ModeToggle from "../components/dip/ModeToggle"
import StepProgress from "../components/dip/StepProgress"
import WizardNav from "../components/dip/WizardNav"
import StepsDrawer from "../components/dip/StepsDrawer"
import PhotoCapture from "../components/dip/PhotoCapture"
import { TankStepPanel } from "../components/dip/StepPanels"
import { useAuth, dashboardPathFor } from "../hooks/useAuth"
import { useDipData, TANKS } from "../hooks/useDipData"
import { usePrices } from "../hooks/usePrices"
import { usePageTitle } from "../hooks/usePageTitle"

function todayISO() {
  return new Date().toISOString().split("T")[0]
}

const STEPS = TANKS.map(cfg => ({ type: "tank", cfg }))

function DipInner() {
  const auth = useAuth({ requireAuth: true })
  const [date, setDate] = useState(todayISO())

  const {
    status, tankState, hasOpening, hasClosing, hasCash,
    updateTank, saveOpening, saveClosing, savePhoto, refresh,
  } = useDipData(auth.username, date)
  const { prices } = usePrices()

  const navigate = useNavigate()
  const toast = useToast()
  usePageTitle("Dip Entry — MSO Limpid")

  const [mode, setMode] = useState("open")
  const [current, setCurrent] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [photos, setPhotos] = useState({})

  // When data finishes loading for a date, jump mode to whichever stage
  // already has data — matches original setMode('close', true) on load.
  useEffect(() => {
    if (status === "ready") {
      if (hasOpening || hasClosing) setMode("close")
      else setMode("open")
      if (hasOpening || hasClosing) {
        toast.showToast("Data loaded", `Existing readings found for ${date}`, "ok")
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
  const stepKey = step.cfg.id

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
    setSaving(true)
    const result = mode === "open" ? await saveOpening(date) : await saveClosing(date)
    setSaving(false)

    if (!result.ok) {
      toast.showToast("Could not save", result.error || "Please try again", "err")
      return
    }
    if (navigator.vibrate) navigator.vibrate([50, 30, 80])
    toast.showToast("Saved", mode === "open" ? "Opening saved — return tonight for closing" : "All readings saved", "ok")
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
                {step.cfg.id} — {mode === "open" ? "Opening Stock" : "Closing Stock"}
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
          <StatusStrip hasOpening={hasOpening} hasClosing={hasClosing} hasCash={hasCash} />

          <div className="overflow-hidden rounded-card border border-cyan/15 bg-white shadow-card">
            <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, #130656, #179DD0)" }} />
            <div className="p-5">
              {status === "loading" ? (
                <div className="flex items-center justify-center py-10 text-[13px] text-ink-4">
                  <span className="mr-2 h-4 w-4 animate-spin-fast rounded-full border-2 border-cyan/20 border-t-cyan" />
                  Loading readings for {date}…
                </div>
              ) : (
                <TankStepPanel
                  cfg={step.cfg}
                  tankState={tankState}
                  mode={mode}
                  onTankChange={updateTank}
                  price={step.cfg.product === "AGO" ? prices.ago : prices.pms}
                />
              )}

              {status !== "loading" && (
                <PhotoCapture
                  photo={photos[stepKey]}
                  onCapture={handlePhoto}
                  label={`Add ${step.cfg.id} photo`}
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

      <WizardNav onBack={goPrev} onNext={goNext} isLast={isLast} saving={saving} />

      <StepsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        steps={STEPS}
        current={current}
        mode={mode}
        tankState={tankState}
        onJump={setCurrent}
      />
    </div>
  )
}

export default function DipPage() {
  return (
    <ToastProvider>
      <DipInner />
    </ToastProvider>
  )
}
