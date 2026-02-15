import React from 'react'
import Nav from './Nav'
import { useSelector } from 'react-redux'
import axios from 'axios'
import { serverUrl } from '../App'
import { useEffect } from 'react'
import { useState } from 'react'
import DeliveryBoyTracking from './DeliveryBoyTracking'
import { ClipLoader } from 'react-spinners'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import OrderChat from './OrderChat'
import { useLocation } from 'react-router-dom'
import { useRef } from 'react'

function DeliveryBoy() {
  const { userData, socket } = useSelector(state => state.user)
  const routeLocation = useLocation()
  const availableOrdersRef = useRef(null)
  const [currentOrder, setCurrentOrder] = useState()
  const [showOtpBox, setShowOtpBox] = useState(false)
  const [availableAssignments, setAvailableAssignments] = useState(null)
  const [otp, setOtp] = useState("")
  const [todayDeliveries, setTodayDeliveries] = useState([])
  const [earningsPanel, setEarningsPanel] = useState(null)
  const [earningsDays, setEarningsDays] = useState(7)
  const [deliveryBoyLocation, setDeliveryBoyLocation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const formatMoney = (value) => `INR ${Number(value || 0).toFixed(0)}`
  const formatDay = (value) => {
    if (!value) return "-"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
  }

  useEffect(() => {
    if (!socket || userData?.role !== "deliveryBoy") return
    let watchId
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const latitude = position.coords.latitude
          const longitude = position.coords.longitude
          setDeliveryBoyLocation({ lat: latitude, lon: longitude })
          socket.emit('updateLocation', {
            latitude,
            longitude,
            userId: userData._id
          })
        },
        (error) => {
          console.log(error)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      )
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId)
    }
  }, [socket, userData?._id, userData?.role])

  const ratePerDelivery = 50
  const fallbackEarning = todayDeliveries.reduce((sum, d) => sum + (Number(d.count) || 0) * ratePerDelivery, 0)
  const todaysPayout = earningsPanel?.today?.totalPayout ?? fallbackEarning
  const todaysTrips = earningsPanel?.today?.completedTrips ?? todayDeliveries.reduce((sum, d) => sum + (Number(d.count) || 0), 0)
  const todaysIncentive = earningsPanel?.today?.incentive ?? 0

  const getAssignments = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/order/get-assignments`, { withCredentials: true })
      setAvailableAssignments(result.data)
    } catch (error) {
      console.log(error)
    }
  }

  const getCurrentOrder = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/order/get-current-order`, { withCredentials: true })
      setCurrentOrder(result.data)
    } catch (error) {
      setCurrentOrder(null)
    }
  }

  const handleTodayDeliveries = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/order/get-today-deliveries`, { withCredentials: true })
      setTodayDeliveries(result.data)
    } catch (error) {
      console.log(error)
    }
  }

  const handleDeliveryEarningsPanel = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/order/delivery-earnings-panel?days=${earningsDays}`, { withCredentials: true })
      setEarningsPanel(result.data)
    } catch (error) {
      console.log(error)
    }
  }

  const acceptOrder = async (assignmentId) => {
    try {
      await axios.get(`${serverUrl}/api/order/accept-order/${assignmentId}`, { withCredentials: true })
      setAvailableAssignments(prev => (prev || []).filter((assignment) => assignment.assignmentId !== assignmentId))
      await Promise.all([getCurrentOrder(), handleDeliveryEarningsPanel()])
    } catch (error) {
      console.log(error)
    }
  }

  const rejectOrder = async (assignmentId) => {
    try {
      await axios.post(`${serverUrl}/api/order/reject-order/${assignmentId}`, {}, { withCredentials: true })
      setAvailableAssignments(prev => (prev || []).filter((assignment) => assignment.assignmentId !== assignmentId))
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    if (!socket) return
    socket.on('newAssignment', (data) => {
      setAvailableAssignments(prev => ([...(prev || []), data]))
    })
    return () => {
      socket.off('newAssignment')
    }
  }, [socket])

  const sendOtp = async () => {
    if (!currentOrder?._id || !currentOrder?.shopOrder?._id) return
    setLoading(true)
    try {
      await axios.post(`${serverUrl}/api/order/send-delivery-otp`, {
        orderId: currentOrder._id, shopOrderId: currentOrder.shopOrder._id
      }, { withCredentials: true })
      setShowOtpBox(true)
    } catch (error) {
      console.log(error)
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    if (!currentOrder?._id || !currentOrder?.shopOrder?._id || !otp) return
    setMessage("")
    try {
      const result = await axios.post(`${serverUrl}/api/order/verify-delivery-otp`, {
        orderId: currentOrder._id, shopOrderId: currentOrder.shopOrder._id, otp
      }, { withCredentials: true })
      setMessage(result.data.message)
      setShowOtpBox(false)
      setOtp("")
      setCurrentOrder(null)
      await Promise.all([
        getAssignments(),
        getCurrentOrder(),
        handleTodayDeliveries(),
        handleDeliveryEarningsPanel()
      ])
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    if (!userData?._id || userData?.role !== "deliveryBoy") return
    getAssignments()
    getCurrentOrder()
    handleTodayDeliveries()
    handleDeliveryEarningsPanel()
  }, [userData?._id])

  useEffect(() => {
    if (!userData?._id) return
    handleDeliveryEarningsPanel()
  }, [earningsDays])

  useEffect(() => {
    const params = new URLSearchParams(routeLocation.search)
    if (params.get("focus") === "available-orders") {
      getAssignments()
      setTimeout(() => {
        availableOrdersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 120)
    }
  }, [routeLocation.search])

  return (
    <div className='w-screen min-h-screen flex flex-col gap-5 items-center bg-[#fff9f6] overflow-y-auto'>
      <Nav />
      <div className='w-full max-w-[900px] flex flex-col gap-5 items-center'>
        <div className='bg-white rounded-2xl shadow-md p-5 flex flex-col justify-start items-center w-[90%] border border-orange-100 text-center gap-2'>
          <h1 className='text-xl font-bold text-[#ff4d2d]'>Welcome, {userData.fullName}</h1>
          <p className='text-[#ff4d2d] '><span className='font-semibold'>Latitude:</span> {deliveryBoyLocation?.lat}, <span className='font-semibold'>Longitude:</span> {deliveryBoyLocation?.lon}</p>
        </div>

        <div className='bg-white rounded-2xl shadow-md p-5 w-[90%] border border-orange-100'>
          <div className='flex flex-wrap items-center justify-between gap-3 mb-4'>
            <h1 className='text-lg font-bold text-[#ff4d2d]'>Delivery Boy Earnings Panel</h1>
            <div className='flex items-center gap-2'>
              {[7, 14, 30].map((day) => (
                <button key={day} className={`px-3 py-1 rounded-full text-xs font-semibold border ${earningsDays === day ? "bg-[#ff4d2d] text-white border-[#ff4d2d]" : "bg-white text-[#ff4d2d] border-orange-200"}`} onClick={() => setEarningsDays(day)}>
                  {day}D
                </button>
              ))}
            </div>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4'>
            <div className='rounded-xl border border-green-100 bg-green-50 p-4'>
              <p className='text-xs text-gray-600'>Daily Payout</p>
              <p className='text-2xl font-bold text-green-700'>{formatMoney(todaysPayout)}</p>
            </div>
            <div className='rounded-xl border border-blue-100 bg-blue-50 p-4'>
              <p className='text-xs text-gray-600'>Completed Trips Today</p>
              <p className='text-2xl font-bold text-blue-700'>{todaysTrips}</p>
            </div>
            <div className='rounded-xl border border-orange-100 bg-orange-50 p-4'>
              <p className='text-xs text-gray-600'>Incentives Today</p>
              <p className='text-2xl font-bold text-[#ff4d2d]'>{formatMoney(todaysIncentive)}</p>
            </div>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5'>
            <div className='rounded-xl border p-3'>
              <p className='text-xs text-gray-500'>{earningsDays}D Total Payout</p>
              <p className='text-lg font-semibold text-gray-800'>{formatMoney(earningsPanel?.summary?.totalPayout)}</p>
            </div>
            <div className='rounded-xl border p-3'>
              <p className='text-xs text-gray-500'>Paid Amount</p>
              <p className='text-lg font-semibold text-green-700'>{formatMoney(earningsPanel?.summary?.paidAmount)}</p>
            </div>
            <div className='rounded-xl border p-3'>
              <p className='text-xs text-gray-500'>Processing Payout</p>
              <p className='text-lg font-semibold text-amber-600'>{formatMoney(earningsPanel?.summary?.processingAmount)}</p>
            </div>
            <div className='rounded-xl border p-3'>
              <p className='text-xs text-gray-500'>Lifetime Completed Trips</p>
              <p className='text-lg font-semibold text-gray-800'>{earningsPanel?.summary?.lifetimeCompletedTrips || 0}</p>
            </div>
          </div>

          <div className='overflow-x-auto border rounded-xl'>
            <table className='w-full text-sm'>
              <thead className='bg-orange-50'>
                <tr>
                  <th className='text-left px-3 py-2'>Date</th>
                  <th className='text-left px-3 py-2'>Trips</th>
                  <th className='text-left px-3 py-2'>Base</th>
                  <th className='text-left px-3 py-2'>Incentive</th>
                  <th className='text-left px-3 py-2'>Total</th>
                  <th className='text-left px-3 py-2'>Payout</th>
                </tr>
              </thead>
              <tbody>
                {earningsPanel?.dailyBreakdown?.map((day) => (
                  <tr key={day.date} className='border-t'>
                    <td className='px-3 py-2'>{formatDay(day.date)}</td>
                    <td className='px-3 py-2'>{day.completedTrips}</td>
                    <td className='px-3 py-2'>{formatMoney(day.basePayout)}</td>
                    <td className='px-3 py-2 text-[#ff4d2d]'>{formatMoney(day.incentive)}</td>
                    <td className='px-3 py-2 font-semibold'>{formatMoney(day.totalPayout)}</td>
                    <td className='px-3 py-2'>
                      <span className={`text-xs px-2 py-1 rounded-full ${day.payoutStatus === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {day.payoutStatus}
                      </span>
                    </td>
                  </tr>
                ))}
                {!earningsPanel?.dailyBreakdown?.length && (
                  <tr>
                    <td colSpan={6} className='px-3 py-3 text-center text-gray-500'>No earnings data found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className='bg-white rounded-2xl shadow-md p-5 w-[90%] mb-6 border border-orange-100'>
          <h1 className='text-lg font-bold mb-3 text-[#ff4d2d] '>Today Deliveries</h1>

          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={todayDeliveries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(value) => [value, "orders"]} labelFormatter={label => `${label}:00`} />
              <Bar dataKey="count" fill='#ff4d2d' />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {!currentOrder && <div className='bg-white rounded-2xl p-5 shadow-md w-[90%] border border-orange-100' ref={availableOrdersRef}>
          <h1 className='text-lg font-bold mb-4 flex items-center gap-2'>Available Orders</h1>

          <div className='space-y-4'>
            {availableAssignments?.length > 0
              ? (
                availableAssignments.map((a, index) => (
                  <div className='border rounded-lg p-4 flex justify-between items-center gap-3' key={index}>
                    <div>
                      <p className='text-sm font-semibold'>{a?.shopName}</p>
                      <p className='text-sm text-gray-500'><span className='font-semibold'>Delivery Address:</span> {a?.deliveryAddress.text}</p>
                      <p className='text-xs text-gray-400'>{a.items.length} items | {a.subtotal}</p>
                    </div>
                    <div className='flex items-center gap-2'>
                      <button className='bg-orange-500 text-white px-4 py-1 rounded-lg text-sm hover:bg-orange-600' onClick={() => acceptOrder(a.assignmentId)}>Accept</button>
                      <button className='bg-gray-200 text-gray-700 px-4 py-1 rounded-lg text-sm hover:bg-gray-300' onClick={() => rejectOrder(a.assignmentId)}>Reject</button>
                    </div>

                  </div>
                ))
              ) : <p className='text-gray-400 text-sm'>No Available Orders</p>}
          </div>
        </div>}

        {currentOrder && <div className='bg-white rounded-2xl p-5 shadow-md w-[90%] border border-orange-100'>
          <h2 className='text-lg font-bold mb-3'>Current Order</h2>
          <div className='border rounded-lg p-4 mb-3'>
            <p className='font-semibold text-sm'>{currentOrder?.shopOrder?.shop?.name}</p>
            <p className='text-sm text-gray-500'>{currentOrder?.deliveryAddress?.text}</p>
            <p className='text-xs text-gray-400'>{currentOrder?.shopOrder?.shopOrderItems?.length || 0} items | {currentOrder?.shopOrder?.subtotal}</p>
            {currentOrder.scheduleType !== "now" && <p className='text-xs text-blue-600'>Scheduled: {currentOrder.scheduleType} ({new Date(currentOrder.scheduledFor).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })})</p>}
          </div>

          <DeliveryBoyTracking data={{
            deliveryBoyLocation: deliveryBoyLocation || {
              lat: userData?.location?.coordinates?.[1] ?? null,
              lon: userData?.location?.coordinates?.[0] ?? null
            },
            customerLocation: {
              lat: currentOrder?.deliveryAddress?.latitude,
              lon: currentOrder?.deliveryAddress?.longitude
            }
          }} />
          {!showOtpBox ? <button className='mt-4 w-full bg-green-500 text-white font-semibold py-2 px-4 rounded-xl shadow-md hover:bg-green-600 active:scale-95 transition-all duration-200' onClick={sendOtp} disabled={loading}>
            {loading ? <ClipLoader size={20} color='white' /> : "Mark As Delivered"}
          </button> : <div className='mt-4 p-4 border rounded-xl bg-gray-50'>
            <p className='text-sm font-semibold mb-2'>Enter Otp send to <span className='text-orange-500'>{currentOrder?.user?.fullName}</span></p>
            <input type="text" className='w-full border px-3 py-2 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-orange-400' placeholder='Enter OTP' onChange={(e) => setOtp(e.target.value)} value={otp} />
            {message && <p className='text-center text-green-500 text-lg mb-4'>{message}</p>}

            <button className="w-full bg-orange-500 text-white py-2 rounded-lg font-semibold hover:bg-orange-600 transition-all" onClick={verifyOtp}>Submit OTP</button>
          </div>}

          <OrderChat orderId={currentOrder?._id} shopOrderId={currentOrder?.shopOrder?._id} title="Chat with Customer & Owner" />

        </div>}


      </div>
    </div>
  )
}

export default DeliveryBoy
