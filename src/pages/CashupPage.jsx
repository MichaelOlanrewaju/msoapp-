import React from "react"
import { useNavigate } from "react-router-dom"
import { ToastProvider, useToast } from "../components/layout/ToastProvider"
import SafeAreaDebug from "../components/ui/SafeAreaDebug"
import { useAuth, dashboardPathFor } from "../hooks/useAuth"
import { useCashupData } from "../hooks/useCashupData"
import { usePageTitle } from "../hooks/usePageTitle"
import { naira, numberNG } from "../utils/format"

const RECON_STYLES = {
  pending: { bg: "#F8FAFC", border: "#E8EDF5", text: "#94A3B8", icon: "bi-hourglass-split", label: "Enter amounts to reconcile" },
  balanced: { bg: "#F0FDF4", border: "#BBF7D0", text: "#16A34A", icon: "bi-check-circle-fill", label: "BALANCED" },
  short: { bg: "#FEF2F2", border: "#FECACA", text: "#DC2626", icon: "bi-exclamation-triangle-fill", label: "SHORT" },
  over: { bg: "#FFFBEB", border: "#FDE68A", text: "#D97706", icon: "bi-arrow-up-circle-fill", label: "OVER" },
}

function MoneyField({ label, sub, value, onChange, icon, iconBg, iconColor }) {
  return (
    <div className="mb-2.5 overflow-hidden rounded-card border border-border bg-white shadow-card">
      <div className="flex items-center gap-2.5 border-b border-surface bg-surface px-4 py-3">
        <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[9px]" style={{ background: iconBg }}>
          <i className={`bi ${icon}`} style={{ color: iconColor }} />
        </div>
        <div>
          <div className="text-[13px] font-extrabold text-ink">{label}</div>
          <div className="text-[10px] text-ink-4">{sub}</div>
        </div>
      </div>
      <div className="p-4">
        <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.8px] text-ink-4">{label} (₦)</div>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="0"
          min="0"
          step="1"
          className={`w-full rounded-[11px] border-2 px-3.5 py-3 text-right font-mono text-[18px] font-extrabold outline-none transition-all ${
            Number(value) > 0 ? "border-cyan/35 bg-white text-ink" : "border-border bg-surface text-ink"
          } focus:border-cyan focus:bg-white focus:ring-[3px] focus:ring-cyan/10`}
        />
      </div>
    </div>
  )
}

function CashupInner() {
  const auth = useAuth({ requireAuth: true })
  const toast = useToast()
  const navigate = useNavigate()
  usePageTitle("Cash Reconciliation — MSO Limpid")

  const {
    expected, loadingExpected, refreshExpected,
    posMP, setPosMP, posZM, setPosZM, cashAmt, setCashAmt,
    expenses, addExpense, updateExpense, removeExpense,
    mpCharge, zmCharge, mpNet, zmNet, totalCharges, totalExpenses,
    collected, cashToBank, variance, reconStatus, submit, saving,
  } = useCashupData(auth.username)

  if (auth.loading || !auth.user) {
    return <div className="min-h-screen bg-pagebg" />
  }

  const recon = RECON_STYLES[reconStatus]

  const handleSubmit = async () => {
    const result = await submit()
    if (!result.ok) {
      toast.showToast("Could not save", result.error || "Please try again", "err")
      return
    }
    if (navigator.vibrate) navigator.vibrate([50, 30, 80])
    toast.showToast("Saved", "Reconciliation saved successfully", "ok")
    setTimeout(() => navigate(dashboardPathFor({ role: auth.role, station: auth.station })), 1200)
  }

  return (
    <div className="min-h-screen bg-pagebg">
      <SafeAreaDebug />
      <div className="sticky top-0 z-[200] flex items-center gap-3 border-b border-border bg-white px-4 pb-2.5 shadow-[0_1px_4px_rgba(0,0,0,.04)]" style={{ paddingTop: "max(var(--sat), 52px)" }}>
        <button
          type="button"
          onClick={() => navigate(dashboardPathFor({ role: auth.role, station: auth.station }))}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[9px] border border-border bg-surface text-ink-2"
        >
          <i className="bi bi-arrow-left" />
        </button>
        <div className="flex-1">
          <div className="text-[16px] font-extrabold text-ink">Cash Reconciliation</div>
          <div className="text-[10px] text-ink-4">{new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
        </div>
        <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-[#DDD6FE] bg-[#EDE9FE] px-2.5 py-1 text-[10.5px] font-bold text-[#6D28D9]">
          <i className="bi bi-shield-check text-[11px]" /> Cashier
        </span>
      </div>

      <div className="mx-auto max-w-[640px] px-4 py-4 pb-[120px]">
        <div className="relative mb-5 overflow-hidden rounded-card p-[18px]" style={{ background: "linear-gradient(135deg, #130656 0%, #1a0875 100%)" }}>
          <div className="mb-3.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[1.5px] text-white/35">
            Expected From Today's Dip
            <button type="button" onClick={refreshExpected} className="ml-auto flex h-[26px] w-[26px] items-center justify-center rounded-[7px] border border-white/10 bg-white/10 text-white/50">
              <i className={`bi bi-arrow-clockwise ${loadingExpected ? "animate-spin-fast" : ""}`} />
            </button>
          </div>

          {!loadingExpected && !expected.hasData && (
            <div className="mb-3 flex items-center gap-2 rounded-[10px] border border-amber/25 bg-amber/10 px-3.5 py-2.5 text-[12.5px] font-medium text-amber-light">
              <i className="bi bi-exclamation-triangle-fill" /> Supervisor has not submitted dip readings yet.
            </div>
          )}

          <div className="grid grid-cols-3 gap-3.5">
            <div>
              <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.8px] text-white/30">PMS Litres</div>
              <div className="mono text-[16px] font-extrabold text-white">{loadingExpected ? "…" : expected.hasData ? `${numberNG(expected.pmsLitres, { maximumFractionDigits: 2 })}L` : "—"}</div>
              <div className="mt-0.5 text-[10px] text-white/30">{expected.hasData ? `${naira(expected.pmsRevenue)} @ ${naira(expected.pmsPrice)}/L` : "Loading…"}</div>
            </div>
            <div>
              <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.8px] text-white/30">AGO Litres</div>
              <div className="mono text-[16px] font-extrabold text-white">{loadingExpected ? "…" : expected.hasData ? `${numberNG(expected.agoLitres, { maximumFractionDigits: 2 })}L` : "—"}</div>
              <div className="mt-0.5 text-[10px] text-white/30">{expected.hasData ? `${naira(expected.agoRevenue)} @ ${naira(expected.agoPrice)}/L` : "Loading…"}</div>
            </div>
            <div>
              <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.8px] text-white/30">Expected Total</div>
              <div className="mono text-[16px] font-extrabold text-white">{loadingExpected ? "…" : expected.hasData ? naira(expected.grandTotal) : "—"}</div>
              <div className="mt-0.5 text-[10px] text-white/30">Grand total</div>
            </div>
          </div>
        </div>

        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[1.1px] text-ink-4">POS Collections</div>
        <MoneyField label="MP Terminal" sub="0.25% charge deducted" value={posMP} onChange={setPosMP} icon="bi-credit-card" iconBg="#EAF6FC" iconColor="#1188B5" />
        {Number(posMP) > 0 && (
          <div className="mb-2.5 grid grid-cols-2 gap-2.5">
            <div className="rounded-[9px] border border-[#FECACA] bg-red-light p-2.5">
              <div className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.8px] text-red">Charge (0.25%)</div>
              <div className="mono text-[14px] font-extrabold text-red">{naira(mpCharge)}</div>
            </div>
            <div className="rounded-[9px] border border-[#BBF7D0] bg-green-light p-2.5">
              <div className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.8px] text-green">Net Amount</div>
              <div className="mono text-[14px] font-extrabold text-green">{naira(mpNet)}</div>
            </div>
          </div>
        )}

        <MoneyField label="ZM Terminal" sub="0.30% charge deducted" value={posZM} onChange={setPosZM} icon="bi-credit-card-2-front" iconBg="#F5F3FF" iconColor="#6D28D9" />
        {Number(posZM) > 0 && (
          <div className="mb-2.5 grid grid-cols-2 gap-2.5">
            <div className="rounded-[9px] border border-[#FECACA] bg-red-light p-2.5">
              <div className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.8px] text-red">Charge (0.30%)</div>
              <div className="mono text-[14px] font-extrabold text-red">{naira(zmCharge)}</div>
            </div>
            <div className="rounded-[9px] border border-[#BBF7D0] bg-green-light p-2.5">
              <div className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.8px] text-green">Net Amount</div>
              <div className="mono text-[14px] font-extrabold text-green">{naira(zmNet)}</div>
            </div>
          </div>
        )}

        <div className="mb-1.5 mt-4 text-[10px] font-bold uppercase tracking-[1.1px] text-ink-4">Cash</div>
        <MoneyField label="Physical Cash Collected" sub="Count carefully — exact amount" value={cashAmt} onChange={setCashAmt} icon="bi-cash-stack" iconBg="#F0FDF4" iconColor="#16A34A" />

        <div className="mb-1.5 mt-4 text-[10px] font-bold uppercase tracking-[1.1px] text-ink-4">Expenses</div>
        <div className="mb-5 overflow-hidden rounded-card border border-border bg-white shadow-card">
          <div className="flex items-center gap-2.5 border-b border-surface bg-surface px-4 py-3">
            <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[9px]" style={{ background: "#FEF2F2" }}>
              <i className="bi bi-receipt-cutoff text-red" />
            </div>
            <div>
              <div className="text-[13px] font-extrabold text-ink">Today's Expenses</div>
              <div className="text-[10px] text-ink-4">Deducted from cash to bank</div>
            </div>
          </div>
          <div className="p-4">
            {expenses.map((e, i) => (
              <div key={i} className="mb-2 flex items-center gap-2 last:mb-0">
                <input
                  type="text"
                  placeholder="Description (e.g. Logistics to bank)"
                  value={e.desc}
                  onChange={ev => updateExpense(i, "desc", ev.target.value)}
                  className="flex-1 rounded-[9px] border-[1.5px] border-border bg-surface px-3 py-2.5 text-[13px] font-medium text-ink outline-none focus:border-cyan focus:bg-white"
                />
                <input
                  type="number"
                  placeholder="₦0"
                  min="0"
                  step="1"
                  value={e.amt}
                  onChange={ev => updateExpense(i, "amt", ev.target.value)}
                  className="mono w-[110px] rounded-[9px] border-[1.5px] border-border bg-surface px-3 py-2.5 text-right text-[13px] font-bold text-ink outline-none focus:border-cyan focus:bg-white"
                />
                <button type="button" onClick={() => removeExpense(i)} className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-[8px] border border-[#FECACA] bg-red-light text-red">
                  <i className="bi bi-trash text-[13px]" />
                </button>
              </div>
            ))}
            <button type="button" onClick={addExpense} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-[9px] border-[1.5px] border-dashed border-border bg-surface py-2.5 text-[12.5px] font-semibold text-ink-3">
              <i className="bi bi-plus-circle" /> Add Expense
            </button>
            <div className="mt-2.5 flex items-center justify-between rounded-[9px] border border-border bg-surface px-3.5 py-2.5">
              <span className="text-[11px] font-semibold text-ink-3">Total Expenses</span>
              <span className="mono text-[14px] font-extrabold text-ink">{naira(totalExpenses)}</span>
            </div>
          </div>
        </div>

        <div className="mb-4 rounded-card border-2 p-[18px]" style={{ background: recon.bg, borderColor: recon.border }}>
          <div className="mb-3.5 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[1px]" style={{ color: recon.text }}>
            <i className={`bi ${recon.icon}`} /> {recon.label}
          </div>
          {[
            ["Expected (from dip)", expected.hasData ? naira(expected.grandTotal) : "₦—"],
            ["POS MP (net)", naira(mpNet)],
            ["POS ZM (net)", naira(zmNet)],
            ["Cash", naira(Number(cashAmt) || 0)],
            ["Less expenses", `−${naira(totalExpenses)}`],
            ["POS charges (MP+ZM)", `−${naira(totalCharges)}`],
          ].map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between border-b border-black/[0.06] py-1.5">
              <span className="text-[12.5px] font-semibold text-ink">{k}</span>
              <span className="mono text-[14px] font-extrabold text-ink">{v}</span>
            </div>
          ))}
          <div className="flex items-baseline justify-between border-t border-black/[0.08] pb-0 pt-2.5">
            <span className="text-[14px] font-extrabold text-ink">Collected total</span>
            <span className="mono text-[18px] font-extrabold text-ink">{naira(collected)}</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between border-t border-black/[0.08] pt-2.5">
            <span className="text-[14px] font-extrabold text-ink">Variance</span>
            <span className="mono text-[22px] font-extrabold" style={{ color: recon.text }}>
              {expected.hasData ? `${variance >= 0 ? "+" : ""}${naira(Math.abs(variance))}` : "₦—"}
            </span>
          </div>
        </div>

        <div className="rounded-card border-2 border-[#BBF7D0] bg-white p-[18px]">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[1px] text-green">
            <i className="bi bi-safe" /> Cash to Bank
          </div>
          <div className="mono text-[32px] font-black tracking-tight text-green">{naira(cashToBank)}</div>
          <div className="mt-1.5 text-[11.5px] text-ink-3">Cash − Expenses − POS charges (MP 0.25% + ZM 0.30%)</div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-[300] border-t border-border bg-white px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,.08)]" style={{ paddingBottom: "calc(12px + var(--sab))" }}>
        <div className="mx-auto flex max-w-[640px] gap-2.5">
          <button type="button" onClick={refreshExpected} className="flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center rounded-[13px] border-[1.5px] border-border bg-surface text-ink-3">
            <i className="bi bi-arrow-clockwise" />
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-[13px] bg-green text-[15px] font-extrabold text-white shadow-[0_4px_18px_rgba(22,163,74,.3)] disabled:opacity-60"
          >
            {saving ? (
              <span className="h-4 w-4 animate-spin-fast rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <i className="bi bi-check2-all" />
            )}
            {saving ? "Saving…" : "Save Reconciliation"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CashupPage() {
  return (
    <ToastProvider>
      <CashupInner />
    </ToastProvider>
  )
}
