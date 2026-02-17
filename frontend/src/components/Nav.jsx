import React, { useEffect, useState } from 'react'
import { FaLocationDot } from "react-icons/fa6";
import { IoIosSearch } from "react-icons/io";
import { FiBell, FiHeart, FiMoon, FiShoppingCart, FiSun } from "react-icons/fi";
import { useDispatch, useSelector } from 'react-redux';
import { RxCross2 } from "react-icons/rx";
import axios from 'axios';
import { serverUrl, showAppPopup } from '../App';
import { clearNotifications, markAllNotificationsRead, markNotificationRead, setSearchItems, setUserData } from '../redux/userSlice';
import { FaPlus } from "react-icons/fa6";
import { TbReceipt2 } from "react-icons/tb";
import { useLocation, useNavigate } from 'react-router-dom';
function Nav() {
    const { userData, currentCity ,cartItems, notifications} = useSelector(state => state.user)
        const { myShopData} = useSelector(state => state.owner)
    const [showInfo, setShowInfo] = useState(false)
    const [showNotifications, setShowNotifications] = useState(false)
    const [showSearch, setShowSearch] = useState(false)
    const [query,setQuery]=useState("")
    const [theme, setTheme] = useState(() => {
      if (typeof window === "undefined") return "light"
      const savedTheme = localStorage.getItem("foodiefly_theme")
      return savedTheme === "dark" ? "dark" : "light"
    })
    const dispatch = useDispatch()
    const navigate=useNavigate()
    const location = useLocation()
    const unreadCount = notifications.filter((notification) => !notification.read).length
    const favoriteCount = Array.isArray(userData?.favoriteItems) ? userData.favoriteItems.length : 0

    const formatNotificationTime = (timestamp) => {
      if (!timestamp) return ""
      return new Date(timestamp).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      })
    }

    const handleLogOut = async () => {
        try {
            await axios.get(`${serverUrl}/api/auth/signout`, { withCredentials: true })
            dispatch(clearNotifications())
            dispatch(setUserData(null))
            showAppPopup({
              title: "Logged Out",
              message: "You have logged out successfully.",
              type: "success"
            })
        } catch (error) {
            console.log(error)
        }
    }

    const handleToggleNotifications = () => {
      setShowNotifications((prev) => {
        if (!prev) {
          dispatch(markAllNotificationsRead())
        }
        return !prev
      })
      setShowInfo(false)
    }

    const handleNotificationClick = (notification) => {
      dispatch(markNotificationRead(notification.id))
      setShowNotifications(false)
      let route = notification.route || "/"
      if (userData?.role === "deliveryBoy" && notification.type === "new_order_alert") {
        const separator = route.includes("?") ? "&" : "?"
        route = `${route}${separator}t=${Date.now()}`
      }
      if (route) {
        if (location.pathname === route.split("?")[0] && !route.includes("?")) {
          window.scrollTo({ top: 0, left: 0, behavior: "smooth" })
        }
        navigate(route)
      }
    }

    const handleNavigateToMyOrders = () => {
      setShowInfo(false)
      setShowNotifications(false)
      if (location.pathname === "/my-orders") {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" })
        return
      }
      navigate("/my-orders", { state: { openFromNav: true, ts: Date.now() } })
    }

    const handleNavigateToAdmin = () => {
      setShowInfo(false)
      setShowNotifications(false)
      if (location.pathname === "/admin") {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" })
        return
      }
      navigate("/admin")
    }

    const handleNavigateToFavorites = () => {
      setShowInfo(false)
      setShowNotifications(false)
      if (location.pathname === "/favorites") {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" })
        return
      }
      navigate("/favorites")
    }

    const handleNavigateHome = () => {
      setShowInfo(false)
      setShowNotifications(false)
      if (location.pathname === "/") {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" })
        return
      }
      navigate("/")
      setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" })
      }, 0)
    }

    const handleSearchItems=async () => {
      if (!currentCity) return
      try {
        const result=await axios.get(`${serverUrl}/api/item/search-items?query=${query}&city=${currentCity}`,{withCredentials:true})
    dispatch(setSearchItems(result.data))
      } catch (error) {
        console.log(error)
      }
    }

    const handleThemeToggle = () => {
      setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"))
    }

    useEffect(()=>{
        if(query){
handleSearchItems()
        }else{
              dispatch(setSearchItems(null))
        }

    },[query])

    useEffect(() => {
      if (typeof window === "undefined") return
      document.documentElement.setAttribute("data-theme", theme)
      localStorage.setItem("foodiefly_theme", theme)
    }, [theme])
    const iconButtonClass = "h-[40px] w-[40px] rounded-full border border-orange-200 bg-white text-[#ff4d2d] flex items-center justify-center shadow-sm hover:bg-orange-50 transition-all duration-200 cursor-pointer"
    const pillButtonClass = "hidden md:flex items-center gap-2 px-4 h-[40px] rounded-full border border-orange-200 bg-white text-[#ff4d2d] text-sm font-semibold shadow-sm hover:bg-orange-50 transition-all duration-200 cursor-pointer"
    const ownerPillButtonClass = "hidden xl:flex items-center gap-2 px-4 h-[40px] rounded-full border border-orange-200 bg-white text-[#ff4d2d] text-sm font-semibold shadow-sm hover:bg-orange-50 transition-all duration-200 cursor-pointer"

    return (
        <div className='fixed top-0 left-0 w-full z-[9999] bg-gradient-to-r from-[#fff9f6]/95 via-white/95 to-[#fff3eb]/95 backdrop-blur-md border-b border-orange-100 shadow-[0_10px_30px_rgba(255,77,45,0.12)] overflow-visible'>
            <div className='max-w-[1200px] mx-auto h-[84px] flex items-center justify-between gap-3 px-4 md:px-6 relative'>
                {showSearch && userData.role == "user" && <div className='w-[92%] h-[64px] bg-white/95 backdrop-blur-md border border-orange-100 shadow-xl rounded-2xl items-center gap-2 flex fixed top-[88px] left-1/2 -translate-x-1/2 md:hidden px-3'>
                    <div className='flex items-center w-[34%] overflow-hidden gap-[8px] px-[8px] border-r border-orange-200'>
                        <FaLocationDot size={20} className="text-[#ff4d2d]" />
                        <div className='w-[80%] truncate text-gray-700 text-sm font-medium'>{currentCity}</div>
                    </div>
                    <div className='w-[66%] flex items-center gap-[8px]'>
                        <IoIosSearch size={22} className='text-[#ff4d2d]' />
                        <input type="text" placeholder='search delicious food...' className='px-[6px] text-gray-700 outline-0 w-full text-sm' onChange={(e)=>setQuery(e.target.value)} value={query}/>
                    </div>
                </div>}

                <button type="button" className='flex items-center gap-2 md:gap-3 shrink-0 cursor-pointer' onClick={handleNavigateHome}>
                    <div className='nav-brand-badge h-9 w-9 rounded-xl bg-gradient-to-br from-[#ff4d2d] to-[#ff7b5d] text-white font-black flex items-center justify-center shadow-md'>
                        F
                    </div>
                    <h1 className='nav-brand-title text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-[#ff4d2d] to-[#ff7b5d] bg-clip-text text-transparent'>
                        FoodieFly
                    </h1>
                </button>

                {userData.role == "user" && <div className='md:w-[58%] lg:w-[44%] h-[60px] rounded-2xl border border-orange-100 bg-white/90 shadow-[0_8px_20px_rgba(255,77,45,0.12)] items-center gap-2 hidden md:flex px-3'>
                    <div className='flex items-center w-[34%] overflow-hidden gap-[8px] px-[8px] border-r border-orange-200'>
                        <FaLocationDot size={20} className="text-[#ff4d2d]" />
                        <div className='w-[80%] truncate text-gray-700 text-sm font-medium'>{currentCity}</div>
                    </div>
                    <div className='w-[66%] flex items-center gap-[8px]'>
                        <IoIosSearch size={22} className='text-[#ff4d2d]' />
                        <input type="text" placeholder='search delicious food...' className='px-[6px] text-gray-700 outline-0 w-full text-sm' onChange={(e)=>setQuery(e.target.value)} value={query}/>
                    </div>
                </div>}

                <div className='flex items-center gap-2 md:gap-3 relative'>
                    {userData.role == "user" && (
                        <button className={`md:hidden ${iconButtonClass}`} onClick={() => setShowSearch((prev) => !prev)}>
                            {showSearch ? <RxCross2 size={20} /> : <IoIosSearch size={20} />}
                        </button>
                    )}

                    {userData.role == "owner"? <>
                        {myShopData && <>
                            <button className={ownerPillButtonClass} onClick={()=>navigate("/add-item")}>
                                <FaPlus size={16} />
                                <span>Add Food Item</span>
                            </button>
                            <button className={`xl:hidden ${iconButtonClass}`} onClick={()=>navigate("/add-item")}>
                                <FaPlus size={16} />
                            </button>
                        </>}

                        <button className={ownerPillButtonClass} onClick={handleNavigateToMyOrders}>
                            <TbReceipt2 size={18}/>
                            <span>My Orders</span>
                        </button>
                        <button className={`xl:hidden ${iconButtonClass}`} onClick={handleNavigateToMyOrders}>
                            <TbReceipt2 size={18}/>
                        </button>
                    </>: (
                        <>
                            {userData.role=="user" && <button className={`relative ${iconButtonClass}`} onClick={()=>navigate("/cart")}>
                                <FiShoppingCart size={19} />
                                <span className='absolute right-[-4px] top-[-6px] min-w-[16px] h-[16px] px-1 rounded-full bg-[#ff4d2d] text-white text-[10px] flex items-center justify-center'>{cartItems.length}</span>
                            </button>}
                            {userData.role=="user" && <button className={`relative ${iconButtonClass}`} onClick={handleNavigateToFavorites} title='Favorites'>
                                <FiHeart size={19} />
                                {favoriteCount > 0 && (
                                  <span className='absolute right-[-4px] top-[-6px] min-w-[16px] h-[16px] px-1 rounded-full bg-[#ff4d2d] text-white text-[10px] flex items-center justify-center'>
                                    {favoriteCount > 99 ? "99+" : favoriteCount}
                                  </span>
                                )}
                            </button>}

                            {(userData.role=="user" || userData.role=="deliveryBoy") && (
                                <button className={pillButtonClass} onClick={handleNavigateToMyOrders}>
                                    My Orders
                                </button>
                            )}
                            {userData.role=="admin" && (
                                <button className={pillButtonClass} onClick={handleNavigateToAdmin}>
                                    Admin Panel
                                </button>
                            )}
                        </>
                    )}

                    <button className={`relative ${iconButtonClass}`} onClick={handleToggleNotifications}>
                        <FiBell size={18} />
                        {unreadCount > 0 && <span className='absolute right-[-5px] top-[-7px] min-w-[17px] h-[17px] px-1 rounded-full bg-[#ff4d2d] text-white text-[10px] flex items-center justify-center'>{unreadCount}</span>}
                    </button>

                    <button
                      className={iconButtonClass}
                      onClick={handleThemeToggle}
                      title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                      {theme === "dark" ? <FiSun size={18} /> : <FiMoon size={18} />}
                    </button>

                    {showNotifications && <div className='absolute top-[52px] right-0 w-[340px] max-w-[calc(100vw-20px)] max-h-[430px] overflow-y-auto bg-white/95 backdrop-blur-md border border-orange-100 shadow-[0_15px_40px_rgba(0,0,0,0.12)] rounded-2xl p-[14px] flex flex-col gap-[10px] z-[9999]'>
                        <div className='flex items-center justify-between border-b border-orange-100 pb-2'>
                            <h3 className='text-[16px] font-semibold text-gray-800'>Notifications</h3>
                            <button className='text-sm text-[#ff4d2d] font-semibold' onClick={() => dispatch(markAllNotificationsRead())}>Mark all read</button>
                        </div>
                        {notifications.length === 0 && <p className='text-sm text-gray-500 py-3 text-center'>No notifications yet.</p>}
                        {notifications.map((notification) => (
                            <div key={notification.id} className={`border rounded-xl p-3 cursor-pointer transition-all ${notification.read ? "bg-white border-gray-200 hover:border-orange-200" : "bg-orange-50 border-orange-200"}`} onClick={() => handleNotificationClick(notification)}>
                                <p className='text-sm font-semibold text-gray-800'>{notification.title}</p>
                                <p className='text-sm text-gray-600 mt-1'>{notification.message}</p>
                                <p className='text-xs text-gray-400 mt-2'>{formatNotificationTime(notification.createdAt)}</p>
                            </div>
                        ))}
                    </div>}

                    <button className='nav-profile-btn w-[40px] h-[40px] rounded-full flex items-center justify-center bg-gradient-to-br from-[#ff4d2d] to-[#ff7b5d] text-white text-[16px] shadow-lg font-semibold cursor-pointer border-2 border-white' onClick={() => { setShowNotifications(false); setShowInfo(prev => !prev) }}>
                        {userData?.fullName.slice(0, 1)}
                    </button>

                    {showInfo && <div className='absolute top-[52px] right-0 w-[220px] max-w-[calc(100vw-20px)] bg-white/95 backdrop-blur-md border border-orange-100 shadow-2xl rounded-2xl p-[16px] flex flex-col gap-[10px] z-[9999]'>
                        <div className='text-[16px] font-semibold text-gray-800 truncate'>{userData.fullName}</div>
                        <button className='text-left text-[#ff4d2d] font-semibold cursor-pointer hover:text-[#e64526]' onClick={() => { setShowInfo(false); navigate("/profile") }}>Profile</button>
                        {userData.role=="user" && <button className='md:hidden text-left text-[#ff4d2d] font-semibold cursor-pointer hover:text-[#e64526]' onClick={handleNavigateToMyOrders}>My Orders</button>}
                        {userData.role=="deliveryBoy" && <button className='md:hidden text-left text-[#ff4d2d] font-semibold cursor-pointer hover:text-[#e64526]' onClick={handleNavigateToMyOrders}>My Orders</button>}
                        {userData.role=="admin" && <button className='text-left text-[#ff4d2d] font-semibold cursor-pointer hover:text-[#e64526]' onClick={handleNavigateToAdmin}>Admin Panel</button>}
                        <button className='text-left text-[#ff4d2d] font-semibold cursor-pointer hover:text-[#e64526]' onClick={handleLogOut}>Log Out</button>
                    </div>}
                </div>
            </div>
        </div>
    )
}


export default Nav
