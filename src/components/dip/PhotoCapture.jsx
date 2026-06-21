import React, { useRef } from "react"

export default function PhotoCapture({ photo, onCapture, label = "Add dip photo", sub = "Optional evidence photo" }) {
  const inputRef = useRef(null)

  const handleChange = e => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => onCapture(ev.target.result, file.type)
    reader.readAsDataURL(file)
  }

  const done = Boolean(photo && photo.saved)

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleChange} />
      <button
        type="button"
        onClick={() => inputRef.current && inputRef.current.click()}
        className={`mt-3.5 flex w-full items-center gap-3 rounded-[14px] border-[1.5px] px-3.5 py-3 transition-all ${
          done ? "border-green-light bg-green-light" : "border-dashed border-border bg-surface hover:border-cyan hover:bg-cyan-light"
        }`}
      >
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] border ${done ? "border-green-light bg-green-light" : "border-cyan/20 bg-cyan-light"}`}>
          <i className={`bi ${done ? "bi-check-circle-fill text-green" : "bi-camera-fill text-cyan-dark"}`} />
        </div>
        <div className="flex-1 text-left">
          <div className={`text-[12.5px] font-bold ${done ? "text-green" : "text-ink-2"}`}>{done ? "Photo saved" : label}</div>
          <div className="text-[10.5px] font-medium text-ink-4">{sub}</div>
        </div>
        <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${done ? "bg-green" : "bg-cyan"}`}>
          <i className={`bi ${done ? "bi-check-lg" : "bi-plus"} text-[13px] text-white`} />
        </div>
      </button>
    </>
  )
}
