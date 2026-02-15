import axios from 'axios'
import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { serverUrl } from '../App'
import { useEffect } from 'react'
import { useState } from 'react'
import { IoIosArrowRoundBack } from "react-icons/io";
import DeliveryBoyTracking from '../components/DeliveryBoyTracking'
import { useSelector } from 'react-redux'
import OrderChat from '../components/OrderChat'

const getDistanceKm = (pointA, pointB) => {
    if (pointA?.lat == null || pointA?.lon == null || pointB?.lat == null || pointB?.lon == null) return null
    const toRad = (deg) => (deg * Math.PI) / 180
    const earthRadiusKm = 6371
    const dLat = toRad(pointB.lat - pointA.lat)
    const dLon = toRad(pointB.lon - pointA.lon)
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(pointA.lat)) * Math.cos(toRad(pointB.lat)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return earthRadiusKm * c
}
function TrackOrderPage() {
    const { orderId } = useParams()
    const [currentOrder, setCurrentOrder] = useState() 
    const navigate = useNavigate()
    const {socket}=useSelector(state=>state.user)
    const [liveLocations,setLiveLocations]=useState({})
    const handleGetOrder = async () => {
        try {
            const result = await axios.get(`${serverUrl}/api/order/get-order-by-id/${orderId}`, { withCredentials: true })
            setCurrentOrder(result.data)
        } catch (error) {
            console.log(error)
        }
    }

    useEffect(()=>{
        if(!socket) return
        const handleDeliveryLocation=({deliveryBoyId,latitude,longitude})=>{
            setLiveLocations(prev=>({
              ...prev,
              [deliveryBoyId]:{lat:latitude,lon:longitude}
            }))
        }
        socket.on('updateDeliveryLocation',handleDeliveryLocation)
        return ()=>{
            socket.off('updateDeliveryLocation',handleDeliveryLocation)
        }
    },[socket])

    useEffect(() => {
        handleGetOrder()
    }, [orderId])
    return (
        <div className='max-w-4xl mx-auto p-4 flex flex-col gap-6'>
            <div className='relative flex items-center gap-4 top-[20px] left-[20px] z-[10] mb-[10px]' onClick={() => navigate("/")}>
                <IoIosArrowRoundBack size={35} className='text-[#ff4d2d]' />
                <h1 className='text-2xl font-bold md:text-center'>Track Order</h1>
            </div>
      {currentOrder?.shopOrders?.map((shopOrder,index)=>(
        <div className='bg-white p-4 rounded-2xl shadow-md border border-orange-100 space-y-4' key={index}>
         {(() => {
            const deliveryBoyLocation = (shopOrder.assignedDeliveryBoy && liveLocations[shopOrder.assignedDeliveryBoy._id]) || (shopOrder.assignedDeliveryBoy ? {
                lat: shopOrder.assignedDeliveryBoy.location.coordinates[1],
                lon: shopOrder.assignedDeliveryBoy.location.coordinates[0]
            } : null)
            const customerLocation = {
                lat: Number(currentOrder.deliveryAddress?.latitude),
                lon: Number(currentOrder.deliveryAddress?.longitude)
            }
            const distanceKm = getDistanceKm(deliveryBoyLocation, customerLocation)
            const etaMinutes = distanceKm ? Math.max(1, Math.round((distanceKm / 25) * 60)) : null
            return (
              <>
         <div>
            <p className='text-lg font-bold mb-2 text-[#ff4d2d]'>{shopOrder.shop.name}</p>
            <p className='font-semibold'><span>Items:</span> {shopOrder.shopOrderItems?.map(i=>i.name).join(",")}</p>
            <p><span className='font-semibold'>Subtotal:</span> {shopOrder.subtotal}</p>
            <p className='mt-6'><span className='font-semibold'>Delivery address:</span> {currentOrder.deliveryAddress?.text}</p>
            {currentOrder.scheduleType !== "now" && <p className='text-sm text-blue-600 mt-1'><span className='font-semibold'>Scheduled:</span> {currentOrder.scheduleType} ({new Date(currentOrder.scheduledFor).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })})</p>}
         </div>
         {shopOrder.status!="delivered"?<>
{shopOrder.assignedDeliveryBoy?
<div className='text-sm text-gray-700'>
<p className='font-semibold'><span>Delivery Boy Name:</span> {shopOrder.assignedDeliveryBoy.fullName}</p>
<p className='font-semibold'><span>Delivery Boy contact No.:</span> {shopOrder.assignedDeliveryBoy.mobile}</p>
{distanceKm !== null && <p className='font-semibold'><span>Distance:</span> {distanceKm.toFixed(2)} km</p>}
{etaMinutes !== null && <p className='font-semibold'><span>ETA:</span> {etaMinutes} mins</p>}
</div>:<p className='font-semibold'>Delivery Boy is not assigned yet.</p>}
         </>:<p className='text-green-600 font-semibold text-lg'>Delivered</p>}

{(shopOrder.assignedDeliveryBoy && shopOrder.status !== "delivered") && (
  <div className="h-[400px] w-full rounded-2xl overflow-hidden shadow-md">
    <DeliveryBoyTracking data={{
      deliveryBoyLocation,
      customerLocation
    }} />
  </div>
)}

<OrderChat orderId={currentOrder._id} shopOrderId={shopOrder._id} title="Chat with Owner & Delivery Partner" />
              </>
            )
         })()}

        </div>
      ))}



        </div>
    )
}

export default TrackOrderPage
