import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import SignUp from './pages/SignUp'
import SignIn from './pages/SignIn'
import ForgotPassword from './pages/ForgotPassword'
import useGetCurrentUser from './hooks/useGetCurrentUser'
import { useDispatch, useSelector } from 'react-redux'
import Home from './pages/Home'
import useGetCity from './hooks/useGetCity'
import useGetMyshop from './hooks/useGetMyShop'
import CreateEditShop from './pages/CreateEditShop'
import AddItem from './pages/AddItem'
import EditItem from './pages/EditItem'
import useGetShopByCity from './hooks/useGetShopByCity'
import useGetItemsByCity from './hooks/useGetItemsByCity'
import CartPage from './pages/CartPage'
import CheckOut from './pages/CheckOut'
import OrderPlaced from './pages/OrderPlaced'
import MyOrders from './pages/MyOrders'
import useGetMyOrders from './hooks/useGetMyOrders'
import useUpdateLocation from './hooks/useUpdateLocation'
import TrackOrderPage from './pages/TrackOrderPage'
import Shop from './pages/Shop'
import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { addNotification, setSocket } from './redux/userSlice'
import Profile from './pages/Profile'
import { useLocation } from 'react-router-dom'
import Footer from './components/Footer'
import AdminDashboard from './components/AdminDashboard'

export const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:8000"
const APP_POPUP_EVENT = "app-popup"

export const showAppPopup = ({ title = "FoodieFly", message = "", type = "info" }) => {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(APP_POPUP_EVENT, {
    detail: { title, message, type }
  }))
}

const playNotificationSound = () => {
  try {
    if (typeof window === "undefined") return
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return
    const audioContext = new AudioContextClass()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    oscillator.type = "sine"
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime)
    gainNode.gain.setValueAtTime(0.001, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.25)
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.25)
  } catch (error) {
    // Ignore browser autoplay/audio permission errors.
  }
}

function App() {
    const {userData, socket}=useSelector(state=>state.user)
    const dispatch=useDispatch()
    const location = useLocation()
    const [popupQueue, setPopupQueue] = useState([])
    const [activePopup, setActivePopup] = useState(null)
    const hideFooterPaths = ['/signin', '/signup', '/forgot-password']
    const shouldShowFooter = userData && !hideFooterPaths.includes(location.pathname)
  useGetCurrentUser()
useUpdateLocation()
  useGetCity()
  useGetMyshop()
  useGetShopByCity()
  useGetItemsByCity()
  useGetMyOrders()

  useEffect(()=>{
    const socketInstance=io(serverUrl,{withCredentials:true})
    dispatch(setSocket(socketInstance))
    const handleNotification = (payload) => {
      dispatch(addNotification(payload))
      playNotificationSound()
    }
    socketInstance.on('notification',handleNotification)
    return ()=>{
      socketInstance.off('notification', handleNotification)
      socketInstance.disconnect()
    }
  },[])

  useEffect(() => {
    if (!socket || !userData?._id) return
    const emitIdentity = () => {
      socket.emit('identity',{userId:userData._id})
    }
    if (socket.connected) {
      emitIdentity()
    }
    socket.on('connect', emitIdentity)
    return () => {
      socket.off('connect', emitIdentity)
    }
  }, [socket, userData?._id])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
  }, [location.pathname])

  useEffect(() => {
    const handlePopupEvent = (event) => {
      const payload = event?.detail || {}
      setPopupQueue((prev) => [...prev, {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title: payload.title || "FoodieFly",
        message: payload.message || "",
        type: payload.type || "info"
      }])
    }
    window.addEventListener(APP_POPUP_EVENT, handlePopupEvent)
    return () => window.removeEventListener(APP_POPUP_EVENT, handlePopupEvent)
  }, [])

  useEffect(() => {
    if (activePopup || popupQueue.length === 0) return
    const [nextPopup, ...rest] = popupQueue
    setActivePopup(nextPopup)
    setPopupQueue(rest)
  }, [popupQueue, activePopup])

  useEffect(() => {
    if (!activePopup) return
    const timer = setTimeout(() => {
      setActivePopup(null)
    }, 3200)
    return () => clearTimeout(timer)
  }, [activePopup])

  const getPopupClasses = (type) => {
    if (type === "success") {
      return "border-green-200 bg-green-50 text-green-900"
    }
    if (type === "promo") {
      return "border-orange-200 bg-orange-50 text-orange-900"
    }
    return "border-blue-200 bg-blue-50 text-blue-900"
  }

  return (
   <>
    {activePopup && (
      <div className='fixed top-[95px] right-[16px] z-[99999] max-w-[340px]'>
        <div className={`rounded-xl border shadow-xl px-4 py-3 ${getPopupClasses(activePopup.type)}`}>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <p className='font-semibold text-sm'>{activePopup.title}</p>
              <p className='text-sm mt-1'>{activePopup.message}</p>
            </div>
            <button className='text-xs font-semibold opacity-70 hover:opacity-100' onClick={() => setActivePopup(null)}>X</button>
          </div>
        </div>
      </div>
    )}
    <Routes>
      <Route path='/signup' element={!userData?<SignUp/>:<Navigate to={"/"}/>}/>
      <Route path='/signin' element={!userData?<SignIn/>:<Navigate to={"/"}/>}/>
      <Route path='/forgot-password' element={!userData?<ForgotPassword/>:<Navigate to={"/"}/>}/>
      <Route path='/' element={userData?<Home/>:<Navigate to={"/signin"}/>}/>
      <Route path='/create-edit-shop' element={userData?<CreateEditShop/>:<Navigate to={"/signin"}/>}/>
      <Route path='/add-item' element={userData?<AddItem/>:<Navigate to={"/signin"}/>}/>
      <Route path='/edit-item/:itemId' element={userData?<EditItem/>:<Navigate to={"/signin"}/>}/>
      <Route path='/cart' element={userData?<CartPage/>:<Navigate to={"/signin"}/>}/>
      <Route path='/checkout' element={userData?<CheckOut/>:<Navigate to={"/signin"}/>}/>
      <Route path='/order-placed' element={userData?<OrderPlaced/>:<Navigate to={"/signin"}/>}/>
      <Route path='/my-orders' element={userData?<MyOrders/>:<Navigate to={"/signin"}/>}/>
      <Route path='/track-order/:orderId' element={userData?<TrackOrderPage/>:<Navigate to={"/signin"}/>}/>
      <Route path='/shop/:shopId' element={userData?<Shop/>:<Navigate to={"/signin"}/>}/>
      <Route path='/profile' element={userData?<Profile/>:<Navigate to={"/signin"}/>}/>
      <Route path='/admin' element={userData?.role==="admin"?<AdminDashboard/>:<Navigate to={"/"}/>}/>
    </Routes>
    {shouldShowFooter && <Footer />}
   </>
  )
}

export default App
