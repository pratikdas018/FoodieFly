import React from "react"
import { useNavigate } from "react-router-dom"
import OrderChat from "./OrderChat"
import axios from "axios"
import { serverUrl, showAppPopup } from "../App"

function DeliveryBoyOrderCard({ data }) {
  const navigate = useNavigate()

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    })
  }

  const handleRaiseDispute = async () => {
    const reason = window.prompt("Enter dispute reason")
    if (!reason || reason.trim().length < 3) return
    const description = window.prompt("Enter dispute details (optional)") || ""
    try {
      await axios.post(`${serverUrl}/api/order/raise-dispute`, {
        orderId: data._id,
        shopOrderId: data.shopOrder?._id,
        reason,
        description,
        priority: "medium"
      }, { withCredentials: true })
      showAppPopup({
        title: "Dispute Raised",
        message: "Your dispute has been sent to admin.",
        type: "success"
      })
    } catch (error) {
      showAppPopup({
        title: "Dispute Failed",
        message: error?.response?.data?.message || "Unable to raise dispute right now.",
        type: "info"
      })
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <div className="flex justify-between border-b pb-2">
        <div>
          <p className="font-semibold">order #{String(data._id).slice(-6)}</p>
          <p className="text-sm text-gray-500">Date: {formatDate(data.createdAt)}</p>
          {data.scheduleType !== "now" && (
            <p className="text-sm text-blue-600 mt-1">
              Scheduled: {data.scheduleType} ({new Date(data.scheduledFor).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })})
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">{data.paymentMethod?.toUpperCase()}</p>
          <p className="font-medium text-blue-600 capitalize">{data.shopOrder?.status}</p>
        </div>
      </div>

      <div className="space-y-1 text-sm text-gray-700">
        <p><span className="font-semibold">Customer:</span> {data.user?.fullName}</p>
        <p><span className="font-semibold">Contact:</span> {data.user?.mobile}</p>
        <p><span className="font-semibold">Shop:</span> {data.shopOrder?.shop?.name}</p>
        <p><span className="font-semibold">Delivery Address:</span> {data.deliveryAddress?.text}</p>
      </div>

      <div className="flex space-x-4 overflow-x-auto pb-2">
        {data.shopOrder?.shopOrderItems?.map((item, index) => (
          <div key={index} className="flex-shrink-0 w-40 border rounded-lg p-2 bg-white">
            <img src={item.item?.image} alt="" className="w-full h-24 object-cover rounded" />
            <p className="text-sm font-semibold mt-1">{item.name}</p>
            <p className="text-xs text-gray-500">Qty: {item.quantity} x INR {item.price}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center border-t pt-2">
        <p className="font-semibold">Subtotal: INR {data.shopOrder?.subtotal}</p>
        <div className="flex items-center gap-2">
          <button className="text-xs px-3 py-1 rounded-md border border-[#ff4d2d] text-[#ff4d2d]" onClick={handleRaiseDispute}>
            Raise Dispute
          </button>
          <button className="bg-[#ff4d2d] hover:bg-[#e64526] text-white px-4 py-2 rounded-lg text-sm" onClick={() => navigate(`/track-order/${data._id}`)}>
            Track Order
          </button>
        </div>
      </div>

      <OrderChat orderId={data._id} shopOrderId={data.shopOrder?._id} title="Chat with Customer & Owner" />
    </div>
  )
}

export default DeliveryBoyOrderCard
