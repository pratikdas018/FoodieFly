import React, { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { IoIosArrowRoundBack } from "react-icons/io";
import { useLocation, useNavigate } from 'react-router-dom';
import UserOrderCard from '../components/UserOrderCard';
import OwnerOrderCard from '../components/OwnerOrderCard';
import { addMyOrder, updateRealtimeOrderStatus } from '../redux/userSlice';
import DeliveryBoyOrderCard from '../components/DeliveryBoyOrderCard';


function MyOrders() {
  const { userData, myOrders,socket} = useSelector(state => state.user)
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch=useDispatch()
  const getOrderTimestamp = (order) => {
    const createdAtTimestamp = new Date(order?.createdAt || order?.updatedAt || 0).getTime()
    if (Number.isFinite(createdAtTimestamp) && createdAtTimestamp > 0) {
      return createdAtTimestamp
    }
    if (order?._id) {
      const objectIdTimestamp = parseInt(String(order._id).slice(0, 8), 16) * 1000
      if (Number.isFinite(objectIdTimestamp)) return objectIdTimestamp
    }
    return 0
  }
  const sortedOrders = useMemo(() => {
    return [...(myOrders || [])].sort((a, b) => getOrderTimestamp(b) - getOrderTimestamp(a))
  }, [myOrders])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
    const frameId = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" })
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [location.key, location.state?.ts])

  useEffect(() => {
    if (!location.state?.openFromNav) return
    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
  }, [])

  useEffect(()=>{
    if (!socket) return
    const handleNewOrder = (data) => {
      if (data.shopOrders?.owner?._id == userData?._id) {
        dispatch(addMyOrder(data))
      }
    }

    const handleStatusUpdate = ({orderId,shopId,status,userId}) => {
      if(userId == userData?._id){
        dispatch(updateRealtimeOrderStatus({orderId,shopId,status}))
      }
    }

    socket.on('newOrder', handleNewOrder)
    socket.on('update-status', handleStatusUpdate)

    return ()=>{
      socket.off('newOrder', handleNewOrder)
      socket.off('update-status', handleStatusUpdate)
    }
  },[socket, dispatch, userData?._id])



  
  return (
    <div className='w-full min-h-screen bg-[#fff9f6] flex justify-center px-4'>
      <div className='w-full max-w-[800px] p-4'>

        <div className='flex items-center gap-[20px] mb-6 '>
          <div className=' z-[10] ' onClick={() => navigate("/")}>
            <IoIosArrowRoundBack size={35} className='text-[#ff4d2d]' />
          </div>
          <h1 className='text-2xl font-bold  text-start'>My Orders</h1>
        </div>
        <div className='space-y-6'>
          {sortedOrders?.map((order,index)=>(
            userData?.role=="user" ?
            (
              <UserOrderCard data={order} key={`${order._id}_${index}`}/>
            )
            :
            userData?.role=="owner"? (
              <OwnerOrderCard data={order} key={`${order._id}_${index}`}/>
            )
            : userData?.role=="deliveryBoy" ? (
              <DeliveryBoyOrderCard data={order} key={`${order._id}_${index}`}/>
            ) : null
          ))}
          {sortedOrders?.length === 0 && (
            <p className='text-gray-500 text-center'>No orders found.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default MyOrders
