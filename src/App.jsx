import React from "react"
import { Routes, Route } from "react-router-dom"
import LoginPage from "./pages/LoginPage"
import SelectStationPage from "./pages/SelectStationPage"
import DashboardPage from "./pages/DashboardPage"
import SupervisorDashboardPage from "./pages/SupervisorDashboardPage"
import GMDashboardPage from "./pages/GMDashboardPage"
import RecordsPage from "./pages/RecordsPage"
import DipPage from "./pages/DipPage"
import SalesPage from "./pages/SalesPage"
import NotFoundPage from "./pages/NotFoundPage"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/select" element={<SelectStationPage />} />
      <Route path="/dashboard-mso" element={<DashboardPage />} />
      <Route path="/dashboard-supervisor-mso" element={<SupervisorDashboardPage />} />
      <Route path="/dashboard-gm-mso" element={<GMDashboardPage />} />
      <Route path="/records-mso" element={<RecordsPage />} />
      <Route path="/dip-mso" element={<DipPage />} />
      <Route path="/sales-mso" element={<SalesPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
