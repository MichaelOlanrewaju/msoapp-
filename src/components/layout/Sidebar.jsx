import React from "react"
import { NavLink } from "react-router-dom"

const NAV_SECTIONS = [
  {
    label: null,
    links: [
      { href: "/overview", icon: "bi-globe2", text: "Overview", ownerOrGm: true },
      { href: "/approvals", icon: "bi-check2-square", text: "Approvals", ownerOrGm: true },
    ],
  },
  {
    label: "Operations",
    links: [
      { href: "/sales-mso", icon: "bi-pencil-square", text: "Record Sales" },
      { href: "/discharge-mso", icon: "bi-truck", text: "Discharge" },
      { href: "/dip-mso", icon: "bi-water", text: "Tank Dip" },
      { href: "/expenses-mso", icon: "bi-receipt-cutoff", text: "Expenses" },
      { href: "/shifts-mso", icon: "bi-clock-history", text: "Shift Log" },
      { href: "/incidents-mso", icon: "bi-exclamation-triangle", text: "Incidents" },
      { href: "/cashup-mso", icon: "bi-cash-coin", text: "Cash Reconciliation" },
      { href: "/variance-mso", icon: "bi-activity", text: "Stock Variance" },
    ],
  },
  {
    label: "Reports",
    links: [
      { href: "/records-mso", icon: "bi-journal-text", text: "Records" },
      { href: "/pnl-mso", icon: "bi-bar-chart-line", text: "P&L Report" },
      { href: "/price-mso", icon: "bi-tag", text: "Pump Prices" },
      { href: "/debtors-mso", icon: "bi-people", text: "Debtors" },
      { href: "/stock-mso", icon: "bi-box-seam", text: "Lubricant Stock" },
      { href: "/orders-mso", icon: "bi-cart3", text: "Purchase Orders" },
      { href: "/payroll-mso", icon: "bi-wallet2", text: "Payroll" },
      { href: "/summary-mso", icon: "bi-printer", text: "Daily Summary" },
    ],
  },
  {
    label: "Communication",
    links: [{ href: "/chat-mso", icon: "bi-chat-dots", text: "Staff Chat" }],
  },
  {
    label: "Switch",
    links: [{ href: "/select", icon: "bi-arrow-left-right", text: "Switch Station" }],
  },
]

function NavLinkItem({ href, icon, text }) {
  return (
    <NavLink
      to={href}
      className={({ isActive }) =>
        `relative mb-px flex items-center gap-[9px] rounded-[9px] border px-2.5 py-2 text-[12.5px] font-medium transition-all duration-100 [&_i]:w-[18px] [&_i]:flex-shrink-0 [&_i]:text-[15px] [&_i]:transition-opacity
        ${
          isActive
            ? "border-cyan/[0.22] bg-cyan/[0.12] font-bold text-white [&_i]:text-cyan [&_i]:opacity-100"
            : "border-transparent text-white/[0.42] hover:bg-white/[0.06] hover:text-white/[0.82] [&_i]:opacity-50 hover:[&_i]:opacity-90"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute -left-2.5 top-[20%] bottom-[20%] w-[2.5px] rounded-[0_2px_2px_0] bg-cyan" />
          )}
          <i className={`bi ${icon}`} />
          {text}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar({ isOwner, isGM, name, role, avatarInitials, mobileOpen, onLogout, homePath = "/dashboard-mso" }) {
  return (
    <aside
      className={`dot-grid relative hidden lg:flex fixed top-0 left-0 bottom-0 z-[1050] w-sidebar flex-col overflow-hidden pl-[var(--sal)] pt-[max(var(--sat),14px)] transition-transform duration-200 ease-[cubic-bezier(.4,0,.2,1)] -translate-x-full lg:translate-x-0
        ${mobileOpen ? "lg:translate-x-0" : ""}`}
      style={{ background: "linear-gradient(180deg, #130656 0%, #0D1226 65%, #06091A 100%)" }}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-[2px] bg-gradient-to-b from-transparent via-cyan to-transparent opacity-60" />

      <div className="relative z-[2] flex flex-shrink-0 items-center gap-2.5 border-b border-white/[0.06] px-4 py-[18px] pb-3.5">
        <div className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-white/[0.12] bg-white/[0.08]">
          <span className="font-mono text-base font-black text-cyan">M</span>
        </div>
        <div>
          <div className="text-[13.5px] font-extrabold leading-tight tracking-[-0.02em] text-white">
            MSO Limpid
          </div>
          <div className="mt-0.5 text-[9px] uppercase tracking-[0.7px] text-white/25">
            Operations Console
          </div>
        </div>
      </div>

      <div className="relative z-[2] mx-3 mb-1 mt-2.5 flex flex-shrink-0 items-center gap-[9px] rounded-[10px] border border-cyan/[0.22] bg-cyan/[0.09] px-3 py-[9px]">
        <span className="animate-pulse-dot h-[7px] w-[7px] flex-shrink-0 rounded-full bg-[#4ADE80] shadow-[0_0_0_3px_rgba(74,222,128,.2)]" />
        <div>
          <div className="text-[11.5px] font-bold leading-tight text-cyan">MSO Limpid Co. Ltd</div>
          <div className="mt-0.5 text-[9px] text-white/[0.28]">Mobil Authorised · Lagos</div>
        </div>
      </div>

      <nav className="scrollbar-thin-dark relative z-[2] flex-1 overflow-y-auto px-2.5 pb-3 pt-1.5">
        <span className="block px-2 pb-[5px] pt-1.5 text-[8px] font-bold uppercase tracking-[2px] text-white/[0.18]">
          Main
        </span>
        <NavLinkItem href={homePath} icon="bi-grid-1x2-fill" text="Dashboard" />
        {NAV_SECTIONS.map((section, i) => {
          const links = section.links.filter(l => l.always || !l.ownerOrGm || isOwner || isGM)
          if (links.length === 0) return null
          return (
            <React.Fragment key={section.label || `section-${i}`}>
              {section.label && (
                <span className="block px-2 pb-[5px] pt-3.5 text-[8px] font-bold uppercase tracking-[2px] text-white/[0.18]">
                  {section.label}
                </span>
              )}
              {links.map(l => (
                <NavLinkItem key={l.href} href={l.href} icon={l.icon} text={l.text} />
              ))}
            </React.Fragment>
          )
        })}
      </nav>

      <div className="relative z-[2] flex-shrink-0 border-t border-white/[0.06] px-3 pb-[calc(10px+var(--sab))] pt-2.5">
        <div className="mb-2 flex items-center gap-[9px] rounded-[10px] border border-white/[0.08] bg-white/[0.05] px-[11px] py-[9px]">
          <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-dark to-cyan text-[11px] font-extrabold text-white">
            {avatarInitials || "—"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-bold leading-tight text-white">{name || "Loading…"}</div>
            <div className="mt-0.5 text-[9.5px] capitalize text-white/[0.32]">{role || "—"}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-[7px] rounded-lg border border-white/[0.08] bg-white/[0.04] p-2 text-xs font-semibold text-white/[0.38] transition-all duration-150 hover:border-red/[0.22] hover:bg-red/[0.12] hover:text-red-300"
        >
          <i className="bi bi-box-arrow-left" /> Sign Out
        </button>
      </div>
    </aside>
  )
}
