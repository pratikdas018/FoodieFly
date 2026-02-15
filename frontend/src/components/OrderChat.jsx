import axios from "axios"
import React, { useEffect, useMemo, useRef, useState } from "react"
import { useSelector } from "react-redux"
import { serverUrl } from "../App"

const QUICK_REPLIES = ["Reached", "5 mins", "On my way", "Preparing", "Delivered"]

function OrderChat({ orderId, shopOrderId, title = "Order Chat" }) {
  const { socket, userData } = useSelector((state) => state.user)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const messageEndRef = useRef(null)

  const canUseChat = useMemo(() => Boolean(orderId && shopOrderId && userData?._id), [orderId, shopOrderId, userData?._id])

  const appendUniqueMessage = (message) => {
    setMessages((prev) => {
      if (prev.some((m) => String(m._id) === String(message._id))) return prev
      return [...prev, message]
    })
  }

  const fetchMessages = async () => {
    if (!canUseChat) return
    try {
      const result = await axios.get(`${serverUrl}/api/order/chat/${orderId}/${shopOrderId}`, { withCredentials: true })
      setMessages(result.data || [])
    } catch (error) {
      console.log(error)
    }
  }

  const sendMessage = async (messageText, quickReply = false) => {
    const trimmed = String(messageText || "").trim()
    if (!trimmed || !canUseChat || loading) return
    setLoading(true)
    try {
      const result = await axios.post(`${serverUrl}/api/order/chat/send`, {
        orderId,
        shopOrderId,
        text: trimmed,
        quickReply
      }, { withCredentials: true })
      appendUniqueMessage(result.data)
      setText("")
    } catch (error) {
      console.log(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages()
  }, [orderId, shopOrderId, canUseChat])

  useEffect(() => {
    if (!socket) return
    const onChatMessage = (payload) => {
      if (String(payload?.orderId) !== String(orderId)) return
      if (String(payload?.shopOrderId) !== String(shopOrderId)) return
      if (!payload?.message) return
      appendUniqueMessage(payload.message)
    }
    socket.on("chat-message", onChatMessage)
    return () => {
      socket.off("chat-message", onChatMessage)
    }
  }, [socket, orderId, shopOrderId])

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="mt-4 border border-orange-100 rounded-xl bg-white">
      <div className="px-4 py-3 border-b border-orange-100">
        <h3 className="text-sm font-semibold text-[#ff4d2d]">{title}</h3>
      </div>

      <div className="max-h-[220px] overflow-y-auto p-3 space-y-2 bg-[#fffaf7]">
        {messages.length === 0 && <p className="text-sm text-gray-500 text-center py-2">No messages yet.</p>}
        {messages.map((message) => {
          const isMine = String(message.sender) === String(userData?._id)
          return (
            <div key={message._id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`${isMine ? "bg-[#ff4d2d] text-white" : "bg-white text-gray-800"} max-w-[82%] rounded-lg px-3 py-2 shadow-sm`}>
                <p className="text-xs font-semibold opacity-90">{message.senderName}</p>
                <p className="text-sm">{message.text}</p>
                <p className={`text-[10px] mt-1 ${isMine ? "text-orange-100" : "text-gray-400"}`}>
                  {new Date(message.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={messageEndRef} />
      </div>

      <div className="px-3 py-2 border-t border-orange-100 flex flex-wrap gap-2">
        {QUICK_REPLIES.map((quick) => (
          <button key={quick} className="text-xs px-2 py-1 rounded-full border border-[#ff4d2d] text-[#ff4d2d] hover:bg-orange-50" onClick={() => sendMessage(quick, true)}>
            {quick}
          </button>
        ))}
      </div>

      <div className="p-3 border-t border-orange-100 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage(text)
          }}
          placeholder="Type a message..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff4d2d]"
        />
        <button className="bg-[#ff4d2d] text-white px-4 rounded-lg text-sm disabled:opacity-60" onClick={() => sendMessage(text)} disabled={loading}>
          Send
        </button>
      </div>
    </div>
  )
}

export default OrderChat
