import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth, dashboardPathFor } from "../hooks/useAuth"
import { usePageTitle } from "../hooks/usePageTitle"
import FuelGauge from "../components/ui/FuelGauge"

const SCRIPT_URL = import.meta.env.VITE_SCRIPT_URL

export default function LoginPage() {
  usePageTitle("Sign in — MSO Limpid")
  const auth = useAuth({ requireAuth: false })
  const navigate = useNavigate()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!auth.loading && auth.user) {
      if (auth.canPickStation || !auth.station) {
        navigate("/select", { replace: true })
      } else {
        navigate(dashboardPathFor({ role: auth.role, station: auth.station }), { replace: true })
      }
    }
  }, [auth.loading, auth.user, auth.canPickStation, auth.station, auth.role, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!username.trim() || !password) {
      setError("Enter your username and password.")
      return
    }
    if (!SCRIPT_URL) {
      setError("VITE_SCRIPT_URL isn't configured — check your .env file.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "login", username: username.trim(), password }),
        redirect: "follow",
      })
      const payload = await res.json()

      if (!payload.ok || !payload.user) {
        setError(payload.error || "Incorrect username or password.")
        setSubmitting(false)
        return
      }

      auth.login(payload.user)
    } catch (err) {
      setError("Couldn't reach the server. Check your connection and try again.")
      setSubmitting(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-navy lg:items-stretch lg:justify-stretch">
      {/* ambient glow */}
      <div className="pointer-events-none absolute -left-32 top-1/4 h-[420px] w-[420px] rounded-full bg-cyan/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-[360px] w-[360px] rounded-full bg-amber/10 blur-[120px]" />

      <div className="relative z-[1] flex w-full max-w-[980px] flex-col overflow-hidden rounded-card shadow-glow lg:m-8 lg:flex-row lg:rounded-card">
        {/* ── Brand panel ── */}
        <div className="dot-grid relative hidden flex-col items-center justify-center gap-8 bg-navy-2 px-10 py-14 lg:flex lg:w-[42%]">
          <div className="enter relative z-[1] flex flex-col items-center gap-1" style={{ animationDelay: "0ms" }}>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.12] bg-white/[0.08]">
              <span className="font-mono text-xl font-black text-cyan">M</span>
            </div>
            <div className="text-lg font-extrabold tracking-[-0.02em] text-white">MSO Limpid</div>
            <div className="text-[10px] uppercase tracking-[1.5px] text-white/30">Operations Console</div>
          </div>

          <div className="enter relative z-[1]" style={{ animationDelay: "120ms" }}>
            <FuelGauge level={68} />
          </div>

          <div
            className="enter relative z-[1] max-w-[230px] text-center text-[12px] leading-relaxed text-white/35"
            style={{ animationDelay: "220ms" }}
          >
            Sales, tank dips, cash reconciliation and discharge — one console
            for every shift at MSO Limpid Co. Ltd.
          </div>
        </div>

        {/* ── Form panel ── */}
        <div className="flex flex-1 flex-col justify-center bg-white px-7 py-10 sm:px-10 lg:px-12">
          {/* mobile-only compact brand row */}
          <div className="enter mb-7 flex items-center gap-3 lg:hidden" style={{ animationDelay: "0ms" }}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy">
              <span className="font-mono text-sm font-black text-cyan">M</span>
            </div>
            <div>
              <div className="text-sm font-extrabold tracking-[-0.02em] text-navy">MSO Limpid</div>
              <div className="text-[9px] uppercase tracking-[1px] text-ink-4">Operations Console</div>
            </div>
          </div>

          <div className="enter" style={{ animationDelay: "80ms" }}>
            <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-cyan/20 bg-cyan-light px-3 py-1 text-[10.5px] font-bold text-cyan-dark">
              <span className="h-1.5 w-1.5 rounded-full bg-green" /> Mobil Authorised · Lagos
            </div>
            <h1 className="mb-1.5 mt-3 text-[22px] font-extrabold tracking-[-0.02em] text-navy">
              Welcome back
            </h1>
            <p className="mb-7 text-[13px] text-ink-3">Sign in with the credentials issued for your role.</p>
          </div>

          <form onSubmit={handleSubmit} className="enter" style={{ animationDelay: "140ms" }}>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.6px] text-ink-3">
              Username
            </label>
            <div className="mb-4 flex items-center gap-2.5 rounded-[10px] border border-border bg-surface px-3.5 py-2.5 transition-colors focus-within:border-cyan/50 focus-within:ring-2 focus-within:ring-cyan/20">
              <i className="bi bi-person text-ink-4" />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="e.g. owner"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-4"
              />
            </div>

            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.6px] text-ink-3">
              Password
            </label>
            <div className="mb-5 flex items-center gap-2.5 rounded-[10px] border border-border bg-surface px-3.5 py-2.5 transition-colors focus-within:border-cyan/50 focus-within:ring-2 focus-within:ring-cyan/20">
              <i className="bi bi-lock text-ink-4" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-4"
              />
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-[10px] border border-[#FECACA] bg-red-light px-3.5 py-2.5 text-[12.5px] font-medium text-red">
                <i className="bi bi-exclamation-circle mt-px flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-cyan-dark to-cyan py-3 text-sm font-bold text-white shadow-[0_8px_20px_-6px_rgba(23,157,208,.55)] transition-all duration-150 hover:shadow-[0_10px_24px_-6px_rgba(23,157,208,.65)] disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin-fast rounded-full border-2 border-white/30 border-t-white" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in <i className="bi bi-arrow-right" />
                </>
              )}
            </button>
          </form>

          <p className="enter mt-6 text-center text-[11px] text-ink-4" style={{ animationDelay: "200ms" }}>
            Trouble signing in? Contact your station supervisor.
          </p>
        </div>
      </div>
    </main>
  )
}
