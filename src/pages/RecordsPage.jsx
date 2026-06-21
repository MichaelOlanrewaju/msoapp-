import React, { useState } from "react"
import Sidebar from "../components/layout/Sidebar"
import Topbar from "../components/layout/Topbar"
import BottomNav from "../components/layout/BottomNav"
import MobileDrawer from "../components/layout/MobileDrawer"
import SafeAreaDebug from "../components/ui/SafeAreaDebug"
import { useAuth, dashboardPathFor } from "../hooks/useAuth"
import { useRecordsData } from "../hooks/useRecordsData"
import { usePageTitle } from "../hooks/usePageTitle"
import { naira, numberNG, initials, roleLabel } from "../utils/format"
import { TANKS, PUMPS } from "../config/pumps"

function todayISO() {
  return new Date().toISOString().split("T")[0]
}

function pumpId(p) {
  return p.pumpId || p.id
}

function TankMarginRow({ tank, report }) {
  const open = report[`${tank.id.toLowerCase()}_opening`] || 0
  const close = report[`${tank.id.toLowerCase()}_closing`] || 0
  const dipDiff = report[`${tank.id.toLowerCase()}_diff`] || 0
  const margin = report[`${tank.id.toLowerCase()}_margin`] || 0
  const empty = open === 0 && close === 0

  return (
    <tr className={`border-b border-surface last:border-none ${empty ? "" : "hover:bg-[#FAFBFE]"}`}>
      <td className="px-3.5 py-2.5">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-[3px] text-[10.5px] font-bold ${
            tank.product === "AGO" ? "border-amber/25 bg-amber-light text-amber" : "border-cyan/20 bg-cyan-light text-cyan-dark"
          }`}
        >
          {tank.id}
        </span>
      </td>
      <td className={`mono px-3.5 py-2.5 font-semibold ${empty ? "text-ink-4" : ""}`}>{numberNG(open)}L</td>
      <td className={`mono px-3.5 py-2.5 ${empty ? "text-ink-4" : ""}`}>{numberNG(close)}L</td>
      <td className={`mono px-3.5 py-2.5 font-bold ${empty ? "text-ink-4" : "text-cyan-dark"}`}>{numberNG(dipDiff, { maximumFractionDigits: 2 })}L</td>
      <td className={`mono px-3.5 py-2.5 font-bold ${empty ? "text-ink-4" : margin < 0 ? "text-red" : "text-amber"}`}>
        {Number(margin).toFixed(2)}L
      </td>
    </tr>
  )
}

function PumpMetreRow({ pump, pumpMetres }) {
  const pid = pumpId(pump)
  const session = pumpMetres && pumpMetres[pid] && pumpMetres[pid].sessions && pumpMetres[pid].sessions[0]
  const open = session ? session.open : 0
  const close = session ? session.close : 0
  const diff = session ? session.diff : 0
  const amount = session ? session.amount : 0
  const empty = !session || (open === 0 && close === 0)

  return (
    <tr className={`border-b border-surface last:border-none ${empty ? "" : "hover:bg-[#FAFBFE]"}`}>
      <td className="px-3.5 py-2.5">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-[3px] text-[10.5px] font-bold ${
            pump.product === "AGO" ? "border-amber/25 bg-amber-light text-amber" : "border-cyan/20 bg-cyan-light text-cyan-dark"
          }`}
        >
          {pid}
        </span>
      </td>
      <td className="px-3.5 py-2.5 text-[11.5px] text-ink-3">{pump.tank}</td>
      <td className={`mono px-3.5 py-2.5 ${empty ? "text-ink-4" : ""}`}>{numberNG(open)}L</td>
      <td className={`mono px-3.5 py-2.5 ${empty ? "text-ink-4" : ""}`}>{numberNG(close)}L</td>
      <td className={`mono px-3.5 py-2.5 font-bold ${empty ? "text-ink-4" : "text-cyan-dark"}`}>{numberNG(diff, { maximumFractionDigits: 2 })}L</td>
      <td className={`mono px-3.5 py-2.5 font-bold ${empty ? "text-ink-4" : "text-green"}`}>{empty ? "—" : naira(amount)}</td>
    </tr>
  )
}

function RecordsInner() {
  const auth = useAuth({ requireAuth: true })
  const [date, setDate] = useState(todayISO())
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { status, report, refresh, error } = useRecordsData(auth.username, date)

  usePageTitle("Records — MSO Limpid")

  if (auth.loading || !auth.user) {
    return <div className="min-h-screen bg-pagebg" />
  }

  let dipDiffTotal = 0
  let pumpDiffTotal = 0
  let hasAnyPumpData = false
  let pmsPumpLitres = 0
  let agoPumpLitres = 0
  if (report) {
    TANKS.forEach(t => {
      dipDiffTotal += report[`${t.id.toLowerCase()}_diff`] || 0
    })
    PUMPS.forEach(p => {
      const pid = pumpId(p)
      const session = report.pumpMetres && report.pumpMetres[pid] && report.pumpMetres[pid].sessions && report.pumpMetres[pid].sessions[0]
      if (session) {
        pumpDiffTotal += session.diff || 0
        if (session.open > 0 || session.close > 0) hasAnyPumpData = true
        if (p.product === "AGO") agoPumpLitres += session.diff || 0
        else pmsPumpLitres += session.diff || 0
      }
    })
  }
  const computedMargin = dipDiffTotal - pumpDiffTotal

  // Expected revenue: litres actually dispensed (from pump metres) ×
  // the day's price — this is the figure cashier reconciliation should
  // match against, separate from the dip-vs-pump margin (which is a
  // stock/theft check, not a money check). Falls back to the report's
  // own pms_litres/ago_litres (averaged tank figures from saveDailyReport)
  // if pump-specific data isn't available yet for this date.
  const pmsLitresForRevenue = hasAnyPumpData ? pmsPumpLitres : (report && report.pms_litres) || 0
  const agoLitresForRevenue = hasAnyPumpData ? agoPumpLitres : (report && report.ago_litres) || 0
  const pmsExpected = report ? pmsLitresForRevenue * (report.pms_price || 0) : 0
  const agoExpected = report ? agoLitresForRevenue * (report.ago_price || 0) : 0
  const expectedRevenue = pmsExpected + agoExpected

  const actualCollected = report ? (report.pos_mp || 0) + (report.pos_zm || 0) + (report.cash || 0) : 0
  const reconciliationVariance = actualCollected - expectedRevenue

  const expenseItems = (report && report.expense_items) || []
  const expenseTotal = expenseItems.reduce((s, e) => s + (Number(e.amount) || 0), 0)

  return (
    <div className="flex min-h-screen">
      <SafeAreaDebug />
      {sidebarOpen && (
        <div className="fixed inset-0 z-[1049] bg-black/55 backdrop-blur-[2px]" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar
        isOwner={auth.isOwner}
        isGM={auth.isGM}
        name={auth.name || auth.username}
        role={roleLabel(auth.role)}
        avatarInitials={initials(auth.name || auth.username)}
        mobileOpen={sidebarOpen}
        onLogout={auth.logout}
        homePath={dashboardPathFor({ role: auth.role, station: auth.station })}
      />

      <div className="flex min-w-0 flex-1 flex-col lg:ml-sidebar">
        <Topbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(o => !o)}
          loading={status === "loading"}
          onRefresh={refresh}
          title="Records"
        />

        <div className="flex-1 p-3.5 pb-[100px] md:p-[22px] md:pb-[22px]">
          <div className="mx-auto max-w-[900px]">
            <div className="mb-5 flex items-center gap-3 rounded-card border border-cyan/15 bg-white px-3.5 py-3 shadow-card">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px]" style={{ background: "linear-gradient(135deg, #130656, #179DD0)" }}>
                <i className="bi bi-calendar3 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-[9px] font-bold uppercase tracking-[1px] text-cyan-dark">Viewing Records For</div>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  max={todayISO()}
                  className="w-full border-none bg-transparent p-0 text-[14.5px] font-bold text-ink outline-none"
                />
              </div>
            </div>

            {status === "loading" && (
              <div className="flex items-center justify-center py-16 text-[13px] text-ink-4">
                <span className="mr-2 h-4 w-4 animate-spin-fast rounded-full border-2 border-cyan/20 border-t-cyan" />
                Loading records for {date}…
              </div>
            )}

            {status === "no-data" && (
              <div className="flex flex-col items-center gap-2 rounded-card border border-border bg-white py-16 text-center shadow-card">
                <i className="bi bi-inbox text-3xl text-ink-4" />
                <div className="text-[14px] font-bold text-ink">No record found for {date}</div>
                <div className="max-w-[320px] text-[12.5px] text-ink-4">
                  No Dip or Pump submission exists for this date yet.{error ? ` (${error})` : ""}
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="flex flex-col items-center gap-2 rounded-card border border-red/20 bg-red-light py-16 text-center">
                <i className="bi bi-exclamation-triangle text-3xl text-red" />
                <div className="text-[14px] font-bold text-red">Could not load records</div>
                <div className="text-[12.5px] text-red/80">Check your connection and try again.</div>
              </div>
            )}

            {status === "ready" && report && (
              <>
                <div
                  className="mb-3 overflow-hidden rounded-card shadow-card"
                  style={{ background: "linear-gradient(135deg, #130656 0%, #1a0875 100%)" }}
                >
                  <div className="border-b border-white/10 px-[18px] py-3">
                    <div className="text-[10px] font-bold uppercase tracking-[1.2px] text-white/60">Cash Reconciliation</div>
                    <div className="text-[11px] text-white/40">Expected revenue (pump litres × price) vs actual collected</div>
                  </div>
                  <div className="grid grid-cols-1 gap-px bg-white/10 sm:grid-cols-3">
                    <div className="bg-[#130656] p-[18px]">
                      <div className="text-[9px] font-bold uppercase tracking-[0.8px] text-white/50">Expected Revenue</div>
                      <div className="mono mt-1 text-[19px] font-extrabold text-white">{naira(expectedRevenue)}</div>
                      <div className="mt-1 text-[10px] text-white/40">
                        PMS {naira(pmsExpected)} + AGO {naira(agoExpected)}
                      </div>
                    </div>
                    <div className="bg-[#130656] p-[18px]">
                      <div className="text-[9px] font-bold uppercase tracking-[0.8px] text-white/50">Actual Collected</div>
                      <div className="mono mt-1 text-[19px] font-extrabold text-white">{naira(actualCollected)}</div>
                      <div className="mt-1 text-[10px] text-white/40">POS + Cash, before charges</div>
                    </div>
                    <div className="bg-[#130656] p-[18px]">
                      <div className="text-[9px] font-bold uppercase tracking-[0.8px] text-white/50">Variance</div>
                      <div
                        className="mono mt-1 text-[19px] font-extrabold"
                        style={{ color: !hasAnyPumpData ? "rgba(255,255,255,.4)" : Math.abs(reconciliationVariance) < 1 ? "#4ADE80" : reconciliationVariance < 0 ? "#F87171" : "#FBBF24" }}
                      >
                        {hasAnyPumpData ? naira(reconciliationVariance) : "—"}
                      </div>
                      <div className="mt-1 text-[10px] text-white/40">
                        {reconciliationVariance < 0 ? "Shortage" : reconciliationVariance > 0 ? "Surplus" : "Balanced"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <div className="rounded-card border border-border bg-white p-3.5 shadow-card">
                    <div className="text-[9px] font-bold uppercase tracking-[0.8px] text-ink-4">Grand Total</div>
                    <div className="mono mt-1 text-[16px] font-extrabold text-ink">{naira(report.grand_total)}</div>
                  </div>
                  <div className="rounded-card border border-border bg-white p-3.5 shadow-card">
                    <div className="text-[9px] font-bold uppercase tracking-[0.8px] text-ink-4">Dip vs Pump Margin</div>
                    <div className={`mono mt-1 text-[16px] font-extrabold ${!hasAnyPumpData ? "text-ink-4" : computedMargin < 0 ? "text-red" : "text-amber"}`}>
                      {hasAnyPumpData ? `${computedMargin.toFixed(2)}L` : "Awaiting Pump"}
                    </div>
                  </div>
                  <div className="rounded-card border border-border bg-white p-3.5 shadow-card">
                    <div className="text-[9px] font-bold uppercase tracking-[0.8px] text-ink-4">Cash to Bank</div>
                    <div className="mono mt-1 text-[16px] font-extrabold text-ink">{naira(report.to_bank)}</div>
                  </div>
                  <div className="rounded-card border border-border bg-white p-3.5 shadow-card">
                    <div className="text-[9px] font-bold uppercase tracking-[0.8px] text-ink-4">Expenses</div>
                    <div className="mono mt-1 text-[16px] font-extrabold text-red">{naira(report.total_expenses)}</div>
                  </div>
                </div>

                {!hasAnyPumpData && report.hasClosing && (
                  <div className="mb-5 flex items-center gap-2.5 rounded-card border border-amber/25 bg-amber-light px-4 py-3">
                    <i className="bi bi-info-circle text-amber" />
                    <div className="text-[12px] text-amber">
                      Dip readings are in but no Pump metre submission exists for this date yet — margin will show once Pump is submitted.
                    </div>
                  </div>
                )}

                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[1.1px] text-ink-4">Tank Dip Readings</div>
                <div className="mb-5 overflow-hidden rounded-card border border-border bg-white shadow-card">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          {["Tank", "Opening", "Closing", "Dip Diff", "Margin"].map(h => (
                            <th key={h} className="whitespace-nowrap border-b border-border bg-surface px-3.5 py-[9px] text-left text-[9.5px] font-bold uppercase tracking-[1px] text-ink-4">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {TANKS.map(t => (
                          <TankMarginRow key={t.id} tank={t} report={report} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[1.1px] text-ink-4">Pump Metre Readings</div>
                <div className="mb-5 overflow-hidden rounded-card border border-border bg-white shadow-card">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          {["Pump", "Tank", "Opening", "Closing", "Diff", "Revenue"].map(h => (
                            <th key={h} className="whitespace-nowrap border-b border-border bg-surface px-3.5 py-[9px] text-left text-[9.5px] font-bold uppercase tracking-[1px] text-ink-4">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {PUMPS.map(p => (
                          <PumpMetreRow key={pumpId(p)} pump={p} pumpMetres={report.pumpMetres} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[1.1px] text-ink-4">Revenue &amp; Margin by Product</div>
                <div className="mb-5 overflow-hidden rounded-card border border-border bg-white shadow-card">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          {["Product", "Litres", "Price/L", "Revenue", "Margin"].map(h => (
                            <th key={h} className="whitespace-nowrap border-b border-border bg-surface px-3.5 py-[9px] text-left text-[9.5px] font-bold uppercase tracking-[1px] text-ink-4">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-surface">
                          <td className="px-3.5 py-2.5">
                            <span className="inline-flex items-center rounded-full border border-cyan/20 bg-cyan-light px-2.5 py-[3px] text-[10.5px] font-bold text-cyan-dark">PMS</span>
                          </td>
                          <td className="mono px-3.5 py-2.5">{numberNG(report.pms_litres, { maximumFractionDigits: 2 })}L</td>
                          <td className="mono px-3.5 py-2.5">{naira(report.pms_price)}</td>
                          <td className="mono px-3.5 py-2.5 font-bold text-green">{naira(report.pms_revenue)}</td>
                          <td className={`mono px-3.5 py-2.5 font-bold ${report.pms_margin < 0 ? "text-red" : "text-amber"}`}>{Number(report.pms_margin).toFixed(2)}L</td>
                        </tr>
                        <tr>
                          <td className="px-3.5 py-2.5">
                            <span className="inline-flex items-center rounded-full border border-amber/25 bg-amber-light px-2.5 py-[3px] text-[10.5px] font-bold text-amber">AGO</span>
                          </td>
                          <td className="mono px-3.5 py-2.5">{numberNG(report.ago_litres, { maximumFractionDigits: 2 })}L</td>
                          <td className="mono px-3.5 py-2.5">{naira(report.ago_price)}</td>
                          <td className="mono px-3.5 py-2.5 font-bold text-green">{naira(report.ago_revenue)}</td>
                          <td className={`mono px-3.5 py-2.5 font-bold ${report.ago_margin < 0 ? "text-red" : "text-amber"}`}>{Number(report.ago_margin).toFixed(2)}L</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div className="overflow-hidden rounded-card border border-border bg-white shadow-card">
                    <div className="border-b border-surface px-[18px] py-3.5 text-[13.5px] font-extrabold text-ink">Payment Summary</div>
                    <div className="flex flex-col gap-2.5 p-[18px]">
                      {[
                        { label: "POS (MP Terminal)", value: report.pos_mp },
                        { label: "POS (ZM Terminal)", value: report.pos_zm },
                        { label: "Cash", value: report.cash },
                      ]
                        .filter(p => p.value > 0)
                        .map(p => (
                          <div key={p.label} className="flex items-center justify-between text-[12.5px]">
                            <span className="text-ink-2">{p.label}</span>
                            <span className="mono font-bold text-ink">{naira(p.value)}</span>
                          </div>
                        ))}
                      {report.pos_mp <= 0 && report.pos_zm <= 0 && report.cash <= 0 && (
                        <div className="py-2 text-center text-[12px] text-ink-4">No payment data for this date</div>
                      )}
                      {(report.pos_mp_charge > 0 || report.pos_zm_charge > 0) && (
                        <div className="mt-1 flex flex-col gap-1.5 rounded-[10px] bg-red-light px-3 py-2.5">
                          <div className="text-[9.5px] font-bold uppercase tracking-[0.6px] text-red">POS Charges Deducted</div>
                          {report.pos_mp_charge > 0 && (
                            <div className="flex items-center justify-between text-[11.5px]">
                              <span className="text-red/80">MP Terminal Charge</span>
                              <span className="mono font-semibold text-red">−{naira(report.pos_mp_charge)}</span>
                            </div>
                          )}
                          {report.pos_zm_charge > 0 && (
                            <div className="flex items-center justify-between text-[11.5px]">
                              <span className="text-red/80">ZM Terminal Charge</span>
                              <span className="mono font-semibold text-red">−{naira(report.pos_zm_charge)}</span>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="mt-1 flex items-center justify-between border-t border-border pt-2.5">
                        <span className="text-[11px] font-semibold text-ink-3">Cash to Bank (after charges)</span>
                        <span className="mono text-[14px] font-extrabold text-green">{naira(report.to_bank)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-card border border-border bg-white shadow-card">
                    <div className="flex items-center justify-between border-b border-surface px-[18px] py-3.5">
                      <span className="text-[13.5px] font-extrabold text-ink">Expenses</span>
                      <span className="mono text-[12px] font-bold text-red">{expenseItems.length ? naira(expenseTotal) : "—"}</span>
                    </div>
                    <div className="flex flex-col gap-2 p-[18px]">
                      {expenseItems.length === 0 ? (
                        <div className="py-2 text-center text-[12px] text-ink-4">No expenses logged for this date</div>
                      ) : (
                        expenseItems.map((e, i) => (
                          <div key={i} className="flex items-center justify-between text-[12.5px]">
                            <span className="text-ink-2">{e.description || "—"}</span>
                            <span className="mono font-bold text-ink">{naira(e.amount)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {report.submitted_by && (
                  <div className="mt-4 text-center text-[11px] text-ink-4">Submitted by {report.submitted_by}</div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <BottomNav onOpenMore={() => setDrawerOpen(true)} homePath={dashboardPathFor({ role: auth.role, station: auth.station })} />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onLogout={auth.logout} />
    </div>
  )
}

export default function RecordsPage() {
  return <RecordsInner />
}
