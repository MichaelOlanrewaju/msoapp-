import React from "react"
import { NavLink } from "react-router-dom"

const BASE =
  "flex flex-1 flex-col items-center gap-[3px] rounded-[10px] border border-transparent px-2.5 py-[5px] text-[9.5px] font-semibold transition-all duration-150 [&_i]:text-xl [&_i]:leading-none"

function itemClass({ isActive }) {
  return `${BASE} ${isActive ? "border-cyan/25 bg-white/10 text-cyan" : "text-white/40"}`
}

export default function BottomNav({ onOpenMore, homePath = "/dashboard-mso" }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[500] flex px-1 py-1.5 shadow-[0_-4px_20px_rgba(19,6,86,.35)] lg:hidden"
      style={{ paddingBottom: "calc(6px + var(--sab))", background: "linear-gradient(180deg, #130656 0%, #0D1226 100%)" }}
    >
      <div className="flex w-full justify-around">
        <NavLink to={homePath} end className={itemClass}>
          <i className="bi bi-grid-1x2-fill" />
          <span>Home</span>
        </NavLink>
        <NavLink to="/sales-mso" className={itemClass}>
          <i className="bi bi-speedometer2" />
          <span>Pump</span>
        </NavLink>
        <NavLink to="/dip-mso" className={itemClass}>
          <i className="bi bi-water" />
          <span>Dip</span>
        </NavLink>
        <NavLink to="/expenses-mso" className={itemClass}>
          <i className="bi bi-receipt-cutoff" />
          <span>Expenses</span>
        </NavLink>
        <button type="button" onClick={onOpenMore} className={BASE + " text-white/40"}>
          <i className="bi bi-list" />
          <span>More</span>
        </button>
      </div>
    </nav>
  )
}
