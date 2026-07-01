import React from "react"

function StatusPill({ state }) {
  if (state === "done") return <span className="rounded-full bg-green-light px-2.5 py-1 text-[10.5px] font-bold text-green">Done</span>
  if (state === "pending") return <span className="rounded-full bg-amber-light px-2.5 py-1 text-[10.5px] font-bold text-amber">Pending</span>
  return <span className="rounded-full bg-surface px-2.5 py-1 text-[10.5px] font-bold text-ink-4">—</span>
}

function Row({ emoji, label, state, isLast }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 ${isLast ? "" : "border-b border-surface"}`}>
      <div className="flex items-center gap-2.5">
        <span className="text-[16px]">{emoji}</span>
        <span className="text-[12.5px] font-semibold text-ink-2">{label}</span>
      </div>
      <StatusPill state={state} />
    </div>
  )
}

// Sequential daily flow: can't close before opening, can't reconcile cash
// before closing. Each step shows "—" until the previous one is done,
// rather than guessing at numbers that aren't final yet.
export default function TodayStatusCard({ todayStatus, loading }) {
  const opening = todayStatus?.openingDip
  const closing = todayStatus?.closingDip
  const cash    = todayStatus?.cashierRecon

  const openingState = loading ? "pending" : opening ? "done" : "pending"
  const closingState = loading ? "waiting" : !opening ? "waiting" : closing ? "done" : "pending"
  const cashState    = loading ? "waiting" : !closing ? "waiting" : cash ? "done" : "pending"

  return (
    <div className="overflow-hidden rounded-card border border-border bg-white shadow-card">
      <div className="border-b border-surface px-4 py-3.5">
        <div className="text-[13.5px] font-extrabold tracking-[-0.02em] text-ink">Today's Status</div>
        <div className="mt-0.5 text-[10.5px] text-ink-4">Daily flow — opening, closing, cash-up</div>
      </div>
      <div>
        <Row emoji="🌅" label="Opening Dip" state={openingState} />
        <Row emoji="🌙" label="Closing Dip" state={closingState} />
        <Row emoji="💳" label="Cashier Recon" state={cashState} isLast />
      </div>
    </div>
  )
}
