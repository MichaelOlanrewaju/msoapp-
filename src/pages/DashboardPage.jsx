import React, { useState } from "react"
import Sidebar from "../components/layout/Sidebar"
import Topbar from "../components/layout/Topbar"
import BottomNav from "../components/layout/BottomNav"
import MobileDrawer from "../components/layout/MobileDrawer"
import { ToastProvider } from "../components/layout/ToastProvider"
import SafeAreaDebug from "../components/ui/SafeAreaDebug"
import AdminBanner from "../components/dashboard/AdminBanner"
import SectionLabel from "../components/dashboard/SectionLabel"
import KpiGrid from "../components/dashboard/KpiGrid"
import DipSummaryCard from "../components/dashboard/DipSummaryCard"
import AgoCard from "../components/dashboard/AgoCard"
import PaymentBreakdown from "../components/dashboard/PaymentBreakdown"
import TankLevelsCard from "../components/dashboard/TankLevelsCard"
import SalesTrendCard from "../components/dashboard/SalesTrendCard"
import TransactionsCard from "../components/dashboard/TransactionsCard"
import ExpensesCard from "../components/dashboard/ExpensesCard"
import AlertsCard from "../components/dashboard/AlertsCard"
import QuickActionsCard from "../components/dashboard/QuickActionsCard"
import { useAuth } from "../hooks/useAuth"
import { useDashboardData } from "../hooks/useDashboardData"
import { usePageTitle } from "../hooks/usePageTitle"
import { initials, roleLabel } from "../utils/format"

// One orchestrated, capped stagger for the page-load sequence —
// each section ships 60ms later than the last, never feels sluggish.
function delay(step) {
  return { animationDelay: `${Math.min(step * 60, 360)}ms` }
}

function DashboardInner() {
  const auth = useAuth({ requireAuth: true })
  const { status, data, loading, refresh } = useDashboardData(auth.username)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  usePageTitle("Dashboard — MSO Limpid")

  if (auth.loading || !auth.user) {
    return <div className="min-h-screen bg-pagebg" />
  }

  return (
    <div className="flex min-h-screen">
      <SafeAreaDebug />
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[1049] bg-black/55 backdrop-blur-[2px] md:block"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        isOwner={auth.isOwner}
        isGM={auth.isGM}
        name={auth.name || auth.username}
        role={roleLabel(auth.role)}
        avatarInitials={initials(auth.name || auth.username)}
        mobileOpen={sidebarOpen}
        onLogout={auth.logout}
      />

      <div className="flex min-w-0 flex-1 flex-col lg:ml-sidebar">
        <Topbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(o => !o)}
          loading={loading}
          onRefresh={refresh}
        />

        <div className="flex-1 p-3.5 pb-[calc(14px+64px)] md:p-[22px] md:pb-[22px]">
          <div className="enter" style={delay(0)}>
            <AdminBanner visible={auth.isOwner} />
          </div>

          <div className="enter" style={delay(1)}>
            <KpiGrid status={status} data={data} />
          </div>

          <div className="enter" style={delay(2)}>
            <SectionLabel>Tank Performance</SectionLabel>
          </div>
          <div className="enter mb-3 grid grid-cols-1 gap-3 lg:grid-cols-12" style={delay(3)}>
            <div className="lg:col-span-5">
              <DipSummaryCard status={status} tanks={data?.tanks?.pms} pmsPrice={data?.pmsPrice} />
            </div>
            <div className="lg:col-span-3">
              <AgoCard status={status} ago={data?.tanks?.ago} agoPrice={data?.agoPrice} />
            </div>
            <div className="lg:col-span-4">
              <PaymentBreakdown status={status} payments={data?.payments} />
            </div>
          </div>

          <div className="enter" style={delay(4)}>
            <SectionLabel>Fuel Stock &amp; Sales Trend</SectionLabel>
          </div>
          <div className="enter mb-3 grid grid-cols-1 gap-3 lg:grid-cols-12" style={delay(5)}>
            <div className="lg:col-span-4">
              <TankLevelsCard status={status} tankLevels={data?.tankLevels} isOwner={auth.isOwner} />
            </div>
            <div className="lg:col-span-8">
              <SalesTrendCard
                status={status}
                weekly={data?.weekly}
                pmsRevenue={data?.pmsRevenue}
                agoRevenue={data?.agoRevenue}
              />
            </div>
          </div>

          <div className="enter" style={delay(6)}>
            <SectionLabel>Transactions &amp; Actions</SectionLabel>
          </div>
          <div className="enter grid grid-cols-1 gap-3 lg:grid-cols-12" style={delay(7)}>
            <div className="lg:col-span-8">
              <TransactionsCard status={status} transactions={data?.recentTransactions} />
            </div>
            <div className="flex flex-col gap-3 lg:col-span-4">
              <ExpensesCard status={status} expensesTotal={data?.expenses} isOwner={auth.isOwner} />
              <AlertsCard tankLevels={data?.tankLevels} />
              <QuickActionsCard role={auth.role} />
            </div>
          </div>
        </div>
      </div>

      <BottomNav onOpenMore={() => setDrawerOpen(true)} />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onLogout={auth.logout} />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <ToastProvider>
      <DashboardInner />
    </ToastProvider>
  )
}
