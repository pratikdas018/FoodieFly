import axios from "axios"
import React, { useState } from "react"
import { useDispatch } from "react-redux"
import { useNavigate } from "react-router-dom"
import { serverUrl, showAppPopup } from "../App"
import OrderChat from "./OrderChat"
import { setCartItems } from "../redux/userSlice"

function UserOrderCard({ data }) {
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const [selectedRating, setSelectedRating] = useState({})

    const formatDate = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        })
    }

    const handleRating = async (itemId, rating) => {
        try {
            await axios.post(`${serverUrl}/api/item/rating`, { itemId, rating }, { withCredentials: true })
            setSelectedRating((prev) => ({
                ...prev, [itemId]: rating
            }))
        } catch (error) {
            console.log(error)
        }
    }

    const handleReorder = () => {
        const reorderItems = []
        ;(data.shopOrders || []).forEach((shopOrder) => {
            ;(shopOrder.shopOrderItems || []).forEach((orderItem) => {
                const itemDoc = orderItem.item
                const itemId = itemDoc?._id || orderItem.item
                if (!itemId) return
                reorderItems.push({
                    id: itemId,
                    name: orderItem.name || itemDoc?.name || "Item",
                    price: Number(orderItem.price || itemDoc?.price || 0),
                    image: itemDoc?.image || "",
                    shop: shopOrder.shop?._id || shopOrder.shop,
                    quantity: Number(orderItem.quantity || 1),
                    foodType: itemDoc?.foodType || "veg"
                })
            })
        })
        if (reorderItems.length === 0) return
        dispatch(setCartItems(reorderItems))
        navigate("/cart")
    }

    const handleRaiseDispute = async (shopOrderId) => {
        const reason = window.prompt("Enter dispute reason")
        if (!reason || reason.trim().length < 3) return
        const description = window.prompt("Enter dispute details (optional)") || ""
        try {
            await axios.post(`${serverUrl}/api/order/raise-dispute`, {
                orderId: data._id,
                shopOrderId,
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
                    <p className="font-semibold">order #{data._id.slice(-6)}</p>
                    <p className="text-sm text-gray-500">Date: {formatDate(data.createdAt)}</p>
                    {data.scheduleType !== "now" && (
                        <p className="text-sm text-blue-600 mt-1">
                            Scheduled: {data.scheduleType} ({new Date(data.scheduledFor).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })})
                        </p>
                    )}
                </div>
                <div className="text-right">
                    {data.paymentMethod == "cod" ? <p className="text-sm text-gray-500">{data.paymentMethod?.toUpperCase()}</p> : <p className="text-sm text-gray-500 font-semibold">Payment: {data.payment ? "true" : "false"}</p>}
                    <p className="font-medium text-blue-600">{data.shopOrders?.[0].status}</p>
                </div>
            </div>

            {data.shopOrders.map((shopOrder, index) => (
                <div className="border rounded-lg p-3 bg-[#fffaf7] space-y-3" key={index}>
                    <p>{shopOrder.shop.name}</p>

                    <div className="flex space-x-4 overflow-x-auto pb-2">
                        {shopOrder.shopOrderItems.map((item, itemIndex) => (
                            <div key={itemIndex} className="flex-shrink-0 w-40 border rounded-lg p-2 bg-white">
                                <img src={item.item.image} alt="" className="w-full h-24 object-cover rounded" />
                                <p className="text-sm font-semibold mt-1">{item.name}</p>
                                <p className="text-xs text-gray-500">Qty: {item.quantity} x INR {item.price}</p>

                                {shopOrder.status == "delivered" && <div className="flex space-x-1 mt-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button key={star} className={`text-lg ${selectedRating[item.item._id] >= star ? "text-yellow-400" : "text-gray-400"}`} onClick={() => handleRating(item.item._id, star)}>★</button>
                                    ))}
                                </div>}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between items-center border-t pt-2">
                        <p className="font-semibold">Subtotal: {shopOrder.subtotal}</p>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-blue-600">{shopOrder.status}</span>
                            <button className="text-xs px-2 py-1 rounded-md border border-[#ff4d2d] text-[#ff4d2d]" onClick={() => handleRaiseDispute(shopOrder._id)}>
                                Raise Dispute
                            </button>
                        </div>
                    </div>
                    <OrderChat orderId={data._id} shopOrderId={shopOrder._id} title="Chat with Owner & Delivery Partner" />
                </div>
            ))}

            <div className="flex justify-between items-center border-t pt-2">
                <p className="font-semibold">Total: INR {data.totalAmount}</p>
                <div className="flex items-center gap-2">
                    <button className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm" onClick={handleReorder}>Reorder</button>
                    <button className="bg-[#ff4d2d] hover:bg-[#e64526] text-white px-4 py-2 rounded-lg text-sm" onClick={() => navigate(`/track-order/${data._id}`)}>Track Order</button>
                </div>
            </div>
        </div>
    )
}

export default UserOrderCard
