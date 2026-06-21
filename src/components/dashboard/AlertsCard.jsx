import React from "react"

function buildTankAlerts(tankLevels) {
  if (!tankLevels || !tankLevels.length) return []
  return tankLevels
    .filter(t => t.cap > 0 && t.vol > 0 && Math.round((t.vol / t.cap) * 100) <= 20)
    .map(t => ({
      key: `tank-${t.id}`,
      icon: "bi-exclamation-triangle-fill",
      iconBg: "#FEF2F2",
      iconColor: "#DC2626",
      title: `${t.id} Critically Low`,
      text: `Only ${Math.round(t.vol).toLocaleString("en-NG")}L remaining (${Math.round((t.vol / t.cap) * 100)}%) — arrange discharge.`,
    }))
}

function buildEditAlerts(editRequests, onApprove, onReject) {
  if (!editRequests || !editRequests.length) return []
  return editRequests.map(r => ({
    key: `edit-${r.rowIndex}`,
    icon: "bi-pencil-square",
    iconBg: "#F5F3FF",
    iconColor: "#7C3AED",
    title: `Edit Request — ${r.date}`,
    text: `${r.name || r.requestedBy} requests permission to edit dip readings.`,
    actions: onApprove
      ? [
          { label: "Approve", onClick: () => onApprove(r.rowIndex), tone: "green" },
          { label: "Reject", onClick: () => onReject(r.rowIndex), tone: "red" },
        ]
      : null,
  }))
}

export default function AlertsCard({ tankLevels, editRequests, onApproveEdit, onRejectEdit }) {
  const alerts = [...buildEditAlerts(editRequests, onApproveEdit, onRejectEdit), ...buildTankAlerts(tankLevels)]

  return (
    <div className="overflow-hidden rounded-card border border-border bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-surface px-[18px] py-3.5">
        <div className="text-[13.5px] font-extrabold tracking-[-0.02em] text-ink">Alerts</div>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-px text-[10.5px] font-bold ${
            alerts.length ? "border-[#FECACA] bg-red-light text-red" : "border-border bg-surface text-ink-4"
          }`}
        >
          {alerts.length}
        </span>
      </div>
      <div>
        {alerts.length === 0 ? (
          <div className="px-[18px] py-6 text-center text-[12px] text-ink-4">No active alerts</div>
        ) : (
          alerts.map(a => (
            <div key={a.key} className="flex items-start gap-[11px] border-b border-surface px-[18px] py-3 last:border-none">
              <div
                className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[9px] text-base"
                style={{ background: a.iconBg }}
              >
                <i className={`bi ${a.icon}`} style={{ color: a.iconColor }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 text-[12.5px] font-bold text-ink">{a.title}</div>
                <div className="text-[11.5px] leading-relaxed text-ink-2">{a.text}</div>
                {a.actions && (
                  <div className="mt-2 flex gap-2">
                    {a.actions.map(act => (
                      <button
                        key={act.label}
                        type="button"
                        onClick={act.onClick}
                        className={`rounded-[7px] px-3 py-1 text-[11px] font-bold ${
                          act.tone === "green" ? "bg-green-light text-green" : "bg-red-light text-red"
                        }`}
                      >
                        {act.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
