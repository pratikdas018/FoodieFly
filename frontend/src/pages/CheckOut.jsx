import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { IoIosArrowRoundBack } from "react-icons/io"
import { IoSearchOutline } from "react-icons/io5"
import { TbCurrentLocation } from "react-icons/tb"
import { IoLocationSharp } from "react-icons/io5"
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import { useDispatch, useSelector } from 'react-redux'
import "leaflet/dist/leaflet.css"
import { setAddress, setLocation } from '../redux/mapSlice'
import { MdDeliveryDining } from "react-icons/md"
import { FaCreditCard } from "react-icons/fa"
import axios from 'axios'
import { FaMobileScreenButton } from "react-icons/fa6"
import { useNavigate } from 'react-router-dom'
import { serverUrl, showAppPopup } from '../App'
import { addMyOrder, setUserData } from '../redux/userSlice'

function RecenterMap({ location }) {
  if (location.lat && location.lon) {
    const map = useMap()
    map.setView([location.lat, location.lon], 16, { animate: true })
  }
  return null
}

function CheckOut() {
  const { location, address } = useSelector(state => state.map)
  const { cartItems, totalAmount, userData } = useSelector(state => state.user)
  const [addressInput, setAddressInput] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("cod")
  const [scheduleType, setScheduleType] = useState("now")
  const [couponCode, setCouponCode] = useState("")
  const [loyaltyPointsToUse, setLoyaltyPointsToUse] = useState(0)
  const [availableCoupons, setAvailableCoupons] = useState([])
  const [pricing, setPricing] = useState(null)
  const [pricingError, setPricingError] = useState("")
  const [isPricingLoading, setIsPricingLoading] = useState(false)
  const [savedAddressLabel, setSavedAddressLabel] = useState("Home")
  const [saveAsDefault, setSaveAsDefault] = useState(false)
  const [isSavingAddress, setIsSavingAddress] = useState(false)
  const [isDefaultAddressApplied, setIsDefaultAddressApplied] = useState(false)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const apiKey = import.meta.env.VITE_GEOAPIKEY
  const savedAddresses = userData?.savedAddresses || []
  const defaultSavedAddress = useMemo(
    () => savedAddresses.find((savedAddress) => savedAddress.isDefault),
    [savedAddresses]
  )

  const fallbackPricing = useMemo(() => {
    const deliveryFee = totalAmount > 500 ? 0 : 40
    return {
      subtotalAmount: totalAmount,
      deliveryFee,
      grossAmount: totalAmount + deliveryFee,
      couponDiscount: 0,
      loyaltyDiscount: 0,
      loyaltyPointsUsed: 0,
      totalAmount: totalAmount + deliveryFee
    }
  }, [totalAmount])

  const effectivePricing = pricing || fallbackPricing

  const buildScheduledDate = (slot) => {
    if (slot === "now") return null
    const now = new Date()
    const scheduled = new Date(now)
    if (slot === "lunch") {
      scheduled.setHours(13, 0, 0, 0)
    } else if (slot === "dinner") {
      scheduled.setHours(20, 0, 0, 0)
    }
    if (scheduled <= now) {
      scheduled.setDate(scheduled.getDate() + 1)
    }
    return scheduled.toISOString()
  }

  const getPricingPreview = useCallback(async () => {
    setIsPricingLoading(true)
    try {
      const normalizedCouponCode = String(couponCode || "").trim().toUpperCase()
      const result = await axios.post(`${serverUrl}/api/order/preview-pricing`, {
        cartItems,
        scheduleType,
        couponCode: normalizedCouponCode.length >= 4 ? normalizedCouponCode : "",
        loyaltyPointsToUse
      }, { withCredentials: true })
      setPricing(result.data)
      setPricingError("")
      return result.data
    } catch (error) {
      const message = error?.response?.data?.message || "Unable to calculate offer pricing right now."
      setPricingError(message)
      setPricing(null)
      return null
    } finally {
      setIsPricingLoading(false)
    }
  }, [cartItems, scheduleType, couponCode, loyaltyPointsToUse])

  const onDragEnd = (e) => {
    const { lat, lng } = e.target._latlng
    dispatch(setLocation({ lat, lon: lng }))
    getAddressByLatLng(lat, lng)
  }

  const applySavedAddress = (savedAddress) => {
    if (!savedAddress) return
    setAddressInput(savedAddress.text)
    dispatch(setAddress(savedAddress.text))
    dispatch(setLocation({
      lat: Number(savedAddress.latitude),
      lon: Number(savedAddress.longitude)
    }))
  }

  const getCurrentLocation = () => {
    if (!userData?.location?.coordinates?.length) return
    const latitude = userData.location.coordinates[1]
    const longitude = userData.location.coordinates[0]
    dispatch(setLocation({ lat: latitude, lon: longitude }))
    getAddressByLatLng(latitude, longitude)
  }

  const getAddressByLatLng = async (lat, lng) => {
    try {
      const result = await axios.get(`https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&format=json&apiKey=${apiKey}`)
      dispatch(setAddress(result?.data?.results?.[0]?.address_line2 || ""))
    } catch (error) {
      console.log(error)
    }
  }

  const getLatLngByAddress = async () => {
    try {
      const result = await axios.get(`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(addressInput)}&apiKey=${apiKey}`)
      const { lat, lon } = result.data.features[0].properties
      dispatch(setLocation({ lat, lon }))
    } catch (error) {
      console.log(error)
    }
  }

  const handleSaveCurrentAddress = async () => {
    if (!addressInput || location?.lat == null || location?.lon == null) return
    setIsSavingAddress(true)
    try {
      const result = await axios.post(`${serverUrl}/api/user/save-address`, {
        label: savedAddressLabel,
        text: addressInput,
        latitude: location.lat,
        longitude: location.lon,
        isDefault: saveAsDefault
      }, { withCredentials: true })
      dispatch(setUserData(result.data.user))
      setSaveAsDefault(false)
    } catch (error) {
      console.log(error)
    } finally {
      setIsSavingAddress(false)
    }
  }

  const handleSetDefaultAddress = async (addressId) => {
    try {
      const result = await axios.post(`${serverUrl}/api/user/set-default-address/${addressId}`, {}, { withCredentials: true })
      dispatch(setUserData(result.data.user))
    } catch (error) {
      console.log(error)
    }
  }

  const handleDeleteAddress = async (addressId) => {
    try {
      const result = await axios.delete(`${serverUrl}/api/user/delete-address/${addressId}`, { withCredentials: true })
      dispatch(setUserData(result.data.user))
    } catch (error) {
      console.log(error)
    }
  }

  const handlePlaceOrder = async () => {
    try {
      const latestPricing = await getPricingPreview()
      if (!latestPricing) return

      const result = await axios.post(`${serverUrl}/api/order/place-order`, {
        paymentMethod,
        scheduleType,
        scheduledFor: buildScheduledDate(scheduleType),
        couponCode: latestPricing.couponCode,
        loyaltyPointsToUse: latestPricing.loyaltyPointsUsed,
        deliveryAddress: {
          text: addressInput,
          latitude: location.lat,
          longitude: location.lon
        },
        totalAmount: latestPricing.totalAmount,
        cartItems
      }, { withCredentials: true })

      if (paymentMethod === "cod") {
        dispatch(addMyOrder(result.data))
        navigate("/order-placed")
      } else {
        if (result.data?.orderId && result.data?.razorOrder) {
          const orderId = result.data.orderId
          const razorOrder = result.data.razorOrder
          openRazorpayWindow(orderId, razorOrder)
          return
        }
        if (result.data?._id) {
          dispatch(addMyOrder(result.data))
          if (result.data?.dummyPayment) {
            showAppPopup({
              title: "Dummy Payment Success",
              message: "Razorpay keys are not configured. Order placed using dummy online payment.",
              type: "info"
            })
          }
          navigate("/order-placed")
          return
        }
        showAppPopup({
          title: "Payment Error",
          message: "Unable to start online payment flow.",
          type: "info"
        })
      }
    } catch (error) {
      console.log(error)
      showAppPopup({
        title: "Order Failed",
        message: error?.response?.data?.message || "Unable to place order right now.",
        type: "info"
      })
    }
  }

  const openRazorpayWindow = (orderId, razorOrder) => {
    if (!window?.Razorpay || !razorOrder?.id) {
      showAppPopup({
        title: "Payment Unavailable",
        message: "Razorpay SDK is unavailable. Please try Cash on Delivery.",
        type: "info"
      })
      return
    }
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: razorOrder.amount,
      currency: 'INR',
      name: "FoodieFly",
      description: "Food Delivery Website",
      order_id: razorOrder.id,
      handler: async function (response) {
        try {
          const result = await axios.post(`${serverUrl}/api/order/verify-payment`, {
            razorpay_payment_id: response.razorpay_payment_id,
            orderId
          }, { withCredentials: true })
          dispatch(addMyOrder(result.data))
          navigate("/order-placed")
        } catch (error) {
          console.log(error)
        }
      }
    }

    const rzp = new window.Razorpay(options)
    rzp.open()
  }

  useEffect(() => {
    setAddressInput(address)
  }, [address])

  useEffect(() => {
    if (!defaultSavedAddress || isDefaultAddressApplied) return
    applySavedAddress(defaultSavedAddress)
    setIsDefaultAddressApplied(true)
  }, [defaultSavedAddress, isDefaultAddressApplied])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (cartItems?.length > 0) {
        getPricingPreview()
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [getPricingPreview, cartItems?.length])

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const result = await axios.get(`${serverUrl}/api/order/available-coupons`, { withCredentials: true })
        setAvailableCoupons(result.data || [])
      } catch (error) {
        console.log(error)
      }
    }
    fetchCoupons()
  }, [])

  return (
    <div className='min-h-screen bg-[#fff9f6] flex items-center justify-center p-6'>
      <div className='absolute top-[20px] left-[20px] z-[10]' onClick={() => navigate("/")}>
        <IoIosArrowRoundBack size={35} className='text-[#ff4d2d]' />
      </div>
      <div className='w-full max-w-[900px] bg-white rounded-2xl shadow-xl p-6 space-y-6'>
        <h1 className='text-2xl font-bold text-gray-800'>Checkout</h1>

        <section>
          <h2 className='text-lg font-semibold mb-2 flex items-center gap-2 text-gray-800'><IoLocationSharp className='text-[#ff4d2d]' /> Delivery Location</h2>
          {savedAddresses.length > 0 && (
            <div className='mb-3'>
              <p className='text-sm font-medium text-gray-700 mb-2'>Saved Addresses</p>
              <div className='flex flex-wrap gap-2'>
                {savedAddresses.map((savedAddress) => (
                  <div key={savedAddress._id} className={`rounded-lg border px-3 py-2 cursor-pointer ${savedAddress.isDefault ? "border-[#ff4d2d] bg-orange-50" : "border-gray-200 bg-white"}`} onClick={() => applySavedAddress(savedAddress)}>
                    <p className='text-xs font-semibold text-gray-800'>{savedAddress.label}</p>
                    <p className='text-xs text-gray-600 max-w-[220px] truncate'>{savedAddress.text}</p>
                    <div className='flex items-center gap-2 mt-1'>
                      {!savedAddress.isDefault && <button type='button' className='text-[10px] text-blue-600' onClick={(event) => { event.stopPropagation(); handleSetDefaultAddress(savedAddress._id) }}>Set default</button>}
                      <button type='button' className='text-[10px] text-red-500' onClick={(event) => { event.stopPropagation(); handleDeleteAddress(savedAddress._id) }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className='flex gap-2 mb-3'>
            <input type="text" className='flex-1 border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff4d2d]' placeholder='Enter Your Delivery Address..' value={addressInput} onChange={(e) => setAddressInput(e.target.value)} />
            <button className='bg-[#ff4d2d] hover:bg-[#e64526] text-white px-3 py-2 rounded-lg flex items-center justify-center' onClick={getLatLngByAddress}><IoSearchOutline size={17} /></button>
            <button className='bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center justify-center' onClick={getCurrentLocation}><TbCurrentLocation size={17} /></button>
          </div>
          <div className='flex flex-wrap gap-2 mb-3 items-center'>
            <select className='border border-gray-300 rounded-lg p-2 text-sm' value={savedAddressLabel} onChange={(event) => setSavedAddressLabel(event.target.value)}>
              <option value="Home">Home</option>
              <option value="Work">Work</option>
              <option value="Other">Other</option>
            </select>
            <label className='text-sm text-gray-600 flex items-center gap-1'>
              <input type="checkbox" checked={saveAsDefault} onChange={(event) => setSaveAsDefault(event.target.checked)} />
              Set default
            </label>
            <button className='bg-gray-800 hover:bg-gray-900 text-white px-3 py-2 rounded-lg text-sm disabled:opacity-70' onClick={handleSaveCurrentAddress} disabled={isSavingAddress}>
              {isSavingAddress ? "Saving..." : "Save Address"}
            </button>
          </div>
          <div className='rounded-xl border overflow-hidden'>
            <div className='h-64 w-full flex items-center justify-center'>
              <MapContainer className={"w-full h-full"} center={[location?.lat, location?.lon]} zoom={16}>
                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <RecenterMap location={location} />
                <Marker position={[location?.lat, location?.lon]} draggable eventHandlers={{ dragend: onDragEnd }} />
              </MapContainer>
            </div>
          </div>
        </section>

        <section>
          <h2 className='text-lg font-semibold mb-3 text-gray-800'>Payment Method</h2>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${paymentMethod === "cod" ? "border-[#ff4d2d] bg-orange-50 shadow" : "border-gray-200 hover:border-gray-300"}`} onClick={() => setPaymentMethod("cod")}>
              <span className='inline-flex h-10 w-10 items-center justify-center rounded-full bg-green-100'>
                <MdDeliveryDining className='text-green-600 text-xl' />
              </span>
              <div>
                <p className='font-medium text-gray-800'>Cash On Delivery</p>
                <p className='text-xs text-gray-500'>Pay when your food arrives</p>
              </div>
            </div>
            <div className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${paymentMethod === "online" ? "border-[#ff4d2d] bg-orange-50 shadow" : "border-gray-200 hover:border-gray-300"}`} onClick={() => setPaymentMethod("online")}>
              <span className='inline-flex h-10 w-10 items-center justify-center rounded-full bg-purple-100'>
                <FaMobileScreenButton className='text-purple-700 text-lg' />
              </span>
              <span className='inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100'>
                <FaCreditCard className='text-blue-700 text-lg' />
              </span>
              <div>
                <p className='font-medium text-gray-800'>UPI / Credit / Debit Card</p>
                <p className='text-xs text-gray-500'>Pay Securely Online</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className='text-lg font-semibold mb-3 text-gray-800'>Schedule Order</h2>
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
            <div className={`rounded-xl border p-4 cursor-pointer ${scheduleType === "now" ? "border-[#ff4d2d] bg-orange-50 shadow" : "border-gray-200"}`} onClick={() => setScheduleType("now")}>
              <p className='font-medium text-gray-800'>Now</p>
              <p className='text-xs text-gray-500'>Deliver as soon as possible</p>
            </div>
            <div className={`rounded-xl border p-4 cursor-pointer ${scheduleType === "lunch" ? "border-[#ff4d2d] bg-orange-50 shadow" : "border-gray-200"}`} onClick={() => setScheduleType("lunch")}>
              <p className='font-medium text-gray-800'>Lunch Slot</p>
              <p className='text-xs text-gray-500'>Auto-schedule for 1:00 PM</p>
            </div>
            <div className={`rounded-xl border p-4 cursor-pointer ${scheduleType === "dinner" ? "border-[#ff4d2d] bg-orange-50 shadow" : "border-gray-200"}`} onClick={() => setScheduleType("dinner")}>
              <p className='font-medium text-gray-800'>Dinner Slot</p>
              <p className='text-xs text-gray-500'>Auto-schedule for 8:00 PM</p>
            </div>
          </div>
          {scheduleType !== "now" && (
            <p className='text-sm text-blue-600 mt-2'>
              Scheduled for: {new Date(buildScheduledDate(scheduleType)).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </section>

        <section>
          <h2 className='text-lg font-semibold mb-3 text-gray-800'>Coupons and Loyalty</h2>
          <div className='rounded-xl border bg-gray-50 p-4 space-y-3'>
            <div className='flex flex-col sm:flex-row gap-2'>
              <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder='Enter coupon code' className='flex-1 border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff4d2d]' />
              <button className='bg-[#ff4d2d] hover:bg-[#e64526] text-white px-4 py-2 rounded-lg text-sm' onClick={getPricingPreview}>
                Apply
              </button>
            </div>
            <div className='flex flex-wrap gap-2'>
              {availableCoupons?.filter((coupon) => Number(coupon.remainingUses || 0) > 0).map((coupon) => (
                <button key={coupon.code} className='text-xs px-2 py-1 rounded-full bg-orange-100 text-[#ff4d2d] border border-orange-200' onClick={() => setCouponCode(coupon.code)}>
                  {coupon.code}
                </button>
              ))}
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div>
                <p className='text-sm text-gray-600'>Use loyalty points</p>
                <input
                  type="number"
                  min={0}
                  max={Math.max(0, userData?.loyaltyPoints || 0)}
                  value={loyaltyPointsToUse}
                  onChange={(e) => setLoyaltyPointsToUse(Math.max(0, Number(e.target.value || 0)))}
                  className='w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff4d2d]'
                />
              </div>
              <div className='text-sm text-gray-700 flex items-end'>
                <p>Available points: <span className='font-semibold text-[#ff4d2d]'>{userData?.loyaltyPoints || 0}</span></p>
              </div>
            </div>
            {pricingError && <p className='text-sm text-red-500'>{pricingError}</p>}
          </div>
        </section>

        <section>
          <h2 className='text-lg font-semibold mb-3 text-gray-800'>Order Summary</h2>
          <div className='rounded-xl border bg-gray-50 p-4 space-y-2'>
            {cartItems.map((item, index) => (
              <div key={index} className='flex justify-between text-sm text-gray-700'>
                <span>{item.name} x {item.quantity}</span>
                <span>INR {item.price * item.quantity}</span>
              </div>
            ))}
            <hr className='border-gray-200 my-2' />
            <div className='flex justify-between font-medium text-gray-800'>
              <span>Subtotal</span>
              <span>{effectivePricing.subtotalAmount}</span>
            </div>
            <div className='flex justify-between text-gray-700'>
              <span>Delivery Fee</span>
              <span>{effectivePricing.deliveryFee === 0 ? "Free" : effectivePricing.deliveryFee}</span>
            </div>
            <div className='flex justify-between text-green-700'>
              <span>Coupon Discount</span>
              <span>- {effectivePricing.couponDiscount || 0}</span>
            </div>
            <div className='flex justify-between text-green-700'>
              <span>Loyalty Discount</span>
              <span>- {effectivePricing.loyaltyDiscount || 0}</span>
            </div>
            <div className='flex justify-between text-lg font-bold text-[#ff4d2d] pt-2'>
              <span>Total</span>
              <span>{effectivePricing.totalAmount}</span>
            </div>
            {scheduleType !== "now" && (
              <div className='flex justify-between text-sm text-blue-600 pt-1'>
                <span>Scheduled Slot</span>
                <span>{scheduleType}</span>
              </div>
            )}
            <div className='flex justify-between text-sm text-gray-600 pt-1'>
              <span>Points you will earn</span>
              <span>{pricing?.loyaltyPointsEarned || 0}</span>
            </div>
          </div>
        </section>
        <button className='w-full bg-[#ff4d2d] hover:bg-[#e64526] text-white py-3 rounded-xl font-semibold disabled:opacity-70' onClick={handlePlaceOrder} disabled={isPricingLoading}>
          {isPricingLoading ? "Calculating..." : paymentMethod === "cod" ? "Place Order" : "Pay and Place Order"}
        </button>
      </div>
    </div>
  )
}

export default CheckOut
