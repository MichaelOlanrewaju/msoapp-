import React, { useEffect, useRef, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import SafeAreaDebug from "../components/ui/SafeAreaDebug"
import { useAuth, dashboardPathFor } from "../hooks/useAuth"
import { usePageTitle } from "../hooks/usePageTitle"
import { useConversations, useChat, dmConversationId } from "../hooks/useChat"
import { useStaff } from "../hooks/usePayroll"
import { useDriveImage } from "../hooks/useDriveImage"
import { compressImage } from "../utils/compressImage"

const SCRIPT_URL = import.meta.env.VITE_SCRIPT_URL
const STATION_KEY = import.meta.env.VITE_STATION_KEY || "mso"

function timeLabel(iso) {
  if (!iso) return ""
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: true })
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short" })
}

const AVATAR_COLORS = ["#179DD0","#06091A","#16A34A","#D97706","#DC2626","#7C3AED"]
function avatarColor(name) { return AVATAR_COLORS[(name||" ").charCodeAt(0) % AVATAR_COLORS.length] }
function initials(name) { return (name||"?").trim().split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase() }

function Avatar({ name, size = 38 }) {
  return (
    <div className="flex flex-shrink-0 items-center justify-center rounded-full text-white"
      style={{ width:size, height:size, background:avatarColor(name), fontSize:size*0.35, fontWeight:700 }}>
      {initials(name)}
    </div>
  )
}

/* Image bubble — fetches bytes via useDriveImage */
function ImageBubble({ fileId, isMine }) {
  const { dataUri, status } = useDriveImage(fileId)
  const [lightbox, setLightbox] = useState(false)
  return (
    <>
      <div
        className={`overflow-hidden rounded-[12px] border ${isMine ? "border-white/20" : "border-border"}`}
        style={{ width:180, height:180, background:"#f3f4f6", cursor:"pointer" }}
        onClick={() => dataUri && setLightbox(true)}
      >
        {dataUri
          ? <img src={dataUri} alt="" className="h-full w-full object-cover" />
          : <div className="flex h-full items-center justify-center">
              {status === "error"
                ? <i className="bi bi-image text-2xl text-ink-4" />
                : <span className="h-5 w-5 animate-spin-fast rounded-full border-2 border-cyan/20 border-t-cyan" />
              }
            </div>
        }
      </div>
      {lightbox && dataUri && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightbox(false)}>
          <img src={dataUri} alt="" className="max-h-[85vh] max-w-full rounded-[12px] object-contain" />
        </div>
      )}
    </>
  )
}

/* Message bubble with long-press actions */
function Bubble({ msg, isMine, onEdit, onDelete }) {
  const [showActions, setShowActions] = useState(false)
  const pressTimer = useRef(null)

  const startPress = () => {
    pressTimer.current = setTimeout(() => setShowActions(true), 500)
  }
  const endPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }

  return (
    <>
      <div className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}
        onMouseDown={startPress} onMouseUp={endPress} onMouseLeave={endPress}
        onTouchStart={startPress} onTouchEnd={endPress}>
        {!isMine && <Avatar name={msg.senderName} size={28} />}
        <div style={{ maxWidth:"72%" }}
          className={`rounded-[16px] ${isMine ? "rounded-br-[4px] bg-navy text-white" : "rounded-bl-[4px] border border-border bg-white text-ink shadow-sm"}`}>
          {/* Image */}
          {msg.imageFileId && (
            <div className="overflow-hidden rounded-[14px]">
              <ImageBubble fileId={msg.imageFileId} isMine={isMine} />
            </div>
          )}
          {/* Text */}
          {msg.text && (
            <div className="px-3.5 py-2.5">
              {!isMine && (
                <div className="mb-0.5 text-[10.5px] font-bold" style={{ color: avatarColor(msg.senderName) }}>
                  {msg.senderName}
                </div>
              )}
              <div className="whitespace-pre-wrap text-[13.5px] leading-snug">{msg.text}</div>
            </div>
          )}
          {/* Footer */}
          <div className={`flex items-center justify-end gap-1 px-3 pb-2 text-[9.5px] ${isMine ? "text-white/50" : "text-ink-4"}`}>
            {msg.editedAt && <span className="italic">edited</span>}
            {timeLabel(msg.timestamp)}
            {isMine && (msg.pending
              ? <i className="bi bi-clock" />
              : msg.failed ? <i className="bi bi-exclamation-circle" style={{ color:"#fca5a5" }} />
              : <i className="bi bi-check2" />
            )}
          </div>
        </div>
      </div>

      {/* Action sheet on long-press */}
      {showActions && (
        <div className="fixed inset-0 z-[500] flex items-end justify-center bg-black/30 p-4"
          onClick={() => setShowActions(false)}>
          <div className="w-full max-w-sm overflow-hidden rounded-[16px] bg-white shadow-xl"
            onClick={e => e.stopPropagation()}>
            <div className="border-b border-surface px-4 py-2.5 text-center text-[11.5px] text-ink-4 truncate">
              {msg.text || "Image"}
            </div>
            {isMine && (
              <button type="button" className="flex w-full items-center gap-3 px-5 py-3.5 text-[14px] font-medium text-ink active:bg-surface"
                onClick={() => { setShowActions(false); onEdit(msg) }}>
                <i className="bi bi-pencil text-ink-4 w-5" /> Edit Message
              </button>
            )}
            <button type="button"
              className="flex w-full items-center gap-3 border-t border-surface px-5 py-3.5 text-[14px] font-medium text-red active:bg-red-light"
              onClick={() => { setShowActions(false); onDelete(msg.messageId) }}>
              <i className="bi bi-trash text-red w-5" />
              {isMine ? "Delete for me" : "Delete for me"}
            </button>
            <button type="button"
              className="flex w-full items-center justify-center border-t border-surface py-3.5 text-[14px] font-semibold text-ink-4"
              onClick={() => setShowActions(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function DateSep({ iso }) {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now - d) / 86400000)
  const label = diff === 0 ? "Today" : diff === 1 ? "Yesterday"
    : d.toLocaleDateString("en-NG", { weekday:"long", day:"numeric", month:"long" })
  return (
    <div className="my-3 flex items-center gap-2">
      <div className="h-px flex-1 bg-border" />
      <span className="rounded-full bg-surface px-3 py-0.5 text-[10px] font-semibold text-ink-4">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

/* ── Edit modal ─────────────────────────────────────────── */
function EditModal({ message, onSave, onClose }) {
  const [text, setText] = useState(message.text)
  return (
    <div className="fixed inset-0 z-[600] flex items-end justify-center bg-black/40 p-4"
      onClick={onClose}>
      <div className="w-full max-w-sm overflow-hidden rounded-[16px] bg-white shadow-xl"
        onClick={e => e.stopPropagation()}>
        <div className="border-b border-surface px-4 py-3 text-[13px] font-bold text-ink">Edit message</div>
        <div className="p-4">
          <textarea
            autoFocus rows={3}
            value={text} onChange={e => setText(e.target.value)}
            className="w-full resize-none rounded-[10px] border border-border px-3 py-2.5 text-[13.5px] text-ink outline-none focus:border-cyan"
          />
        </div>
        <div className="flex gap-2.5 border-t border-surface px-4 pb-4">
          <button type="button" onClick={onClose}
            className="flex-1 rounded-[9px] border border-border py-2.5 text-[13px] font-semibold text-ink-4">
            Cancel
          </button>
          <button type="button" onClick={() => onSave(text.trim())} disabled={!text.trim()}
            className="flex-1 rounded-[9px] bg-navy py-2.5 text-[13px] font-bold text-white disabled:opacity-50">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Conversation window ────────────────────────────────── */
function ConversationView({ auth, conversationId, conversationName, isGeneral, onBack, onConversationDeleted }) {
  const { status, messages, sending, sendMessage, editMessage, deleteMessage, hideConversation } = useChat({
    username: auth.username, name: auth.name, conversationId,
  })
  const [draft, setDraft] = useState("")
  const [editingMsg, setEditingMsg] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [showDeleteConv, setShowDeleteConv] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const imageInputRef = useRef(null)
  const prevLenRef = useRef(0)

  useEffect(() => {
    if (messages.length !== prevLenRef.current) {
      prevLenRef.current = messages.length
      bottomRef.current?.scrollIntoView({ behavior: messages.length <= 10 ? "auto" : "smooth" })
    }
  }, [messages])

  const handleSend = async () => {
    const text = draft.trim()
    if (!text || sending) return
    setDraft("")
    await sendMessage({ text })
    inputRef.current?.focus()
  }

  const handleKey = e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleImageChange = async e => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = async ev => {
        const dataUrl = ev.target.result
        const compressed = await compressImage(dataUrl, file.type, 0.7, 1200)
        // Upload via savePhoto action (same pattern as dip photos)
        const now = new Date().toISOString().split("T")[0]
        const res = await fetch(SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({
            action: "savePhoto", station: STATION_KEY,
            date: now, session: "Chat", subject: `chat__${Date.now()}`,
            dataUrl: compressed, mimeType: file.type,
            username: auth.username,
          }),
        })
        const d = await res.json()
        if (d.ok && d.fileId) {
          await sendMessage({ imageFileId: d.fileId })
        }
        setUploading(false)
      }
      reader.readAsDataURL(file)
    } catch {
      setUploading(false)
    }
    e.target.value = ""
  }

  const handleEdit = msg => setEditingMsg(msg)
  const handleSaveEdit = async newText => {
    if (editingMsg) await editMessage(editingMsg.messageId, newText)
    setEditingMsg(null)
  }
  const handleDeleteMsg = async msgId => { await deleteMessage(msgId) }
  const handleDeleteConv = async () => {
    await hideConversation()
    onConversationDeleted()
  }

  const grouped = []
  let lastDay = ""
  messages.forEach(m => {
    const day = m.timestamp ? m.timestamp.slice(0,10) : ""
    if (day && day !== lastDay) { grouped.push({ type:"sep", day }); lastDay = day }
    grouped.push({ type:"msg", msg:m })
  })

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-border bg-white px-4 py-3">
        <button type="button" onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-ink-2">
          <i className="bi bi-arrow-left text-[13px]" />
        </button>
        {isGeneral
          ? <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-navy text-white">
              <i className="bi bi-people-fill text-[15px]" />
            </div>
          : <Avatar name={conversationName} size={40} />
        }
        <div className="flex-1 min-w-0">
          <div className="truncate text-[14.5px] font-bold text-ink">{conversationName}</div>
          <div className="text-[10.5px] text-ink-4">{isGeneral ? "Everyone at MSO Station" : "Direct message"}</div>
        </div>
        {!isGeneral && (
          <button type="button" onClick={() => setShowDeleteConv(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-ink-4">
            <i className="bi bi-trash text-[12px]" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ background:"#F0F4F8" }}>
        {status === "loading" && (
          <div className="flex justify-center py-10">
            <span className="h-5 w-5 animate-spin-fast rounded-full border-2 border-cyan/20 border-t-cyan" />
          </div>
        )}
        {status === "ready" && messages.length === 0 && (
          <div className="mx-auto mt-10 max-w-[260px] rounded-[16px] bg-white p-5 text-center shadow-sm">
            <div className="mb-2 text-2xl">{isGeneral ? "👋" : "💬"}</div>
            <div className="text-[13px] font-bold text-ink">
              {isGeneral ? "Welcome to General" : `Chat with ${conversationName}`}
            </div>
            <div className="mt-1 text-[11.5px] text-ink-4">
              {isGeneral ? "Station-wide group — everyone can see messages here." : "This is a private conversation."}
            </div>
          </div>
        )}
        <div className="flex flex-col gap-2">
          {grouped.map((item, i) => item.type === "sep"
            ? <DateSep key={`sep-${item.day}`} iso={item.day} />
            : <Bubble key={item.msg.messageId || i} msg={item.msg}
                isMine={item.msg.senderUsername === auth.username}
                onEdit={handleEdit} onDelete={handleDeleteMsg} />
          )}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="flex-shrink-0 border-t border-border bg-white px-3 py-2.5"
        style={{ paddingBottom:"max(10px, env(safe-area-inset-bottom))" }}>
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        <div className="flex items-end gap-2">
          {/* Image button */}
          <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploading}
            className="mb-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-border bg-surface text-ink-4 disabled:opacity-50">
            {uploading
              ? <span className="h-3.5 w-3.5 animate-spin-fast rounded-full border-2 border-cyan/20 border-t-cyan" />
              : <i className="bi bi-image text-[14px]" />
            }
          </button>
          {/* Text input */}
          <div className="flex flex-1 items-end rounded-[16px] border border-border bg-surface px-3.5 py-2">
            <textarea ref={inputRef} rows={1} value={draft}
              onChange={e => setDraft(e.target.value)} onKeyDown={handleKey}
              placeholder="Type a message…"
              className="max-h-28 flex-1 resize-none bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-4"
              style={{ lineHeight:"1.5" }} />
          </div>
          {/* Send button */}
          <button type="button" onClick={handleSend}
            disabled={!draft.trim() || sending}
            className="mb-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-navy text-white disabled:opacity-30">
            <i className="bi bi-send-fill text-[12px]" />
          </button>
        </div>
      </div>

      {/* Edit modal */}
      {editingMsg && (
        <EditModal message={editingMsg} onSave={handleSaveEdit} onClose={() => setEditingMsg(null)} />
      )}

      {/* Delete conversation confirm */}
      {showDeleteConv && (
        <div className="fixed inset-0 z-[600] flex items-end justify-center bg-black/30 p-4"
          onClick={() => setShowDeleteConv(false)}>
          <div className="w-full max-w-sm overflow-hidden rounded-[16px] bg-white shadow-xl"
            onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4">
              <div className="mb-1 text-[15px] font-bold text-ink">Delete this chat?</div>
              <div className="text-[12.5px] text-ink-4">This will clear the conversation from your view only. {conversationName} will still have the messages.</div>
            </div>
            <div className="flex gap-2.5 border-t border-surface px-4 pb-5">
              <button type="button" onClick={() => setShowDeleteConv(false)}
                className="flex-1 rounded-[9px] border border-border py-2.5 text-[13px] font-semibold text-ink-4">
                Cancel
              </button>
              <button type="button" onClick={() => { setShowDeleteConv(false); handleDeleteConv() }}
                className="flex-1 rounded-[9px] bg-red py-2.5 text-[13px] font-bold text-white">
                Delete for me
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Inbox panel ─────────────────────────────────────────── */
function InboxPanel({ auth, conversations, convStatus, staff, activeConvId, onSelect, navigate }) {
  const existingDMPartners = new Set(
    conversations.filter(c => c.type === "dm").map(c => c.otherUsername)
  )
  const freshStaff = staff.filter(s => s.username !== auth.username && !existingDMPartners.has(s.username))

  const startDM = s => onSelect({ conversationId: dmConversationId(auth.username, s.username), name: s.name, isGeneral: false })

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border px-4 pb-3 pt-4" style={{ paddingTop:"max(16px,var(--sat))" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-navy">
              <span className="text-[11px] font-extrabold text-white">MSO</span>
            </div>
            <div>
              <div className="text-[15px] font-extrabold text-ink">Staff Chat</div>
              <div className="text-[10px] text-ink-4">{auth.name}</div>
            </div>
          </div>
          <button type="button"
            onClick={() => navigate(dashboardPathFor({ role: auth.role, station: auth.station }))}
            className="flex h-8 items-center gap-1.5 rounded-[8px] border border-border bg-surface px-2.5 text-[11px] font-semibold text-ink-2">
            <i className="bi bi-grid text-[11px]" /> Dashboard
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* General */}
        {(() => {
          const general = conversations.find(c => c.conversationId === "general")
          return (
            <button type="button"
              onClick={() => onSelect({ conversationId:"general", name:"General", isGeneral:true })}
              className={`flex w-full items-center gap-3 border-b border-surface px-4 py-3.5 text-left ${activeConvId === "general" ? "bg-cyan-light" : "active:bg-surface"}`}>
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-navy text-white">
                <i className="bi bi-people-fill text-[16px]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-[13.5px] font-bold text-ink">General</span>
                  {general?.lastTimestamp && <span className="text-[10px] text-ink-4">{timeLabel(general.lastTimestamp)}</span>}
                </div>
                <div className="truncate text-[11.5px] text-ink-4">{general?.lastText || "Station-wide group · Everyone"}</div>
              </div>
            </button>
          )
        })()}

        {/* Existing DMs */}
        {conversations.filter(c => c.type === "dm").map(conv => (
          <button key={conv.conversationId} type="button"
            onClick={() => onSelect({ conversationId:conv.conversationId, name:conv.name, isGeneral:false })}
            className={`flex w-full items-center gap-3 border-b border-surface px-4 py-3 text-left ${activeConvId === conv.conversationId ? "bg-cyan-light" : "active:bg-surface"}`}>
            <Avatar name={conv.name} size={42} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-1">
                <span className="truncate text-[13.5px] font-bold text-ink">{conv.name}</span>
                {conv.lastTimestamp && <span className="text-[10px] text-ink-4">{timeLabel(conv.lastTimestamp)}</span>}
              </div>
              <div className="truncate text-[11.5px] text-ink-4">{conv.lastText || "Tap to chat"}</div>
            </div>
          </button>
        ))}

        {/* People to message */}
        {freshStaff.length > 0 && (
          <>
            <div className="px-4 pb-1.5 pt-4 text-[10px] font-bold uppercase tracking-[1px] text-ink-4">People</div>
            {freshStaff.map(s => (
              <button key={s.username} type="button" onClick={() => startDM(s)}
                className="flex w-full items-center gap-3 border-b border-surface px-4 py-3 text-left active:bg-surface">
                <Avatar name={s.name} size={42} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-bold text-ink">{s.name}</div>
                  <div className="text-[11px] text-ink-4 capitalize">{s.role}</div>
                </div>
                <span className="rounded-full bg-cyan-light px-2.5 py-1 text-[10.5px] font-bold text-cyan-dark">Message</span>
              </button>
            ))}
          </>
        )}

        {convStatus === "loading" && (
          <div className="flex justify-center py-8">
            <span className="h-5 w-5 animate-spin-fast rounded-full border-2 border-cyan/20 border-t-cyan" />
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────── */
export default function ChatPage() {
  const auth = useAuth({ requireAuth: true })
  const navigate = useNavigate()
  const { status: convStatus, conversations, refresh } = useConversations({ username: auth.username })
  const { staff } = useStaff()
  const [activeConv, setActiveConv] = useState(null)
  usePageTitle("Chat — MSO Limpid")

  useEffect(() => {
    if (convStatus === "ready" && !activeConv && window.innerWidth >= 768) {
      setActiveConv({ conversationId:"general", name:"General", isGeneral:true })
    }
  }, [convStatus, activeConv])

  if (auth.loading || !auth.user) return <div className="min-h-screen bg-pagebg" />

  const handleSelect = conv => { setActiveConv(conv); refresh() }
  const handleConversationDeleted = () => { setActiveConv(null); refresh() }
  const mobileShowChat = Boolean(activeConv)

  return (
    <div className="flex overflow-hidden bg-pagebg" style={{ height:"100dvh" }}>
      <SafeAreaDebug />
      {/* Inbox */}
      <div className={`flex-shrink-0 border-r border-border md:w-[300px] ${mobileShowChat ? "hidden md:flex md:flex-col" : "flex w-full flex-col"}`}
        style={{ height:"100dvh" }}>
        <InboxPanel auth={auth} conversations={conversations} convStatus={convStatus}
          staff={staff} activeConvId={activeConv?.conversationId}
          onSelect={handleSelect} navigate={navigate} />
      </div>
      {/* Chat window */}
      <div className={`flex-1 flex-col ${mobileShowChat ? "flex" : "hidden md:flex"}`} style={{ height:"100dvh" }}>
        {activeConv
          ? <ConversationView auth={auth} conversationId={activeConv.conversationId}
              conversationName={activeConv.name} isGeneral={activeConv.isGeneral}
              onBack={() => setActiveConv(null)} onConversationDeleted={handleConversationDeleted} />
          : <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-white text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-navy text-white">
                <span className="text-[18px] font-extrabold">MSO</span>
              </div>
              <div className="text-[15px] font-bold text-ink">Staff Chat</div>
              <div className="text-[12.5px] text-ink-4">Select a conversation or tap a person to message</div>
            </div>
        }
      </div>
    </div>
  )
}
