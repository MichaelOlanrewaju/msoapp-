import React from "react"
import { Link } from "react-router-dom"

const ACTIONS = [
  { icon: "bi-calculator", iconBg: "#F0FDF4", iconColor: "#16A34A", label: "Cash Reconciliation", href: "/cashup-mso", roles: ["owner", "gm", "supervisor", "cashier"] },
  { icon: "bi-graph-up-arrow", iconBg: "#EAF6FC", iconColor: "#179DD0", label: "Stock Variance", href: "/variance-mso", roles: ["owner", "gm"] },
  { icon: "bi-bar-chart-line-fill", iconBg: "#EDE9FE", iconColor: "#6D28D9", label: "P&L Report", href: "/pnl-mso", roles: ["owner", "gm"] },
  { icon: "bi-check2-circle", iconBg: "#FFFBEB", iconColor: "#B45309", label: "Approvals", href: "/approvals", roles: ["owner", "gm"] },
  { icon: "bi-truck", iconBg: "#FEF2F2", iconColor: "#DC2626", label: "Discharge", href: "/discharge-mso", roles: ["gm", "supervisor"] },
  { icon: "bi-printer-fill", iconBg: "#EEF0FB", iconColor: "#130656", label: "Daily Summary", href: "/summary-mso", roles: ["owner", "gm", "supervisor"] },
]

export default function QuickActionsCard({ role }) {
  const actions = ACTIONS.filter(a => a.roles.includes(role))
  if (actions.length === 0) return null

  return (
    <div className="overflow-hidden rounded-card border border-border bg-white shadow-card">
      <div className="border-b border-surface px-[18px] py-3.5">
        <div className="text-[13.5px] font-extrabold tracking-[-0.02em] text-ink">Quick Actions</div>
      </div>
      <div className="space-y-1.5 p-3.5">
        {actions.map(a => (
          <Link
            key={a.href}
            to={a.href}
            className="group flex w-full items-center gap-2.5 rounded-[10px] border border-border bg-surface px-3 py-2.5 text-left text-[12.5px] font-semibold text-ink transition-all duration-150 hover:-translate-y-px hover:border-cyan/30 hover:bg-cyan-light hover:text-navy hover:shadow-[0_3px_10px_rgba(23,157,208,.1)]"
          >
            <span
              className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-lg text-[15px]"
              style={{ background: a.iconBg }}
            >
              <i className={`bi ${a.icon}`} style={{ color: a.iconColor }} />
            </span>
            {a.label}
            <i className="bi bi-chevron-right ml-auto text-[13px] text-ink-4 transition-all duration-150 group-hover:translate-x-[3px] group-hover:text-cyan" />
          </Link>
        ))}
      </div>
    </div>
  )
}
