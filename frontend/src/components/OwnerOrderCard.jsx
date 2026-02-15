import axios from "axios"
import React, { useState } from "react"
import { MdPhone } from "react-icons/md"
import { serverUrl, showAppPopup } from "../App"
import { useDispatch } from "react-redux"
import { updateOrderStatus } from "../redux/userSlice"
import OrderChat from "./OrderChat"

function OwnerOrderCard({ data }) {
    const [availableBoys, setAvailableBoys] = useState([])
    const dispatch = useDispatch()

    const handleUpdateStatus = async (orderId, shopId, status) => {
        try {
            const result = await axios.post(`${serverUrl}/api/order/update-status/${orderId}/${shopId}`, { status }, { withCredentials: true })
            dispatch(updateOrderStatus({ orderId, shopId, status }))
            setAvailableBoys(result.data.availableBoys)
        } catch (error) {
            console.log(error)
        }
    }

    const handleRaiseDispute = async () => {
        const reason = window.prompt("Enter dispute reason")
        if (!reason || reason.trim().length < 3) return
        const description = window.prompt("Enter dispute details (optional)") || ""
        try {
            await axios.post(`${serverUrl}/api/order/raise-dispute`, {
                orderId: data._id,
                shopOrderId: data.shopOrders?._id,
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
            <div>
                <h2 className="text-lg font-semibold text-gray-800">{data.user.fullName}</h2>
                <p className="text-sm text-gray-500">{data.user.email}</p>
                <p className="flex items-center gap-2 text-sm text-gray-600 mt-1"><MdPhone /><span>{data.user.mobile}</span></p>
                {data.paymentMethod == "online" ? <p className="text-sm text-gray-600">payment: {data.payment ? "true" : "false"}</p> : <p className="text-sm text-gray-600">Payment Method: {data.paymentMethod}</p>}
                {data.scheduleType !== "now" && (
                    <p className="text-sm text-blue-600 mt-1">
                        Scheduled: {data.scheduleType} ({new Date(data.scheduledFor).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })})
                    </p>
                )}
            </div>

            <div className="flex items-start flex-col gap-2 text-gray-600 text-sm">
                <p>{data?.deliveryAddress?.text}</p>
                <p className="text-xs text-gray-500">Lat: {data?.deliveryAddress.latitude} , Lon {data?.deliveryAddress.longitude}</p>
            </div>

            <div className="flex space-x-4 overflow-x-auto pb-2">
                {data.shopOrders.shopOrderItems.map((item, index) => (
                    <div key={index} className="flex-shrink-0 w-40 border rounded-lg p-2 bg-white">
                        <img src={item.item.image} alt="" className="w-full h-24 object-cover rounded" />
                        <p className="text-sm font-semibold mt-1">{item.name}</p>
                        <p className="text-xs text-gray-500">Qty: {item.quantity} x INR {item.price}</p>
                    </div>
                ))}
            </div>

            <div className="flex justify-between items-center mt-auto pt-3 border-t border-gray-100">
                <span className="text-sm">status: <span className="font-semibold capitalize text-[#ff4d2d]">{data.shopOrders.status}</span></span>
                <select className="rounded-md border px-3 py-1 text-sm focus:outline-none focus:ring-2 border-[#ff4d2d] text-[#ff4d2d]" onChange={(e) => handleUpdateStatus(data._id, data.shopOrders.shop._id, e.target.value)}>
                    <option value="">Change</option>
                    <option value="pending">Pending</option>
                    <option value="preparing">Preparing</option>
                    <option value="out of delivery">Out Of Delivery</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>

            {data.shopOrders.status == "out of delivery" &&
                <div className="mt-3 p-2 border rounded-lg text-sm bg-orange-50 gap-4">
                    {data.shopOrders.assignedDeliveryBoy ? <p>Assigned Delivery Boy:</p> : <p>Available Delivery Boys:</p>}
                    {availableBoys?.length > 0 ? (
                        availableBoys.map((b) => (
                            <div className="text-gray-800" key={b.id}>{b.fullName}-{b.mobile}</div>
                        ))
                    ) : data.shopOrders.assignedDeliveryBoy ? <div>{data.shopOrders.assignedDeliveryBoy.fullName}-{data.shopOrders.assignedDeliveryBoy.mobile}</div> : <div>Waiting for delivery boy to accept</div>}
                </div>}

            <div className="text-right font-bold text-gray-800 text-sm">
                Total: INR {data.shopOrders.subtotal}
            </div>

            <div className="text-right">
                <button className="text-xs px-3 py-1 rounded-md border border-[#ff4d2d] text-[#ff4d2d]" onClick={handleRaiseDispute}>
                    Raise Dispute
                </button>
            </div>

            <OrderChat orderId={data._id} shopOrderId={data.shopOrders._id} title="Chat with Customer & Delivery Partner" />
        </div>
    )
}

export default OwnerOrderCard
