import React from "react"
import { Link } from "react-router-dom"

const LINK =
  "flex items-center gap-[9px] rounded-[11px] border border-white/[0.08] bg-white/[0.06] px-3 py-[11px] text-[12.5px] font-semibold text-white/75 transition-colors duration-150 hover:bg-white/10 [&_i]:flex-shrink-0 [&_i]:text-base"

const PRIMARY_LINKS = [
  { href: "/cashup-mso", icon: "bi-cash-coin", color: "#179DD0", text: "Cash Reconciliation" },
  { href: "/discharge-mso", icon: "bi-truck", color: "#F59E0B", text: "Discharge" },
  { href: "/shifts-mso", icon: "bi-clock-history", color: "#A78BFA", text: "Shift Log" },
  { href: "/incidents-mso", icon: "bi-exclamation-triangle", color: "#F87171", text: "Incidents" },
  { href: "/variance-mso", icon: "bi-activity", color: "#34D399", text: "Variance" },
  { href: "/pnl-mso", icon: "bi-bar-chart-line", color: "#60A5FA", text: "P&L Report" },
]

const SECONDARY_LINKS = [
  { href: "/records-mso", icon: "bi-journal-text", color: "#94A3B8", text: "Records" },
  { href: "/debtors-mso", icon: "bi-people", color: "#94A3B8", text: "Debtors" },
  { href: "/orders-mso", icon: "bi-cart3", color: "#94A3B8", text: "Orders" },
  { href: "/payroll-mso", icon: "bi-wallet2", color: "#94A3B8", text: "Payroll" },
  { href: "/summary-mso", icon: "bi-printer", color: "#94A3B8", text: "Summary" },
  { href: "/chat-mso", icon: "bi-chat-dots", color: "#94A3B8", text: "Staff Chat" },
]

export default function MobileDrawer({ open, onClose, onLogout }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[1060] flex items-end">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} />
      <div
        className="relative z-[1] max-h-[82vh] w-full overflow-y-auto rounded-t-[20px] bg-navy-2"
        style={{ paddingBottom: "calc(16px + var(--sab))" }}
      >
        <div className="mx-auto mt-3 h-[3.5px] w-[38px] rounded-sm bg-white/[0.18]" />
        <div className="flex items-center justify-between px-[18px] pb-2 pt-3.5">
          <div className="text-base font-extrabold text-white">Menu</div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white/10 text-lg text-white/60"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 px-3.5 pb-3 pt-1">
          {PRIMARY_LINKS.map(l => (
            <Link key={l.href} to={l.href} className={LINK} onClick={onClose}>
              <i className={`bi ${l.icon}`} style={{ color: l.color }} />
              {l.text}
            </Link>
          ))}
        </div>

        <div className="px-[18px] pb-1.5 pt-2.5 text-[8px] font-bold uppercase tracking-[2px] text-white/[0.18]">
          Reports &amp; Finance
        </div>
        <div className="grid grid-cols-2 gap-2 px-3.5 pb-3 pt-1">
          {SECONDARY_LINKS.map(l => (
            <Link key={l.href} to={l.href} className={LINK} onClick={onClose}>
              <i className={`bi ${l.icon}`} style={{ color: l.color }} />
              {l.text}
            </Link>
          ))}
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="mx-3.5 mt-2.5 flex w-[calc(100%-28px)] items-center justify-center gap-2 rounded-[11px] border border-red/25 bg-red/[0.12] p-3 text-[13px] font-semibold text-red-300"
        >
          <i className="bi bi-box-arrow-left" /> Sign Out
        </button>
      </div>
    </div>
  )
}
